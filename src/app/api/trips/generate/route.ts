import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import {
  detectDistrict,
  sortByProximity,
  buildDailyRoute,
  generateMultiTripPlans,
  isPlaceOpenOnDay,
  type DailyRoute,
  type TripPlan,
} from "@/lib/geo";

export const dynamic = "force-dynamic";

// รหัสวันเดินทางที่ถูกต้อง (7 วัน)
const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayCode = (typeof VALID_DAYS)[number];

// ชื่อวันภาษาไทย สำหรับแสดงผลใน UI และ perDay response
const DAY_LABELS: Record<DayCode, string> = {
  mon: "จันทร์",
  tue: "อังคาร",
  wed: "พุธ",
  thu: "พฤหัสบดี",
  fri: "ศุกร์",
  sat: "เสาร์",
  sun: "อาทิตย์",
};

// Helper: สลับตำแหน่ง Array แบบสุ่ม (Fisher-Yates Shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Helper: สร้างวันเดินทางเริ่มต้นตามจำนวนวัน (กรณีผู้ใช้หรือหน้าเก่าไม่ได้ระบุ travelDays มา)
 * โดยเริ่มจากวันปัจจุบันตามปฏิทินจริงเรียงต่อไปตามจำนวนวัน
 */
function getDefaultTravelDays(count: number): DayCode[] {
  const jsDay = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayCodeIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 = mon ... 6 = sun
  const result: DayCode[] = [];
  const safeCount = Math.max(1, Math.min(count, 14));
  for (let i = 0; i < safeCount; i++) {
    result.push(VALID_DAYS[(dayCodeIndex + i) % 7]);
  }
  return result;
}

/**
 * Helper: กรองรายการที่เปิดในวันที่ระบุ
 * ตรวจสอบทั้ง opening_hours (JSON) และ open_days (text[])
 */
function filterByDay<T extends { opening_hours?: unknown; open_days?: unknown }>(
  items: T[],
  day: DayCode
): T[] {
  return items.filter((item) => isPlaceOpenOnDay(item, day));
}

/**
 * Helper: ตรวจสอบว่าสถานที่เปิดอย่างน้อย 1 วันที่ผู้ใช้เลือกเดินทางหรือไม่
 * หากไม่มีการระบุวันเดินทางมา ให้ถือว่าเปิดทุกวัน (เปิดกว้างสำหรับไฟล์/caller เก่า)
 */
function isOpenOnAnySelectedDay<T extends { opening_hours?: unknown; open_days?: unknown }>(
  item: T,
  travelDays?: DayCode[]
): boolean {
  if (!travelDays || travelDays.length === 0) return true;
  return travelDays.some((d) => isPlaceOpenOnDay(item, d));
}

/**
 * Helper: ดึงข้อมูลสถานที่จาก Supabase
 * รองรับทั้ง:
 * 1. ไฟล์/หน้าเก่า: ดึงข้อมูลครอบคลุมตามงบประมาณ (สูงสุด 300 รายการ) เพื่อให้ผู้ใช้ค้นหาและเลือกได้ครบ
 * 2. ไฟล์/หน้าระบบใหม่: กรอง open_days ที่ระดับ Database (ถ้ามีคอลัมน์) เพื่อเพิ่มประสิทธิภาพและความแม่นยำ
 */
async function queryTable(
  tableName: string,
  maxBudget: number | null,
  limitCount: number = 300,
  travelDays?: DayCode[],
  filterOpenDaysAtDb: boolean = false,
  exactBudget: boolean = false
) {
  const runQuery = (withOpenDaysFilter: boolean) => {
    let query = supabaseAdmin.from(tableName).select("*");

    if (maxBudget !== null) {
      const budgetInt = Math.max(0, Math.floor(maxBudget));
      if (exactBudget) {
        query = query.eq("min_price", budgetInt);
      } else {
        query = query.lte("min_price", budgetInt);
      }
    } else {
      query = query.order("min_price", { ascending: true });
    }

    if (withOpenDaysFilter && travelDays && travelDays.length > 0) {
      query = query.overlaps("open_days", travelDays);
    }

    return query.limit(limitCount);
  };

  // ถ้าต้องการกรอง open_days ที่ DB ให้ลองรันก่อน
  let { data, error } = await runQuery(filterOpenDaysAtDb && Boolean(travelDays && travelDays.length > 0));

  // หากฐานข้อมูลยังไม่มีคอลัมน์ open_days ให้ fallback รันแบบไม่กรองที่ระดับ DB
  if (error && (error.message?.includes("open_days") || error.code === "42703")) {
    const fallbackRes = await runQuery(false);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) throw new Error(`${tableName} error: ${error.message}`);
  return data || [];
}

