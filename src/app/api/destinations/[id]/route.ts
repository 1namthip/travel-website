import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── Helper: ดึงข้อมูล User จาก Supabase ──────────────────────────────────────

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // ห้าม set cookie ใน API Route
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

// ─── GET /api/destinations/[id] (Public) ─────────────────────────────────────

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;
    const destinationId = Number(id);

    if (isNaN(destinationId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // ใช้ Public Client สำหรับการอ่านข้อมูลทั่วไป
    const { data, error } = await supabaseAdmin
      .from("destinations")
      .select("*")
      .eq("id", destinationId)
      .single();

    if (error) {
      console.error(`❌ GET destination ${id} error:`, error.message);
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("❌ GET Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ─── PUT /api/destinations/[id] (Admin Only) ─────────────────────────────────

export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ป้องกันการยิง API รัวๆ เพื่อโจมตีระบบอัปเดต
    const { success } = await generalApiRateLimit.limit(`put_destination_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles") // ⚠️ เช็คให้ดีว่าในฐานข้อมูลชื่อ "profile" หรือ "profiles" (เติม s ไหม)
      .select("role")
      .eq("id", user.id) // สมมติว่าคอลัมน์เชื่อมโยงในตาราง profile ของคุณชื่อ "id" หรือ "user_id"
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile fetch error:", profileError?.message);
      return NextResponse.json(
        { error: "Forbidden: Profile not found" },
        { status: 403 }
      );
    }

    // ตรวจสอบว่าสิทธิ์ในตาราง profile เป็น admin หรือไม่
    const isAdmin = profile.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const destinationId = Number(id);

    if (isNaN(destinationId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // ป้องกัน JSON Parse Error
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { name, description, category, image_url, min_price, max_price, opening_hours, open_days } = body as Record<string, any>;

    const updatePayload: Record<string, any> = {
      name,
      description,
      category,
      image_url: image_url || null,
      min_price: Number(min_price) || 0,
      max_price: Number(max_price) || 0,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (opening_hours !== undefined) updatePayload.opening_hours = opening_hours;
    if (open_days !== undefined) updatePayload.open_days = open_days;

    // ใช้ Admin Client สำหรับการแก้ไขข้อมูลโดย Admin
    let { data, error } = await supabaseAdmin
      .from("destinations")
      .update(updatePayload)
      .eq("id", destinationId)
      .select()
      .single();

    // Fallback: หากยังไม่มีคอลัมน์ opening_hours/open_days ในตาราง
    if (error && (error.message?.includes("opening_hours") || error.message?.includes("open_days") || error.code === "42703")) {
      console.warn("⚠️ Column opening_hours/open_days not found. Falling back to basic update.");
      delete updatePayload.opening_hours;
      delete updatePayload.open_days;
      const retry = await supabaseAdmin
        .from("destinations")
        .update(updatePayload)
        .eq("id", destinationId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`❌ PUT destination ${id} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("❌ PUT Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// ─── DELETE /api/destinations/[id] (Admin Only) ──────────────────────────────

export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ป้องกันการสแปมยิง API ลบข้อมูล
    const { success } = await generalApiRateLimit.limit(`delete_destination_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 🔥 ตรวจสอบสิทธิ์ Admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles") // ⚠️ เช็คให้ดีว่าในฐานข้อมูลชื่อ "profile" หรือ "profiles" (เติม s ไหม)
      .select("role")
      .eq("id", user.id) // สมมติว่าคอลัมน์เชื่อมโยงในตาราง profile ของคุณชื่อ "id" หรือ "user_id"
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile fetch error:", profileError?.message);
      return NextResponse.json(
        { error: "Forbidden: Profile not found" },
        { status: 403 }
      );
    }

    // ตรวจสอบว่าสิทธิ์ในตาราง profile เป็น admin หรือไม่
    const isAdmin = profile.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const destinationId = Number(id);

    if (isNaN(destinationId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("destinations")
      .delete()
      .eq("id", destinationId);

    if (error) {
      console.error(`❌ DELETE destination ${id} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Deleted successfully", id: destinationId }, { status: 200 });
  } catch (error) {
    console.error("❌ DELETE Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};