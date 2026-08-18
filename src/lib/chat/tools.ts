// src/lib/chat/tools.ts
//
// เครื่องมือ (tools) ที่แชทบอทเรียกใช้เพื่อดึง "ข้อมูลจริง" แทนการเดา
//
// หลักการ: อะไรที่เป็นข้อเท็จจริง (รายชื่อสถานที่ ราคา วันที่เทศกาล) ต้องมาจาก tool
// ส่วนโมเดลมีหน้าที่เลือก เรียบเรียง และจัดทริปจากผลลัพธ์ที่ได้

import { Type, type FunctionDeclaration } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getFestivalsByMonth, getFestivalsNear } from "./festivals";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlaceKind = "destination" | "restaurant" | "accommodation";

/** ข้อมูลสถานที่แบบย่อ ใช้ทั้งส่งให้โมเดลอ่าน และส่งให้ UI วาดเป็นการ์ด */
export interface PlaceCard {
  id: string | number;
  kind: PlaceKind;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  url: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * รูปในฐานข้อมูลถูกเก็บเป็นสตริง JSON เช่น '["https://...jpg"]'
 * บางแถวก็เก็บเป็น URL เดี่ยว ๆ จึงต้องเผื่อทั้งสองแบบ
 */
function firstImage(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : null;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : null;
    } catch {
      return null;
    }
  }
  return trimmed.startsWith("http") ? trimmed : null;
}

/**
 * ตัดอักขระที่ทำให้ไวยากรณ์ filter ของ PostgREST พัง
 * (เครื่องหมาย , ( ) . ถูกใช้เป็นตัวคั่นใน .or() ส่วน % และ _ เป็น wildcard ของ ilike)
 */
