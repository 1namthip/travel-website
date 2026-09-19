import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Helper: ดึงข้อมูล User จาก Supabase ──────────────────────────────────────

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // ไม่เซ็ต Cookie ใน API Route เพื่อป้องกัน Error ฝั่ง Server
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

// ─── GET /api/destinations (Public) ──────────────────────────────────────────

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const minBudget = searchParams.get("minBudget");
    const maxBudget = searchParams.get("maxBudget");

    // 🔥 ควบรวมการ Query แบบ Join Table เพื่อแก้ปัญหา N+1 Query ที่หน้าบ้าน
    let query = supabaseAdmin
      .from("destinations")
      .select(`
        *,
        reviews ( rating )
      `)
      .order("created_at", { ascending: false });

    // ปรับลอจิกการกรองราคาให้เช็คจาก min_price เป็นหลักเพื่อให้ตรงกับ UX การกรองงบ
    if (minBudget) {
      const minVal = parseFloat(minBudget);
      if (!isNaN(minVal)) query = query.gte("min_price", minVal);
    }
    if (maxBudget) {
      const maxVal = parseFloat(maxBudget);
      if (!isNaN(maxVal)) query = query.lte("min_price", maxVal);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🔥 คำนวณ Rating ให้เสร็จสรรพจากหลังบ้าน ลดภาระฝั่ง Client
    const formattedData = (data || []).map((dest) => {
      const reviews = dest.reviews || [];
      const count = reviews.length;
      const avg = count > 0 
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count 
        : 0;

      // นำ reviews array ออกจาก Response เพื่อลดขนาด Payload
      const { reviews: _, ...restDest } = dest; 

      return {
        ...restDest,
        rating: {
          avg: Math.round(avg * 10) / 10,
          count,
        },
      };
    });
    
    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("❌ GET Internal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

// ─── POST /api/destinations (Admin Only) ─────────────────────────────────────

export const POST = async (req: Request) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`post_destination_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile fetch error:", profileError?.message);
      return NextResponse.json(
        { error: "Forbidden: Profile not found" },
        { status: 403 }
      );
    }

    const isAdmin = profile.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { name, description, category, image_url, min_price, max_price, opening_hours, open_days } = body as Record<string, any>;

    if (!name || !description || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const minPriceNum = Number(min_price) || 0;
    const maxPriceNum = Number(max_price) || 0;

    if (minPriceNum > maxPriceNum) {
      return NextResponse.json({ error: "Invalid price range" }, { status: 400 });
    }

    const insertPayload: Record<string, any> = {
      name,
      description,
      category,
      image_url: image_url || null,
      min_price: minPriceNum,
      max_price: maxPriceNum,
    };

    if (opening_hours !== undefined) insertPayload.opening_hours = opening_hours;
    if (open_days !== undefined) insertPayload.open_days = open_days;

    // Insert ข้อมูลด้วย Admin Client
    let { data, error } = await supabaseAdmin
      .from("destinations")
      .insert([insertPayload])
      .select()
      .single();

    // Fallback: หากยังไม่ได้รัน SQL Migration ใน Supabase (คอลัมน์ opening_hours / open_days ยังไม่มี)
    if (error && (error.message?.includes("opening_hours") || error.message?.includes("open_days") || error.code === "42703")) {
      console.warn("⚠️ Column opening_hours/open_days not found in destinations table. Falling back to basic insert.");
      delete insertPayload.opening_hours;
      delete insertPayload.open_days;
      const retry = await supabaseAdmin
        .from("destinations")
        .insert([insertPayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("❌ Supabase POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("❌ POST Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};