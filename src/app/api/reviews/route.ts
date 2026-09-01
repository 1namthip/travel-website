import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Helper: ดึงข้อมูล User และ Role จาก Supabase ────────────────────────────

export const getSessionUserWithRole = async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // ไม่เซ็ต Cookie ใหม่ใน API Route
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null };

  // ดึง Role จากตาราง public.profiles (วิธีที่เราเลือกใช้)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? "user" };
};

// ─── Helper: ประกอบชื่อที่จะแสดงจากข้อมูล auth user ─────────────────────────

const displayNameFromUser = (user: any): string => {
  const meta = user?.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    meta.user_name ||
    meta.preferred_username ||
    (user?.email ? String(user.email).split("@")[0] : "ผู้ใช้งาน")
  );
};

// ─── GET /api/reviews (Public) ───────────────────────────────────────────────

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const accommodation_id = searchParams.get("accommodation_id");
    const restaurant_id = searchParams.get("restaurant_id");
    const destination_id = searchParams.get("destination_id");

    let query = supabaseAdmin
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (accommodation_id) {
      query = query.eq("accommodation_id", accommodation_id);
    }
    if (restaurant_id) {
      query = query.eq("restaurant_id", Number(restaurant_id));
    }
    if (destination_id) {
      query = query.eq("destination_id", Number(destination_id));
    }

    const { data, error } = await query;

    if (error) throw error;

    const reviews = data ?? [];

    // ─── แนบชื่อ/รูปโปรไฟล์ของผู้รีวิว (ดึงจาก auth.users ด้วย service role) ───
    const userIds = [
      ...new Set(
        reviews
          .map((r) => r.created_by)
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    ];

    const identityMap = new Map<string, { name: string; avatar: string | null }>();
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const { data: found } = await supabaseAdmin.auth.admin.getUserById(id);
          const u = found?.user ?? null;
          if (!u) return;
          identityMap.set(id, {
            name: displayNameFromUser(u),
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
          });
        } catch {
          /* ผู้ใช้ถูกลบไปแล้ว หรือดึงข้อมูลไม่ได้ — ใช้ค่า fallback ที่ฝั่งหน้าเว็บ */
        }
      }),
    );

    const enriched = reviews.map((r) => ({
      ...r,
      user_name: identityMap.get(r.created_by)?.name ?? null,
      user_avatar: identityMap.get(r.created_by)?.avatar ?? null,
    }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch reviews" }, { status: 400 });
  }
};

// ─── POST /api/reviews ───────────────────────────────────────────────────────

export const POST = async (req: Request) => {
  try {
    const { user } = await getSessionUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limit ป้องกันการสแปมรีวิว
    const { success } = await generalApiRateLimit.limit(`post_review_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const { accommodation_id, restaurant_id, destination_id, rating, comment } = body as Record<string, any>;

    const providedIds = [accommodation_id, restaurant_id, destination_id].filter(Boolean);

    if (providedIds.length !== 1) {
      return NextResponse.json(
        { error: "Please provide exactly one target ID." },
        { status: 400 }
      );
    }

    if (!rating || typeof rating !== "number") {
      return NextResponse.json({ error: "Valid rating is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert([
        {
          accommodation_id: accommodation_id || null,
          restaurant_id: restaurant_id ? Number(restaurant_id) : null,
          destination_id: destination_id ? Number(destination_id) : null,
          rating: Number(rating),
          comment,
          created_by: user.id,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
};

// ─── PUT /api/reviews ────────────────────────────────────────────────────────

export const PUT = async (req: Request) => {
  try {
    const { user, role } = await getSessionUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`put_review_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const { id, rating, comment } = body as { id?: string; rating?: number; comment?: string };

    if (!id) {
      return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ Admin จากตัวแปร role
    const isAdmin = role === "admin";

    const updatePayload: { rating?: number; comment?: string } = {};

    if (rating !== undefined && rating !== null) {
      updatePayload.rating = Number(rating);
    }
    if (comment !== undefined) {
      updatePayload.comment = comment;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No data provided to update." }, { status: 400 });
    }

    let query = supabaseAdmin.from("reviews").update(updatePayload);

    // กำหนดเงื่อนไขการอัปเดตตาม Role
    if (isAdmin) {
      query = query.eq("id", id);
    } else {
      query = query.eq("id", id).eq("created_by", user.id);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Review not found or permission denied." },
        { status: 403 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/reviews error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
};

// ─── DELETE /api/reviews ─────────────────────────────────────────────────────

export const DELETE = async (req: Request) => {
  try {
    const { user, role } = await getSessionUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`delete_review_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ Admin
    const isAdmin = role === "admin";

    let query = supabaseAdmin.from("reviews").delete();

    if (isAdmin) {
      query = query.eq("id", id);
    } else {
      query = query.eq("id", id).eq("created_by", user.id);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Review not found or permission denied." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      message: "Review deleted successfully",
      deleted_id: id,
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("DELETE /api/reviews error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
};