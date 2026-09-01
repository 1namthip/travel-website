import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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
        setAll: () => {}, // ห้าม set cookie ใน API Route
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

// ─── GET /api/restaurants (Public) ───────────────────────────────────────────

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q");
    const category = searchParams.get("category");

    // ใช้ Public Client สำหรับดึงข้อมูลสาธารณะ
    let query = supabaseAdmin.from("restaurants").select("*").order("id", { ascending: true });

    // 🔍 ถ้ามีค้นหา (q)
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`
      );
    }

    // 🍱 ถ้ามีกรองหมวดหมู่
    if (category && category !== "") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ GET Restaurants Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("❌ GET Restaurants Exception:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// ─── POST /api/restaurants (Authenticated Users) ─────────────────────────────

export const POST = async (req: NextRequest) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ป้องกันการสแปมสร้างข้อมูล
    const { success } = await generalApiRateLimit.limit(`post_restaurant_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ป้องกัน JSON Parse Error แบบ Safe-catch
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { name, description, image_url, location, category, phone } = body as Record<string, any>;

    // Validate ข้อมูลเบื้องต้น
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // ใช้ Admin Client เพื่อทำการ Insert ข้อมูล และผูก created_by กับ ID คนสร้าง
    // ใช้ .single() เพื่อให้คืนค่ามาเป็น Object เดี่ยวๆ
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .insert([
        {
          name,
          description,
          image_url: image_url || null,
          location,
          category,
          phone: phone || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ POST Restaurants Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("❌ POST Restaurants Exception:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};