function sanitizeKeyword(input: string): string {
  return input.replace(/[,()%_*\\"']/g, " ").trim().slice(0, 60);
}

/** ย่อคำอธิบายให้สั้นลง เพื่อไม่ให้ผลลัพธ์ tool กิน context เกินจำเป็น */
function shorten(text: string | null, max = 220): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

const TABLE_BY_KIND: Record<PlaceKind, string> = {
  destination: "destinations",
  restaurant: "restaurants",
  accommodation: "accommodations",
};

const PATH_BY_KIND: Record<PlaceKind, string> = {
  destination: "/destinations",
  restaurant: "/restaurant",
  accommodation: "/accommodations",
};

// ─── Tool definitions ────────────────────────────────────────────────────────

export const CHAT_TOOLS: FunctionDeclaration[] = [
  {
    name: "search_places",
    description:
      "ค้นหาสถานที่ท่องเที่ยว ร้านอาหาร หรือที่พักในจังหวัดนครราชสีมา จากฐานข้อมูลจริงของเว็บไซต์ " +
      "ใช้เครื่องมือนี้ทุกครั้งที่ต้องเอ่ยชื่อสถานที่ ห้ามแต่งชื่อสถานที่ขึ้นเอง " +
      "ค้นหลายรอบพร้อมกันได้ถ้าคำถามครอบคลุมหลายหมวด เช่น จัดทริปที่ต้องใช้ทั้งที่เที่ยว ร้านอาหาร และที่พัก " +
      "เคล็ดลับ: keyword จะถูกค้นในชื่อ คำอธิบาย และที่อยู่ จึงใช้ค้นอำเภอได้ เช่น พิมาย ปากช่อง วังน้ำเขียว " +
      "หรือค้นลักษณะที่ไม่มีในหมวดหมู่ได้ เช่น น้ำตก พิพิธภัณฑ์ ปราสาท ตลาด วิว",
    parameters: {
      type: Type.OBJECT,
      properties: {
        kind: {
          type: Type.STRING,
          enum: ["destination", "restaurant", "accommodation"],
          description:
            "ประเภทข้อมูลที่ต้องการ destination คือสถานที่ท่องเที่ยว restaurant คือร้านอาหารและคาเฟ่ accommodation คือที่พัก",
        },
        keyword: {
          type: Type.STRING,
          description:
            "คำค้นภาษาไทย ค้นในชื่อ คำอธิบาย และที่อยู่ เช่น น้ำตก, วัด, พิมาย, เขาใหญ่, คาเฟ่, ปราสาท ถ้าไม่ระบุจะได้รายการทั่วไป",
        },
        category: {
          type: Type.STRING,
          description:
            "กรองตามหมวดหมู่แบบตรงตัว ใช้ค่าที่ได้จาก list_available_categories เท่านั้น ถ้าไม่แน่ใจให้ใช้ keyword แทน",
        },
        max_price: {
          type: Type.NUMBER,
          description:
            "งบสูงสุดต่อคนเป็นบาท จะกรองเฉพาะที่ราคาเริ่มต้นไม่เกินงบนี้ ใส่ 0 เพื่อหาที่เที่ยวฟรี",
        },
        min_price: {
          type: Type.NUMBER,
          description: "ราคาเริ่มต้นขั้นต่ำเป็นบาท ปกติไม่ต้องระบุ",
        },
        limit: {
          type: Type.NUMBER,
          description: "จำนวนผลลัพธ์สูงสุด ค่าเริ่มต้น 6 มากสุด 12",
        },
      },
      required: ["kind"],
    },
  },
  {
    name: "list_available_categories",
    description:
      "ดูรายการหมวดหมู่ทั้งหมดที่มีจริงในฐานข้อมูล พร้อมจำนวนรายการและช่วงราคา " +
      "เรียกใช้เมื่อผู้ใช้ถามภาพรวมว่ามีอะไรบ้าง หรือเมื่อต้องการรู้ว่าควรกรองด้วยหมวดหมู่ไหน",
    // ไม่ต้องใส่ parameters เพราะ tool นี้ไม่รับอาร์กิวเมนต์
    // Gemini อาจปฏิเสธ schema แบบ OBJECT ที่ properties ว่างเปล่า
  },
  {
    name: "get_festival_calendar",
    description:
      "ดูปฏิทินเทศกาลไทยและงานประเพณีของจังหวัดนครราชสีมา อ้างอิงวันที่จริงของระบบ " +
      "ต้องเรียกใช้ทุกครั้งที่ผู้ใช้ถามถึงเทศกาล ช่วงเวลาน่าเที่ยว หรือถามว่าช่วงนี้มีงานอะไร " +
      "ห้ามตอบวันที่เทศกาลจากความจำของตัวเอง เพราะเทศกาลจันทรคติเปลี่ยนวันทุกปี",
    parameters: {
      type: Type.OBJECT,
      properties: {
        month: {
          type: Type.NUMBER,
          description:
            "เลขเดือน 1 ถึง 12 ที่ต้องการดู ถ้าไม่ระบุจะได้เทศกาลที่กำลังจัดอยู่และที่กำลังจะถึงจากวันนี้",
        },
      },
    },
  },
];

// ─── Tool executors ──────────────────────────────────────────────────────────

interface SearchPlacesInput {
  kind?: unknown;
  keyword?: unknown;
  category?: unknown;
  max_price?: unknown;
  min_price?: unknown;
  limit?: unknown;
}

async function searchPlaces(
  input: SearchPlacesInput,
): Promise<{ result: unknown; places: PlaceCard[] }> {
  const kind = input.kind as PlaceKind;
  if (!kind || !(kind in TABLE_BY_KIND)) {
    return { result: { error: "kind ต้องเป็น destination, restaurant หรือ accommodation" }, places: [] };
  }

  const table = TABLE_BY_KIND[kind];
  const limit = Math.min(Math.max(Number(input.limit) || 6, 1), 12);

  // แต่ละตารางมีคอลัมน์ไม่เหมือนกัน ที่พักใช้ address และ images ส่วนร้านอาหารใช้ location
  const columns =
    kind === "accommodation"
      ? "id, name, category, description, address, images, min_price, max_price"
      : kind === "restaurant"
        ? "id, name, category, description, location, image_url, min_price, max_price"
        : "id, name, category, description, image_url, min_price, max_price";

  let query = supabaseAdmin.from(table).select(columns).limit(limit);

  const keyword = typeof input.keyword === "string" ? sanitizeKeyword(input.keyword) : "";
  if (keyword) {
    // destinations ไม่มีคอลัมน์ที่อยู่ จึงค้นได้แค่ชื่อกับคำอธิบาย
    const fields =
      kind === "accommodation"
        ? ["name", "description", "address"]
        : kind === "restaurant"
          ? ["name", "description", "location"]
          : ["name", "description"];
    query = query.or(fields.map((f) => `${f}.ilike.%${keyword}%`).join(","));
  }

  if (typeof input.category === "string" && input.category.trim()) {
    query = query.eq("category", input.category.trim());
  }

  // กรองด้วย min_price เพราะเป็น "ราคาเริ่มต้น" ซึ่งตรงกับความหมายของงบที่ผู้ใช้ตั้ง
  if (input.max_price !== undefined && input.max_price !== null) {
    const max = Number(input.max_price);
    if (!Number.isNaN(max)) query = query.lte("min_price", max);
  }
  if (input.min_price !== undefined && input.min_price !== null) {
    const min = Number(input.min_price);
    if (!Number.isNaN(min)) query = query.gte("min_price", min);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[chat] search_places (${table}) error:`, error.message);
    return { result: { error: "ค้นข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" }, places: [] };
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const places: PlaceCard[] = rows.map((row) => ({
    id: row.id as string | number,
    kind,
    name: String(row.name ?? "").trim(),
    category: (row.category as string | null) ?? null,
    description: shorten((row.description as string | null) ?? null),
    location: ((row.location ?? row.address) as string | null) ?? null,
    minPrice: (row.min_price as number | null) ?? null,
    maxPrice: (row.max_price as number | null) ?? null,
    imageUrl: firstImage(row.images ?? row.image_url),
    url: `${PATH_BY_KIND[kind]}/${row.id}`,
  }));

  return {
    // ส่งให้โมเดลอ่านโดยตัด imageUrl ออก เพราะโมเดลไม่ต้องใช้และกิน token เปล่า
    result: {
      found: places.length,
      places: places.map((place) => ({
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        location: place.location,
        minPrice: place.minPrice,
        maxPrice: place.maxPrice,
      })),
      hint:
        places.length === 0
          ? "ไม่พบข้อมูลตามเงื่อนไขนี้ ลองผ่อนเงื่อนไข เช่น ตัด category ออก เพิ่มงบ หรือเปลี่ยนคำค้น และถ้ายังไม่พบให้บอกผู้ใช้ตามตรงว่าในระบบยังไม่มีข้อมูลส่วนนี้"
          : "อ้างอิงเฉพาะสถานที่ในรายการนี้เท่านั้น ห้ามเพิ่มชื่อสถานที่อื่นที่ไม่ได้อยู่ในผลลัพธ์",
    },
    places,
  };
}

async function listAvailableCategories(): Promise<{ result: unknown; places: PlaceCard[] }> {
  const kinds: PlaceKind[] = ["destination", "restaurant", "accommodation"];

  const summaries = await Promise.all(
    kinds.map(async (kind) => {
      const { data, error } = await supabaseAdmin
        .from(TABLE_BY_KIND[kind])
        .select("category, min_price, max_price");

      if (error || !data) return { kind, total: 0, categories: [], priceRange: null };

      const counts: Record<string, number> = {};
      let lowest = Number.POSITIVE_INFINITY;
      let highest = 0;

      for (const row of data as { category: string | null; min_price: number | null; max_price: number | null }[]) {
        const key = (row.category ?? "ไม่ระบุ").trim();
        counts[key] = (counts[key] ?? 0) + 1;
        if (typeof row.min_price === "number") lowest = Math.min(lowest, row.min_price);
        if (typeof row.max_price === "number") highest = Math.max(highest, row.max_price);
      }

      return {
        kind,
        total: data.length,
        categories: Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
        priceRange:
          lowest === Number.POSITIVE_INFINITY
            ? null
            : { lowest, highest, unit: "บาท" },
      };
    }),
  );

  return { result: { summaries }, places: [] };
}

function getFestivalCalendar(input: { month?: unknown }): { result: unknown; places: PlaceCard[] } {
  const month = Number(input.month);

  if (!Number.isNaN(month) && month >= 1 && month <= 12) {
    return {
      result: {
        month,
        festivals: getFestivalsByMonth(month),
        note:
          "เทศกาลที่ certainty เป็น approx อิงปฏิทินจันทรคติ วันที่เปลี่ยนทุกปี " +
          "ให้บอกผู้ใช้ว่าเป็นช่วงโดยประมาณ",
      },
      places: [],
    };
  }

  return { result: getFestivalsNear(new Date()), places: [] };
}

/**
 * เรียกใช้ tool ตามชื่อ และคืนทั้งผลลัพธ์สำหรับโมเดล
 * กับรายการสถานที่สำหรับให้ UI เอาไปวาดเป็นการ์ด
 */
export async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: unknown; places: PlaceCard[] }> {
  switch (name) {
    case "search_places":
      return searchPlaces(input);
    case "list_available_categories":
      return listAvailableCategories();
    case "get_festival_calendar":
      return getFestivalCalendar(input);
    default:
      return { result: { error: `ไม่รู้จักเครื่องมือชื่อ ${name}` }, places: [] };
  }
}