/**
 * Helper: ดึงข้อมูลตามงบประมาณ พร้อมระบบ Fallback ดึงของถูกสุดมาเติมเมื่อรายการไม่พอ
 */
async function getItemsWithFallback(
  tableName: string,
  maxBudget: number,
  hasExplicitDays: boolean,
  travelDays?: DayCode[]
) {
  // ดึงรายการในงบ (ดึงมาสูงสุด 300 รายการเพื่อรองรับทั้ง Carousel ตัวเลือก และ Smart Planner)
  const primaryData = await queryTable(
    tableName,
    maxBudget,
    300,
    travelDays,
    hasExplicitDays
  );

  // กรองด้วยวันเปิดจริงใน JavaScript (ถ้าผู้ใช้ระบุวันเดินทางมาจริง)
  let results = hasExplicitDays
    ? primaryData.filter((item) => isOpenOnAnySelectedDay(item, travelDays))
    : primaryData;

  // Fallback: ถ้าได้ข้อมูลมาน้อยกว่า 15 รายการ ให้ดึงรายการที่ถูกที่สุดมาเติม เพื่อไม่ให้ผลลัพธ์ว่างเปล่า
  if (results.length < 15) {
    const fallbackData = await queryTable(tableName, null, 50, travelDays, false);
    const validFallback = hasExplicitDays
      ? fallbackData.filter((item) => isOpenOnAnySelectedDay(item, travelDays))
      : fallbackData;

    const existingIds = new Set(results.map((item) => item.id));
    const newItems = validFallback.filter((item) => !existingIds.has(item.id));
    results = [...results, ...newItems];
  }

  return results;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, totalBudget, customBudgets, days, travelDays } = body;

  // ตรวจสอบโหมด
  if (!mode || (mode !== "total" && mode !== "custom")) {
    return NextResponse.json(
      { error: "Invalid mode. Use 'total' or 'custom'." },
      { status: 400 }
    );
  }

  // แปลงจำนวนวันและคืน
  const daysNum = Math.max(1, Math.floor(Number(days) || 1));
  const nights = Math.max(daysNum - 1, 1);

  // ตรวจสอบ travelDays:
  // - ถ้าส่งมา: ตรวจสอบความถูกต้อง
  // - ถ้าไม่ส่งมา (เช่น caller จากไฟล์เก่า): สังเคราะห์วันเริ่มต้นให้อัตโนมัติ เพื่อให้แผนทริปและ perDay ยังคำนวณได้
  const hasExplicitDays = Boolean(
    travelDays && Array.isArray(travelDays) && travelDays.length > 0
  );

  let validatedTravelDays: DayCode[];
  if (hasExplicitDays) {
    validatedTravelDays = travelDays.filter(
      (d: string): d is DayCode => VALID_DAYS.includes(d?.toLowerCase() as DayCode)
    );
    if (validatedTravelDays.length === 0) {
      validatedTravelDays = getDefaultTravelDays(daysNum);
    }
  } else {
    validatedTravelDays = getDefaultTravelDays(daysNum);
  }

  // คำนวณงบประมาณในแต่ละหมวด
  let accBudget = 0;
  let foodBudget = 0;
  let destBudget = 0;
  let userBudget = 0;

  if (mode === "total") {
    const parsedTotal = Number(totalBudget);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      return NextResponse.json(
        { error: "totalBudget must be a positive number." },
        { status: 400 }
      );
    }
    userBudget = Math.round(parsedTotal);
    // สัดส่วนแนะนำ: ที่พัก 40%, อาหาร 30%, เที่ยว 30%
    accBudget = Math.round(userBudget * 0.40);
    foodBudget = Math.round(userBudget * 0.30);
    destBudget = Math.round(userBudget * 0.30);
  } else if (mode === "custom") {
    if (!customBudgets || typeof customBudgets !== "object") {
      return NextResponse.json(
        { error: "customBudgets object is required." },
        { status: 400 }
      );
    }
    accBudget = Math.max(0, Math.round(Number(customBudgets.accommodation) || 0));
    foodBudget = Math.max(0, Math.round(Number(customBudgets.food) || 0));
    destBudget = Math.max(0, Math.round(Number(customBudgets.destination) || 0));
    userBudget = accBudget + foodBudget + destBudget;
  }

  try {
    // ค่าที่พักคิดราคาต่อคืน จึงต้องหารด้วยจำนวนคืนก่อนกรองรายการที่พัก
    const accBudgetPerNight = Math.round(accBudget / nights);

    // ยิง Query ดึงข้อมูลทั้ง 3 หมวดพร้อมกัน (ครอบคลุมทั้งแบบเก่าและใหม่)
    const [accommodations, restaurants, destinations] = await Promise.all([
      getItemsWithFallback(
        "accommodations",
        accBudgetPerNight,
        hasExplicitDays,
        hasExplicitDays ? validatedTravelDays : undefined
      ),
      getItemsWithFallback(
        "restaurants",
        foodBudget,
        hasExplicitDays,
        hasExplicitDays ? validatedTravelDays : undefined
      ),
      getItemsWithFallback(
        "destinations",
        destBudget,
        hasExplicitDays,
        hasExplicitDays ? validatedTravelDays : undefined
      ),
    ]);

    // งบประมาณเป้าหมายของสถานที่ท่องเที่ยว (อ้างอิงจากที่กรอกโดยตรง เพื่อหน้าเลือกสถานที่เอง)
    const userDestBudget =
      mode === "custom"
        ? Math.round(Number(customBudgets?.destination) || 0)
        : Math.round(Number(totalBudget) || 0);

    // ดึงสถานที่ท่องเที่ยวสำหรับแท็บ "เลือกสถานที่เอง" (ตรงกับงบประมาณที่ผู้ใช้กรอก price === budget โดยตรง)
    let customDestinationsRaw: any[] = [];
    if (userDestBudget > 0) {
      const dbDestData = await queryTable(
        "destinations",
        userDestBudget,
        300,
        validatedTravelDays,
        hasExplicitDays,
        true // exactBudget: ใช้ query.eq("min_price", userDestBudget)
      );

      // กรองวันเปิดและเปรียบเทียบ price === budget อย่างเคร่งครัด
      customDestinationsRaw = dbDestData.filter((item) => {
        const itemPrice = Number(item.min_price);
        if (itemPrice !== userDestBudget) return false;
        if (hasExplicitDays) {
          return isOpenOnAnySelectedDay(item, validatedTravelDays);
        }
        return true;
      });
    } else {
      customDestinationsRaw = destinations;
    }

    // ตรวจสอบว่ามีผลลัพธ์หรือไม่
    const noResults =
      accommodations.length === 0 &&
      restaurants.length === 0 &&
      destinations.length === 0 &&
      customDestinationsRaw.length === 0;

    // ติดป้ายชื่ออำเภอ/โซนจริงให้กับสถานที่ทุกแห่ง
    const enrich = (item: any) => ({
      ...item,
      district: detectDistrict(item).name,
    });

    const enrichedAcc = shuffleArray(accommodations).map(enrich);
    const enrichedRes = shuffleArray(restaurants).map(enrich);
    const enrichedDest = shuffleArray(destinations).map(enrich);
    const enrichedCustomDest = shuffleArray(customDestinationsRaw).map(enrich);

    // ─── 1. สร้าง perDay grouping ตามโซนและระยะทาง ──────────────────────────────
    const perDay: Record<
      string,
      {
        dayCode: string;
        dayLabel: string;
        primaryDistrict: string;
        destinations: typeof enrichedDest;
        restaurants: typeof enrichedRes;
        accommodations: typeof enrichedAcc;
        recommendedRoute: DailyRoute;
      }
    > = {};

    const usedDestIds = new Set<string | number>();
    const usedRestIds = new Set<string | number>();
    let previousDistrict: string | null = null;

    for (const day of validatedTravelDays) {
      // กรองสถานที่เปิดในวันนั้น (ถ้าผู้ใช้ไม่ได้ระบุวันเจาะจงมา ให้ถือว่าสถานที่ทั้งหมดเปิดได้)
      const openDests = hasExplicitDays ? filterByDay(enrichedDest, day) : enrichedDest;
      const openRests = hasExplicitDays ? filterByDay(enrichedRes, day) : enrichedRes;
      const openAccs = hasExplicitDays ? filterByDay(enrichedAcc, day) : enrichedAcc;

      // Anchor Destination Strategy:
      // พยายามเลือกสถานที่ในอำเภอเดิมของวันก่อนหน้า เพื่อความต่อเนื่องในการเดินทาง
      let anchorDest: any = null;
      if (previousDistrict && openDests.length > 0) {
        const sameZoneUnused = openDests.find(
          (d) => !usedDestIds.has(d.id) && d.district === previousDistrict
        );
        if (sameZoneUnused) {
          anchorDest = sameZoneUnused;
        }
      }
      if (!anchorDest) {
        anchorDest =
          openDests.find((d) => !usedDestIds.has(d.id)) ||
          openDests[0] ||
          openRests[0] ||
          openAccs[0] ||
          null;
      }

      // เรียงลำดับที่เที่ยว ร้านอาหาร และที่พักตามระยะทางที่ใกล้ Anchor Destination ที่สุด
      let sortedDests = anchorDest ? sortByProximity(openDests, anchorDest) : openDests;
      let sortedRests = anchorDest ? sortByProximity(openRests, anchorDest) : openRests;
      let sortedAccs = anchorDest ? sortByProximity(openAccs, anchorDest) : openAccs;

      // ลำดับสถานที่เที่ยว: นำสถานที่ยังไม่เคยแนะนำขึ้นก่อน
      sortedDests = [
        ...sortedDests.filter((d) => !usedDestIds.has(d.id)),
        ...sortedDests.filter((d) => usedDestIds.has(d.id)),
      ];
      if (sortedDests[0]) usedDestIds.add(sortedDests[0].id);
      if (sortedDests[1]) usedDestIds.add(sortedDests[1].id);

      // ลำดับร้านอาหาร: นำร้านยังไม่เคยแนะนำขึ้นก่อน
      sortedRests = [
        ...sortedRests.filter((r) => !usedRestIds.has(r.id)),
        ...sortedRests.filter((r) => usedRestIds.has(r.id)),
      ];
      if (sortedRests[0]) usedRestIds.add(sortedRests[0].id);

      // สร้างเส้นทางแนะนำประจำวัน (ที่พัก ➔ ที่เที่ยว ➔ ร้านอาหาร ➔ ที่พัก) พร้อมระยะทางแต่ละช่วง (กม.)
      const recommendedRoute = buildDailyRoute(sortedDests, sortedRests, sortedAccs, { dayCode: day });

      perDay[day] = {
        dayCode: day,
        dayLabel: DAY_LABELS[day] || day,
        primaryDistrict: recommendedRoute.primaryDistrict,
        destinations: sortedDests,
        restaurants: sortedRests,
        accommodations: sortedAccs,
        recommendedRoute,
      };

      previousDistrict = recommendedRoute.primaryDistrict;
    }

    // ─── 2. สร้าง Trip Plans หลากหลายสไตล์ ──────────────────────────────────────
    const rawPlans = generateMultiTripPlans({
      days: daysNum,
      travelDays: validatedTravelDays,
      nights,
      allocatedBudgets: {
        accommodation: accBudget,
        accommodationPerNight: accBudgetPerNight,
        food: foodBudget,
        destination: destBudget,
      },
      userBudget,
      destinations: enrichedDest,
      restaurants: enrichedRes,
      accommodations: enrichedAcc,
    });

    // ─── เงื่อนไขบังคับ (HARD CONSTRAINT): totalCost <= userBudget ──────────────
    // กรองไม่ให้มี plan ใดที่ราคารวมเกินงบประมาณที่ผู้ใช้ตั้งไว้เด็ดขาด
    const validPlans = rawPlans.filter((plan) => plan.totalCost <= userBudget);

    // ─── 3. ส่ง Response ที่สมบูรณ์แบบ รองรับทั้งหน้าเดิมและหน้าใหม่ ──────────────
    return NextResponse.json({
      success: true,
      summary: {
        mode,
        userBudget,
        nights,
        days: daysNum,
        travelDays: validatedTravelDays,
        allocatedBudgets: {
          accommodation: accBudget,
          accommodationPerNight: accBudgetPerNight,
          food: foodBudget,
          destination: destBudget,
        },
      },
      noResults,
      // ระบบใหม่: แผนการเดินทางรายวันพร้อมระยะทางและรูปภาพ
      plans: validPlans,
      // ระบบใหม่: จัดกลุ่มสถานที่ตามวันเปิดและโซนพื้นที่
      perDay,
      // ระบบจัดทริป: รายการสำหรับหน้าเลือกสถานที่เอง และหน้าสถานที่ตรงตามงบที่กรอก
      trip: {
        accommodations: enrichedAcc,
        restaurants: enrichedRes,
        destinations: enrichedDest,
        exactDestinations: enrichedCustomDest,
      },
      exactDestinations: enrichedCustomDest,
    });
  } catch (error: unknown) {
    console.error("Generate Trip Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate trip.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
