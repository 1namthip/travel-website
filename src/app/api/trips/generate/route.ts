import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// Helper สำหรับสลับตำแหน่ง Array (Shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ดึงทุกรายการที่เข้าเงื่อนไข โดยแบ่งหน้าเพื่อไม่ติดเพดานจำนวนแถวของ Supabase
async function getItemsWithFallback(tableName: string, maxBudget: number, limitCount: number = 5) {
  const pageSize = 500;
  let results: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .lte("min_price", maxBudget)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`${tableName} error: ${error.message}`);
    results = results.concat(data || []);
    if (!data || data.length < pageSize) break;
  }

  // คงรายการราคาถูกไว้เป็นตัวเลือกเมื่อไม่มีรายการในงบเพียงพอ
  if (results.length < limitCount) {
    const { data: fallbackData } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .order("min_price", { ascending: true }) // เรียงจากถูกไปแพง
      .limit(limitCount);

    if (fallbackData) {
      // รวมข้อมูลโดยไม่ให้ซ้ำกัน (ป้องกันการโชว์การ์ดเบิ้ล)
      const existingIds = new Set(results.map((item) => item.id));
      const newItems = fallbackData.filter((item) => !existingIds.has(item.id));
      results = [...results, ...newItems];
    }
  }

  return results;
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, totalBudget, customBudgets, days } = body;

  if (!mode || (mode !== "total" && mode !== "custom")) {
    return NextResponse.json({ error: "Invalid mode. Use 'total' or 'custom'." }, { status: 400 });
  }

  // จำนวนคืนที่ต้องจ่ายค่าที่พัก (ขั้นต่ำ 1 คืน)
  const nights = Math.max((Number(days) || 1) - 1, 1);

  let accBudget = 0, foodBudget = 0, destBudget = 0;

  if (mode === "total") {
    if (!totalBudget || typeof totalBudget !== "number") {
      return NextResponse.json({ error: "totalBudget must be a number." }, { status: 400 });
    }
    // สัดส่วน: ที่พัก 40%, อาหาร 30%, เที่ยว 30%
    accBudget = totalBudget * 0.40;
    foodBudget = totalBudget * 0.30;
    destBudget = totalBudget * 0.30;
  } else if (mode === "custom") {
    if (!customBudgets || typeof customBudgets !== "object") {
      return NextResponse.json({ error: "customBudgets object is required." }, { status: 400 });
    }
    accBudget = customBudgets.accommodation || 0;
    foodBudget = customBudgets.food || 0;
    destBudget = customBudgets.destination || 0;
  }

  try {
    // ค่าที่พักคิดราคาต่อคืน จึงต้องหารด้วยจำนวนคืนก่อนกรองรายการที่พัก
    const accBudgetPerNight = accBudget / nights;

    // ยิง Query ดึงข้อมูลทั้ง 3 หมวดพร้อมกัน (พร้อมระบบ Fallback ในตัว)
    const [accommodations, restaurants, destinations] = await Promise.all([
      getItemsWithFallback("accommodations", accBudgetPerNight),
      getItemsWithFallback("restaurants", foodBudget),
      getItemsWithFallback("destinations", destBudget),
    ]);

    // ส่งทุกรายการให้ผู้ใช้ค้นหาและกรองต่อในแต่ละหมวด
    return NextResponse.json({
      summary: {
        mode,
        nights,
        allocatedBudgets: {
          accommodation: accBudget,
          accommodationPerNight: accBudgetPerNight,
          food: foodBudget,
          destination: destBudget,
        },
      },
      trip: {
        accommodations: shuffleArray(accommodations),
        restaurants: shuffleArray(restaurants),
        destinations: shuffleArray(destinations),
      },
    });

  } catch (error: unknown) {
    console.error("Generate Trip Error:", error);
    return NextResponse.json(
      { error: "Failed to generate trip.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
