import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemType = "destination" | "restaurant" | "accommodation";

const ITEM_TYPES: ItemType[] = ["destination", "restaurant", "accommodation"];

interface FavoriteRow {
  id: number;
  item_id: string;
  item_type: ItemType;
  created_at: string;
}

interface ItemDetail {
  id: string | number;
  name: string;
  min_price: number;
  image_url?: string;
  images?: string[];
  category?: string;
}

// ─── Helper: ดึงข้อมูล User จาก Supabase ──────────────────────────────────────

const getSessionUser = async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // ห้าม set cookie ใน API Route
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

const TABLE_MAP: Record<ItemType, string> = {
  destination: "destinations",
  restaurant: "restaurants",
  accommodation: "accommodations",
};

const SELECT_MAP: Record<ItemType, string> = {
  destination: "id, name, min_price, image_url, category",
  restaurant: "id, name, min_price, image_url, category",
  accommodation: "id, name, min_price, images, category",
};

// ─── GET /api/favorites — คอลเลคชั่นของ user พร้อมรายละเอียด ───────────────────

export const GET = async () => {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`fav_get_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { data: favorites, error } = await supabaseAdmin
      .from("favorites")
      .select("id, item_id, item_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!favorites || favorites.length === 0) {
      return NextResponse.json({ favorites: [] }, { status: 200 });
    }

    // จัดกลุ่ม item_id ตาม type แล้ว query รายละเอียดแบบขนาน
    const grouped: Record<ItemType, (string | number)[]> = {
      destination: [],
      restaurant: [],
      accommodation: [],
    };

    (favorites as FavoriteRow[]).forEach((fav) => {
      if (grouped[fav.item_type]) grouped[fav.item_type].push(fav.item_id);
    });

    const detailQueries = ITEM_TYPES.filter((type) => grouped[type].length > 0).map(
      async (type) => {
        const uniqueIds = [...new Set(grouped[type])];
        const result = await supabaseAdmin
          .from(TABLE_MAP[type])
          .select(SELECT_MAP[type])
          .in("id", uniqueIds);

        if (result.error) {
          console.error(`🚨 [favorites] ${type}:`, result.error.message);
        }
        return { type, data: result.data ?? [] };
      },
    );

    const detailResults = await Promise.all(detailQueries);

    const detailMap: Record<string, ItemDetail> = {};
    for (const result of detailResults) {
      if (Array.isArray(result.data)) {
        for (const row of result.data) {
          if (row && typeof row === "object" && "id" in row) {
            const rowId = (row as ItemDetail).id;
            detailMap[`${result.type}:${rowId}`] = row as ItemDetail;
          }
        }
      }
    }

    const enriched = (favorites as FavoriteRow[]).map((fav) => ({
      id: fav.id,
      item_id: fav.item_id,
      item_type: fav.item_type,
      created_at: fav.created_at,
      item_detail:
        detailMap[`${fav.item_type}:${fav.item_id}`] ?? {
          id: fav.item_id,
          name: "ไม่พบข้อมูล หรือถูกลบออกจากระบบ",
          min_price: 0,
        },
    }));

    return NextResponse.json({ favorites: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites", details: error.message },
      { status: 500 },
    );
  }
};

// ─── POST /api/favorites — เพิ่มลงคอลเลคชั่น ─────────────────────────────────

export const POST = async (req: Request) => {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`fav_post_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { itemId, itemType } = (body ?? {}) as {
      itemId?: unknown;
      itemType?: unknown;
    };

    const idStr = String(itemId ?? "").trim();
    if (!idStr) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    if (!ITEM_TYPES.includes(itemType as ItemType)) {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("favorites").insert({
      user_id: user.id,
      item_id: idStr,
      item_type: itemType,
    });

    // 23505 = unique_violation → มีอยู่แล้ว ถือว่าสำเร็จ
    if (error && error.code !== "23505") throw error;

    return NextResponse.json({ favorited: true }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
};

// ─── DELETE /api/favorites?itemId=&itemType= — เอาออกจากคอลเลคชั่น ────────────

export const DELETE = async (req: Request) => {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await generalApiRateLimit.limit(`fav_del_${user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const idStr = String(searchParams.get("itemId") ?? "").trim();
    const itemType = searchParams.get("itemType") ?? "";

    if (!idStr) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    if (!ITEM_TYPES.includes(itemType as ItemType)) {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", idStr)
      .eq("item_type", itemType);

    if (error) throw error;

    return NextResponse.json({ favorited: false }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/favorites error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
};
