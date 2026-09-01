import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Types & Helpers ─────────────────────────────────────────────────────────

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface UpdateRestaurantBody {
  name?: string;
  description?: string;
  image_url?: string;
  location?: string;
  category?: string;
  phone?: string;
}

const isNumeric = (val: string) => /^\d+$/.test(val);

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, 
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

// ─── GET /api/restaurants/[id] (Public) ──────────────────────────────────────

export const GET = async (_req: NextRequest, { params }: RouteContext) => {
  try {
    const { id } = await params;

    if (!isNumeric(id)) {
      return NextResponse.json({ error: "ID ต้องเป็นตัวเลข" }, { status: 400 });
    }

    const numericId = Number(id);

    // ใช้ Public Client สำหรับดึงข้อมูลสาธารณะ
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", numericId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "ไม่พบร้านอาหารที่ระบุ" }, { status: 404 });
      }
      throw error;
    }

    const formattedData = {
      ...data,
      images: data.image_url ? [data.image_url] : [],
      reviews: [], 
    };

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error: any) {
    console.error("❌ GET Restaurant Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล" }, 
      { status: 500 }
    );
  }
};

// ─── PUT /api/restaurants/[id] (Owner or Admin) ──────────────────────────────

export const PUT = async (req: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`put_restaurant_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    if (!isNumeric(id)) {
      return NextResponse.json({ error: "ID ต้องเป็นตัวเลข" }, { status: 400 });
    }

    const numericId = Number(id);

    let body: UpdateRestaurantBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updateData = {
      name: body.name,
      description: body.description,
      image_url: body.image_url,
      location: body.location,
      category: body.category,
      phone: body.phone,
    };

    // 🔥 ลบ key ที่เป็น undefined ออก เพื่อไม่ให้ไปเขียนทับค่าเดิมใน DB เป็น null โดยไม่ได้ตั้งใจ
    Object.keys(updateData).forEach(
      (key) => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]
    );

    // 👉 1. Initialize your DB client if needed (e.g., Supabase)
    // const supabase = await createClient();

    const { data, error } = await supabaseAdmin
      .from("restaurants") 
      .update(updateData)
      .eq("id", numericId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "ไม่พบร้านอาหาร หรือคุณไม่มีสิทธิ์แก้ไข" }, { status: 403 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("❌ PUT Restaurant Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" }, 
      { status: 500 }
    );
  }
};

// ─── DELETE /api/restaurants/[id] (Owner or Admin) ───────────────────────────

export const DELETE = async (_req: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`delete_restaurant_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    if (!isNumeric(id)) {
      return NextResponse.json({ error: "ID ต้องเป็นตัวเลข" }, { status: 400 });
    }

    const numericId = Number(id);
    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from("restaurants")
      .select("id, image_url") // ดึง image_url มาเผื่อต้องการลบไฟล์รูป
      .eq("id", numericId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!restaurant) {
      return NextResponse.json({ error: "ไม่พบข้อมูลร้านอาหารในระบบ" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", numericId);

    if (deleteError) {
      // ดักจับกรณีข้อมูลผูกกัน (Foreign Key Violation)
      if (deleteError.code === "23503") {
        return NextResponse.json(
          { error: "ไม่สามารถลบได้เนื่องจากมีข้อมูลอื่นผูกอยู่ (เช่น รีวิว) กรุณาลบข้อมูลเหล่านั้นก่อน" }, 
          { status: 400 }
        );
      }
      throw deleteError;
    }

    if (restaurant.image_url) {
      const fileName = restaurant.image_url.split('/').pop();
      if (fileName) {
        await supabaseAdmin.storage.from('Images').remove([fileName]);
      }
    }

    return NextResponse.json({ success: true, message: "ลบข้อมูลสำเร็จ" }, { status: 200 });
  } catch (error: any) {
    console.error("❌ DELETE Restaurant Error:", error);
    
    // 💡 ส่ง Error ออกไปให้เห็นเฉพาะตอนรันในเครื่อง (Development) เพื่อให้หาบั๊กง่ายขึ้น
    const isDev = process.env.NODE_ENV === "development";
    
    return NextResponse.json(
      { 
        error: isDev ? `Server Error: ${error.message}` : "เกิดข้อผิดพลาดระดับเซิร์ฟเวอร์ในการลบข้อมูล",
        debug: isDev ? error : undefined // ซ่อน debug ใน production
      }, 
      { status: 500 }
    );
  }
};