// src/lib/geo.ts
//
// ระบบวิเคราะห์ตำแหน่ง โซนอำเภอ และคำนวณระยะทางด้วย Haversine Formula
// สำหรับจังหวัดนครราชสีมา (โคราช) ครบทั้ง 32 อำเภอทางการ

export interface KoratDistrict {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export interface RouteStop {
  id: string | number;
  type: "accommodation" | "destination" | "restaurant";
  name: string;
  category?: string;
  image_url: string;
  all_images: string[];
  description?: string;
  address?: string;
  location?: string;
  opening_hours?: string;
  opening_hours_raw?: any;
  open_days?: string[];
  price?: number;
  min_price?: number;
  max_price?: number;
  phone?: string;
  district?: string;
  distance_from_previous?: number;
  note?: string;
}

export interface RouteLeg {
  from: string;
  to: string;
  fromType: "accommodation" | "destination" | "restaurant";
  toType: "accommodation" | "destination" | "restaurant";
  distanceKm: number;
  sameDistrict: boolean;
  note?: string;
}

export interface DailyRoute {
  dayCode?: string;
  dayLabel?: string;
  dayNumber?: number;
  primaryDistrict: string;
  hotel?: any;
  destinations: any[];
  restaurant?: any;
  stops: RouteStop[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  isRealistic: boolean;
  feasibility: "เดินทางสะดวก (โซนเดียวกัน)" | "เดินทางระยะปานกลาง (อำเภอใกล้เคียง)" | "ค่อนข้างไกล";
}

export interface TripPlan {
  id: string;
  name: string;
  theme: string;
  coverImage: string;
  description: string;
  totalCost: number;
  totalDistanceKm: number;
  days: number;
  dailyRoutes: DailyRoute[];
  items: Array<{ id: string | number; type: "destination" | "restaurant" | "accommodation" }>;
}

// ─── 32 อำเภอทางการของจังหวัดนครราชสีมา พร้อมพิกัดศูนย์กลางอำเภอจริง ─────────────
export const KORAT_DISTRICTS: KoratDistrict[] = [
  {
    id: "mueang",
    name: "เมืองนครราชสีมา",
    fullName: "อำเภอเมืองนครราชสีมา",
    lat: 14.9799,
    lng: 102.0978,
    aliases: [
      "เมือง", "อ.เมือง", "อำเภอเมือง", "ในเมือง", "สุรนารี", "จอหอ", "โพธิ์กลาง",
      "หนองไผ่ล้อม", "หัวทะเล", "ปรุใหญ่", "บ้านเกาะ", "หนองจะบก", "ไชยมงคล",
      "หมื่นไวย", "โคกสูง", "เทอร์มินอล", "เดอะมอลล์โคราช", "ย่าโม", "เซ็นทรัลโคราช",
      "วัดศาลาลอย", "คลังพลาซ่า", "บขส.โคราช", "มหาวิทยาลัยเทคโนโลยีสุรนารี", "มทส"
    ],
  },
  {
    id: "pakchong",
    name: "ปากช่อง",
    fullName: "อำเภอปากช่อง",
    lat: 14.7081,
    lng: 101.4172,
    aliases: [
      "ปากช่อง", "เขาใหญ่", "หมูสี", "ขนงพระ", "กลางดง", "หนองน้ำแดง", "พญาเย็น",
      "วังกะทะ", "คลองม่วง", "ธนะรัชต์", "กุดคล้า", "ฟาร์มโชคชัย", "โบนันซ่า", "ปาลิโอ",
      "pb valley", "มณีศร", "น้ำผุด", "ท่าช้าง", "เขาใหญ่คีรีธารทิพย์", "ทอสคานา"
    ],
  },
  {
    id: "wangnamkhiao",
    name: "วังน้ำเขียว",
    fullName: "อำเภอวังน้ำเขียว",
    lat: 14.3985,
    lng: 101.9083,
    aliases: [
      "วังน้ำเขียว", "ไทยสามัคคี", "วังหมี", "อุดมทรัพย์", "ระเริง", "ผาเก็บตะวัน",
      "ฟลอร่าพาร์ค", "ทับลาน", "มอนทาน่า", "วิลเลจฟาร์ม", "สวิตเซอร์แลนด์แดนอีสาน"
    ],
  },
  {
    id: "sikhio",
    name: "สีคิ้ว",
    fullName: "อำเภอสีคิ้ว",
    lat: 14.8927,
    lng: 101.7225,
    aliases: [
      "สีคิ้ว", "ลำตะคอง", "คลองไผ่", "มิตรภาพ", "วัดหลวงพ่อโต", "วิหารสมเด็จ",
      "ซับประดู่", "เขาจันทน์งาม", "กังหันลมเขายายเที่ยง", "เขายายเที่ยง", "บ้านหัน"
    ],
  },
  {
    id: "phimai",
    name: "พิมาย",
    fullName: "อำเภอพิมาย",
    lat: 15.2227,
    lng: 102.4947,
    aliases: [
      "พิมาย", "ปราสาทหินพิมาย", "ไทรงาม", "โบราณสถานพิมาย", "ในเมืองพิมาย",
      "ท่าหลวง", "สัมฤทธิ์"
    ],
  },
  {
    id: "pakthongchai",
    name: "ปักธงชัย",
    fullName: "อำเภอปักธงชัย",
    lat: 14.7212,
    lng: 102.0287,
    aliases: [
      "ปักธงชัย", "ตะขบ", "ลำพระเพลิง", "สะแกราช", "จิมทอมป์สัน", "ผ้าไหมปักธงชัย",
      "เมืองปัก", "งิ้ว", "ดอน"
    ],
  },
  {
    id: "chokchai",
    name: "โชคชัย",
    fullName: "อำเภอโชคชัย",
    lat: 14.7314,
    lng: 102.1672,
    aliases: ["โชคชัย", "ด่านเกวียน", "ท่าเยี่ยม", "กระโทก", "ละลมใหม่พัฒนา"],
  },
  {
    id: "sungnoen",
    name: "สูงเนิน",
    fullName: "อำเภอสูงเนิน",
    lat: 14.8988,
    lng: 101.8197,
    aliases: ["สูงเนิน", "เสมา", "เมืองแขก", "กุดจิก", "พระนอนหินทราย", "โคราชจีโอพาร์ค"],
  },
  {
    id: "dankhunthot",
    name: "ด่านขุนทด",
    fullName: "อำเภอด่านขุนทด",
    lat: 15.2078,
    lng: 101.7656,
    aliases: ["ด่านขุนทด", "ห้วยบง", "วัดบ้านไร่", "หลวงพ่อคูณ", "ทุ่งกังหันลม"],
  },
  {
    id: "khonburi",
    name: "ครบุรี",
    fullName: "อำเภอครบุรี",
    lat: 14.5262,
    lng: 102.2472,
    aliases: ["ครบุรี", "ห้วยใหญ่", "จระเข้หิน", "ลำแชะ", "แชะ"],
  },
  {
    id: "soengsang",
    name: "เสิงสาง",
    fullName: "อำเภอเสิงสาง",
    lat: 14.4258,
    lng: 102.4567,
    aliases: ["เสิงสาง", "หาดชมตะวัน", "ลำปลายมาศ", "โนนสมบูรณ์"],
  },
  {
    id: "nonsung",
    name: "โนนสูง",
    fullName: "อำเภอโนนสูง",
    lat: 15.1804,
    lng: 102.2575,
    aliases: ["โนนสูง", "ปราสาทหินพนมวัน", "พนมวัน", "ดอนหวาย", "ธารปราสาท"],
  },
  {
    id: "nonthai",
    name: "โนนไทย",
    fullName: "อำเภอโนนไทย",
    lat: 15.1972,
    lng: 102.0683,
    aliases: ["โนนไทย", "โนนลาว"],
  },
  {
    id: "khamthaleso",
    name: "ขามทะเลสอ",
    fullName: "อำเภอขามทะเลสอ",
    lat: 14.9819,
    lng: 102.0019,
    aliases: ["ขามทะเลสอ", "โป่งแดง"],
  },
  {
    id: "buayai",
    name: "บัวใหญ่",
    fullName: "อำเภอบัวใหญ่",
    lat: 15.5847,
    lng: 102.4278,
    aliases: ["บัวใหญ่", "ด่านช้าง"],
  },
  {
    id: "prathai",
    name: "ประทาย",
    fullName: "อำเภอประทาย",
    lat: 15.5392,
    lng: 102.7236,
    aliases: ["ประทาย", "กระทุ่มราย"],
  },
  {
    id: "chumphuang",
    name: "ชุมพวง",
    fullName: "อำเภอชุมพวง",
    lat: 15.3528,
    lng: 102.7417,
    aliases: ["ชุมพวง", "อ่างเก็บน้ำมูลบน", "ท่าลาด"],
  },
  {
    id: "huaythalaeng",
    name: "ห้วยแถลง",
    fullName: "อำเภอห้วยแถลง",
    lat: 15.0028,
    lng: 102.6486,
    aliases: ["ห้วยแถลง", "หินดาด"],
  },
  {
    id: "chakkarat",
    name: "จักราช",
    fullName: "อำเภอจักราช",
    lat: 15.0042,
    lng: 102.4183,
    aliases: ["จักราช", "ทองหลาง"],
  },
  {
    id: "chaloemphrakiat",
    name: "เฉลิมพระเกียรติ",
    fullName: "อำเภอเฉลิมพระเกียรติ",
    lat: 15.0111,
    lng: 102.2986,
    aliases: ["เฉลิมพระเกียรติ", "ท่าช้าง", "พระพุทธบาทจำลอง"],
  },
  {
    id: "nongbunmak",
    name: "หนองบุญมาก",
    fullName: "อำเภอหนองบุญมาก",
    lat: 14.7333,
    lng: 102.4333,
    aliases: ["หนองบุญมาก", "หนองบุนนาก"],
  },
  {
    id: "thepharak",
    name: "เทพารักษ์",
    fullName: "อำเภอเทพารักษ์",
    lat: 15.2833,
    lng: 101.5500,
    aliases: ["เทพารักษ์", "สำนักตะคร้อ"],
  },
  {
    id: "khamsakaesaeng",
    name: "ขามสะแกแสง",
    fullName: "อำเภอขามสะแกแสง",
    lat: 15.3333,
    lng: 102.1667,
    aliases: ["ขามสะแกแสง"],
  },
  {
    id: "banlueam",
    name: "บ้านเหลื่อม",
    fullName: "อำเภอบ้านเหลื่อม",
    lat: 15.6000,
    lng: 102.1333,
    aliases: ["บ้านเหลื่อม"],
  },
  {
    id: "kaengsanamnang",
    name: "แก้งสนามนาง",
    fullName: "อำเภอแก้งสนามนาง",
    lat: 15.7500,
    lng: 102.4167,
    aliases: ["แก้งสนามนาง"],
  },
  {
    id: "nondaeng",
    name: "โนนแดง",
    fullName: "อำเภอโนนแดง",
    lat: 15.4167,
    lng: 102.5833,
    aliases: ["โนนแดง"],
  },
  {
    id: "sida",
    name: "สีดา",
    fullName: "อำเภอสีดา",
    lat: 15.5333,
    lng: 102.5667,
    aliases: ["สีดา"],
  },
  {
    id: "bualai",
    name: "บัวลาย",
    fullName: "อำเภอบัวลาย",
    lat: 15.6833,
    lng: 102.5500,
    aliases: ["บัวลาย"],
  },
  {
    id: "phrathongkham",
    name: "พระทองคำ",
    fullName: "อำเภอพระทองคำ",
    lat: 15.2500,
    lng: 102.0167,
    aliases: ["พระทองคำ", "สระพระ"],
  },
  {
    id: "mueangyang",
    name: "เมืองยาง",
    fullName: "อำเภอเมืองยาง",
    lat: 15.4333,
    lng: 102.9167,
    aliases: ["เมืองยาง"],
  },
  {
    id: "lamthamenchai",
    name: "ลำทะเมนชัย",
    fullName: "อำเภอลำทะเมนชัย",
    lat: 15.3500,
    lng: 102.9167,
    aliases: ["ลำทะเมนชัย"],
  },
  {
    id: "khong",
    name: "คง",
    fullName: "อำเภอคง",
    lat: 15.4417,
    lng: 102.3278,
    aliases: ["อำเภอคง", "เมืองคง"],
  },
];

// Fallback อำเภอเมือง
const DEFAULT_DISTRICT = KORAT_DISTRICTS[0];

/**
 * ฟังก์ชันวิเคราะห์และตรวจจับอำเภอจริงจากข้อมูลของสถานที่
 */
export function detectDistrict(item: {
  name?: string | null;
  location?: string | null;
  address?: string | null;
  description?: string | null;
}): KoratDistrict {
  const combined = [
    item.name ?? "",
    item.location ?? "",
    item.address ?? "",
    item.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. ตรวจสอบชื่ออำเภอโดยตรง ("อำเภอ..." หรือ "อ....")
  for (const dist of KORAT_DISTRICTS) {
    if (
      combined.includes("อำเภอ" + dist.name.toLowerCase()) ||
      combined.includes("อำเภอ " + dist.name.toLowerCase()) ||
      combined.includes("อ." + dist.name.toLowerCase()) ||
      combined.includes("อ. " + dist.name.toLowerCase())
    ) {
      return dist;
    }
  }

  // 2. ตรวจสอบจาก Aliases (สถานที่สำคัญ/ตำบล)
  for (const dist of KORAT_DISTRICTS) {
    for (const alias of dist.aliases) {
      if (combined.includes(alias.toLowerCase())) {
        return dist;
      }
    }
  }

  // 3. ตรวจสอบชื่ออำเภอสั้นๆ โดดๆ
  for (const dist of KORAT_DISTRICTS) {
    if (combined.includes(dist.name.toLowerCase())) {
      return dist;
    }
  }

  // Fallback: หากไม่สามารถระบุได้ ให้เป็นอำเภอเมืองนครราชสีมา
  return DEFAULT_DISTRICT;
}

/**
 * คำนวณระยะทางตามแนวเส้นรอบวงโลก (Haversine Formula) เป็นกิโลเมตร
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // รัศมีโลกเฉลี่ย (กิโลเมตร)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * คำนวณระยะทางระหว่าง 2 สถานที่จริง
 * - หากอยู่ในอำเภอเดียวกัน: ประเมินระยะทางขับรถในพื้นที่เฉลี่ย 2.5 - 5.0 กม.
 * - หากอยู่ต่างอำเภอ: คำนวณระยะทางด้วย Haversine Formula ระหว่างพิกัดศูนย์กลางอำเภอ
 */
export function getEstimatedDistanceKm(itemA: any, itemB: any): number {
  if (!itemA || !itemB) return 0;

  const distA = detectDistrict(itemA);
  const distB = detectDistrict(itemB);

  if (distA.id === distB.id) {
    // ในอำเภอเดียวกัน: ใช้ hash เล็กน้อยเพื่อให้ตัวเลขมีความสมจริงและไม่ซ้ำกันหมด
    const hash = Math.abs((Number(itemA.id) || 3) * 7 + (Number(itemB.id) || 5) * 11) % 30;
    return Math.round((2.0 + hash * 0.1) * 10) / 10; // ระหว่าง 2.0 ถึง 5.0 กม.
  }

  const rawKm = calculateDistanceKm(distA.lat, distA.lng, distB.lat, distB.lng);
  // ระยะทางถนนจริงมักยาวกว่าเส้นตรงประมาณ 15%
  return Math.round(rawKm * 1.15 * 10) / 10;
}

/**
 * เรียงลำดับรายการตามความใกล้กับสถานที่อ้างอิง
 */
export function sortByProximity<T extends { id: any; name?: string | null; location?: string | null; address?: string | null; description?: string | null }>(
  items: T[],
  anchorItem: any
): (T & { distanceKm: number; district: string })[] {
  if (!items || items.length === 0) return [];
  const anchorDistrict = detectDistrict(anchorItem);

  const mapped = items.map((item) => {
    const itemDistrict = detectDistrict(item);
    const distanceKm = getEstimatedDistanceKm(anchorItem, item);
    return {
      ...item,
      distanceKm,
      district: itemDistrict.name,
      isSameDistrict: anchorDistrict.id === itemDistrict.id,
    };
  });

  // ลำดับการเรียง: อยู่ในอำเภอเดียวกันก่อน -> จากนั้นเรียงตามระยะทางจากน้อยไปมาก
  return mapped.sort((a, b) => {
    if (a.isSameDistrict && !b.isSameDistrict) return -1;
    if (!a.isSameDistrict && b.isSameDistrict) return 1;
    return a.distanceKm - b.distanceKm;
  });
}

// ─── Image Extraction Helpers ──────────────────────────────────────────────────

const FALLBACK_IMAGES = {
  destination: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  accommodation: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
};

export function extractAllImages(
  rawVal: any,
  fallbackType: "destination" | "restaurant" | "accommodation" = "destination"
): string[] {
  if (!rawVal) return [FALLBACK_IMAGES[fallbackType]];
  if (Array.isArray(rawVal)) {
    const valid = rawVal.filter((u) => typeof u === "string" && u.trim().length > 0);
    return valid.length > 0 ? valid : [FALLBACK_IMAGES[fallbackType]];
  }
  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((u) => typeof u === "string" && u.trim().length > 0);
          if (valid.length > 0) return valid;
        }
      } catch {
        // ignore json parse error
      }
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return [trimmed];
    }
  }
  return [FALLBACK_IMAGES[fallbackType]];
}

export function extractImageUrl(
  rawVal: any,
  fallbackType: "destination" | "restaurant" | "accommodation" = "destination"
): string {
  const images = extractAllImages(rawVal, fallbackType);
  return images[0] || FALLBACK_IMAGES[fallbackType];
}

const FULL_DAY_MAP: Record<string, string> = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

export function isPlaceOpenOnDay(item: any, dayCode: string): boolean {
  if (!item) return false;

  // 1. Check opening_hours JSON
  if (item.opening_hours && typeof item.opening_hours === "object") {
    const sched = item.opening_hours[dayCode] ?? item.opening_hours[FULL_DAY_MAP[dayCode]];
    if (sched && typeof sched === "object" && typeof sched.is_open === "boolean") {
      return sched.is_open;
    }
  }

  // 2. Check open_days text[]
  if (item.open_days && Array.isArray(item.open_days) && item.open_days.length > 0) {
    return item.open_days.includes(dayCode);
  }

  // 3. Default open if no restrictions specified
  return true;
}

export function toRouteStop(
  item: any,
  type: "accommodation" | "destination" | "restaurant",
  distanceFromPrevious: number = 0,
  note?: string,
  dayCode?: string
): RouteStop {
  const allImages = extractAllImages(item.images || item.image_url, type);
  const districtObj = detectDistrict(item);

  // Format opening hours text
  let openingHoursText: string | undefined = undefined;
  if (item.opening_hours && typeof item.opening_hours === "object") {
    const sched = dayCode ? (item.opening_hours[dayCode] ?? item.opening_hours[FULL_DAY_MAP[dayCode]]) : null;
    if (sched && typeof sched === "object") {
      if (sched.is_open && sched.open_time && sched.close_time) {
        openingHoursText = `เปิด ${sched.open_time} - ${sched.close_time} น.`;
      } else if (sched.is_open === false) {
        openingHoursText = "ปิดทำการ";
      }
    }
  }
  if (!openingHoursText && item.open_days && Array.isArray(item.open_days) && item.open_days.length > 0) {
    openingHoursText = `เปิดวัน: ${item.open_days.join(", ")}`;
  }

  return {
    id: item.id,
    type,
    name: item.name?.trim() || "ไม่ระบุชื่อ",
    category: item.category || undefined,
    image_url: allImages[0],
    all_images: allImages,
    description: item.description || undefined,
    address: item.address || item.location || undefined,
    location: item.location || item.address || undefined,
    opening_hours: openingHoursText,
    opening_hours_raw: item.opening_hours || undefined,
    open_days: item.open_days || undefined,
    price: item.min_price ?? item.price ?? undefined,
    min_price: item.min_price ?? undefined,
    max_price: item.max_price ?? undefined,
    phone: item.contact_phone || item.phone || undefined,
    district: districtObj.name,
    distance_from_previous: Math.round(distanceFromPrevious * 10) / 10,
    note,
  };
}

/**
 * สร้างเส้นทางแนะนำประจำวัน (Daily Route Plan)
 * ลำดับ: ที่พัก ➔ ที่เที่ยว 1 ➔ ร้านอาหาร ➔ ที่เที่ยว 2 (ถ้ามี) ➔ ที่พัก
 */
export function buildDailyRoute(
  destinations: any[],
  restaurants: any[],
  accommodations: any[],
  meta?: { dayCode?: string; dayLabel?: string; dayNumber?: number }
): DailyRoute {
  const legs: RouteLeg[] = [];
  const stops: RouteStop[] = [];

  const selectedDests = destinations.slice(0, 2);
  const selectedRest = restaurants[0] || null;
  const selectedHotel = accommodations[0] || null;

  const primaryDest = selectedDests[0] || selectedRest || selectedHotel;
  const primaryDistrict = primaryDest ? detectDistrict(primaryDest).name : "เมืองนครราชสีมา";

  let totalDistanceKm = 0;

  // Stop 1: ที่พัก (จุดเริ่มต้นของวัน)
  if (selectedHotel) {
    stops.push(toRouteStop(selectedHotel, "accommodation", 0, "จุดเริ่มต้นของวัน (ออกเดินทางจากที่พัก)", meta?.dayCode));
  }

  // 1. ที่พัก ➔ ที่เที่ยว 1
  if (selectedHotel && selectedDests[0]) {
    const km = getEstimatedDistanceKm(selectedHotel, selectedDests[0]);
    const sameDistrict = detectDistrict(selectedHotel).id === detectDistrict(selectedDests[0]).id;
    legs.push({
      from: selectedHotel.name,
      to: selectedDests[0].name,
      fromType: "accommodation",
      toType: "destination",
      distanceKm: km,
      sameDistrict,
      note: "ออกเดินทางจากที่พักสู่สถานที่ท่องเที่ยวแรก",
    });
    totalDistanceKm += km;
    stops.push(toRouteStop(selectedDests[0], "destination", km, "สถานที่ท่องเที่ยวไฮไลท์ช่วงเช้า", meta?.dayCode));
  } else if (!selectedHotel && selectedDests[0]) {
    stops.push(toRouteStop(selectedDests[0], "destination", 0, "สถานที่ท่องเที่ยวแรก", meta?.dayCode));
  }

  // 2. ที่เที่ยว 1 ➔ ร้านอาหาร
  if (selectedDests[0] && selectedRest) {
    const km = getEstimatedDistanceKm(selectedDests[0], selectedRest);
    const sameDistrict = detectDistrict(selectedDests[0]).id === detectDistrict(selectedRest).id;
    legs.push({
      from: selectedDests[0].name,
      to: selectedRest.name,
      fromType: "destination",
      toType: "restaurant",
      distanceKm: km,
      sameDistrict,
      note: "แวะพักรับประทานอาหารมื้ออร่อย",
    });
    totalDistanceKm += km;
    stops.push(toRouteStop(selectedRest, "restaurant", km, "แวะพักรับประทานอาหารมื้ออร่อย", meta?.dayCode));
  } else if (!selectedDests[0] && selectedRest) {
    const prev = stops[stops.length - 1];
    const km = prev ? getEstimatedDistanceKm(prev, selectedRest) : 0;
    stops.push(toRouteStop(selectedRest, "restaurant", km, "แวะพักรับประทานอาหาร", meta?.dayCode));
  }

  // 3. ร้านอาหาร ➔ ที่เที่ยว 2 (ถ้ามี)
  if (selectedRest && selectedDests[1]) {
    const km = getEstimatedDistanceKm(selectedRest, selectedDests[1]);
    const sameDistrict = detectDistrict(selectedRest).id === detectDistrict(selectedDests[1]).id;
    legs.push({
      from: selectedRest.name,
      to: selectedDests[1].name,
      fromType: "restaurant",
      toType: "destination",
      distanceKm: km,
      sameDistrict,
      note: "เดินทางต่อสู่จุดหมายถัดไป",
    });
    totalDistanceKm += km;
    stops.push(toRouteStop(selectedDests[1], "destination", km, "สถานที่ท่องเที่ยวช่วงบ่าย/เย็น", meta?.dayCode));
  }

  // 4. ที่เที่ยวสุดท้าย ➔ กลับที่พัก
  const lastStop = selectedDests[1] || selectedDests[0] || selectedRest;
  if (lastStop && selectedHotel && lastStop !== selectedHotel) {
    const km = getEstimatedDistanceKm(lastStop, selectedHotel);
    const sameDistrict = detectDistrict(lastStop).id === detectDistrict(selectedHotel).id;
    legs.push({
      from: lastStop.name,
      to: selectedHotel.name,
      fromType: selectedDests[1] ? "destination" : selectedDests[0] ? "destination" : "restaurant",
      toType: "accommodation",
      distanceKm: km,
      sameDistrict,
      note: "เดินทางกลับที่พักเพื่อพักผ่อน",
    });
    totalDistanceKm += km;
    stops.push(toRouteStop(selectedHotel, "accommodation", km, "เดินทางกลับที่พักเพื่อพักผ่อน", meta?.dayCode));
  }

  totalDistanceKm = Math.round(totalDistanceKm * 10) / 10;

  let feasibility: DailyRoute["feasibility"] = "เดินทางสะดวก (โซนเดียวกัน)";
  if (totalDistanceKm > 80) {
    feasibility = "ค่อนข้างไกล";
  } else if (totalDistanceKm > 35) {
    feasibility = "เดินทางระยะปานกลาง (อำเภอใกล้เคียง)";
  }

  const isRealistic = feasibility !== "ค่อนข้างไกล";

  return {
    dayCode: meta?.dayCode,
    dayLabel: meta?.dayLabel,
    dayNumber: meta?.dayNumber,
    primaryDistrict,
    hotel: selectedHotel,
    destinations: selectedDests,
    restaurant: selectedRest,
    stops,
    legs,
    totalDistanceKm,
    isRealistic,
    feasibility,
  };
}

/**
 * ฟังก์ชันสร้าง 2-3 Trip Plans ที่แตกต่างและตอบโจทย์ความต้องการของผู้ใช้
 */
export function generateMultiTripPlans({
  days,
  travelDays,
  nights,
  allocatedBudgets,
  userBudget,
  destinations,
  restaurants,
  accommodations,
}: {
  days: number;
  travelDays: string[];
  nights: number;
  allocatedBudgets: {
    accommodation: number;
    accommodationPerNight: number;
    food: number;
    destination: number;
  };
  userBudget: number;
  destinations: any[];
  restaurants: any[];
  accommodations: any[];
}): TripPlan[] {
  // หากไม่มีข้อมูลสถานที่เลย คืน array ว่าง
  if (!destinations || destinations.length === 0) return [];

  const actualNights = Math.max(nights, 1);
  const effectiveUserBudget =
    userBudget > 0
      ? userBudget
      : (allocatedBudgets.accommodation || 0) +
        (allocatedBudgets.food || 0) +
        (allocatedBudgets.destination || 0);

  // 1. คัดกรองที่พักให้เหมาะสมกับงบประมาณรวม (ไม่ให้ที่พักกินงบจนเกินงบรวม)
  // สำรองงบขั้นต่ำสำหรับอาหารและกิจกรรม
  const minActivitiesBudget = Math.min(effectiveUserBudget * 0.1, days * 50);
  const maxHotelTotalCost = Math.max(0, effectiveUserBudget - minActivitiesBudget);

  // ที่พักที่ราคาต่อคืน x จำนวนคืน ไม่เกินงบที่จัดสรร
  let eligibleAccs = accommodations.filter((acc) => {
    const pricePerNight = Number(acc.min_price) || 0;
    return pricePerNight * actualNights <= maxHotelTotalCost;
  });

  // ถ้าไม่มีที่พักในเกณฑ์สำรอง ให้ใช้เกณฑ์เพดาน userBudget โดยตรง
  if (eligibleAccs.length === 0) {
    eligibleAccs = accommodations.filter((acc) => {
      const pricePerNight = Number(acc.min_price) || 0;
      return pricePerNight * actualNights <= effectiveUserBudget;
    });
  }

  // หากไม่มีที่พักใดเลยที่อยู่ในงบประมาณรวม คืน array ว่าง (ห้ามฝืนสร้างแผนที่เกินงบ)
  if (eligibleAccs.length === 0) {
    return [];
  }

  // จัดกลุ่มที่พักที่อยู่ในงบตามอำเภอ
  const accsByDistrict: Record<string, any[]> = {};
  for (const acc of eligibleAccs) {
    const d = detectDistrict(acc).name;
    if (!accsByDistrict[d]) accsByDistrict[d] = [];
    accsByDistrict[d].push(acc);
  }

  const districtKeys = Object.keys(accsByDistrict);

  // กำหนด Configurations สำหรับสร้างแผนที่มีความหลากหลายตามโซนที่มีที่พักในงบจริง
  interface PlanConfig {
    id: string;
    name: string;
    theme: string;
    description: string;
    preferredDistrict?: string;
    hotelIndex: number;
    categoryPreference?: string[];
  }

  const planConfigs: PlanConfig[] = [];

  if (districtKeys.includes("ปากช่อง") && districtKeys.includes("เมืองนครราชสีมา")) {
    // มีทั้งโซนเขาใหญ่-ปากช่อง และเมือง ที่อยู่ในงบ
    planConfigs.push({
      id: "plan-pakchong-nature",
      name: "ทริปเขาใหญ่-ปากช่อง: ธรรมชาติ โอโซน & คาเฟ่ชิค",
      theme: "ธรรมชาติ & พักผ่อน",
      description: "ดื่มด่ำอากาศบริสุทธิ์ วิวขุนเขาเขาใหญ่ ไร่ดอกไม้ และคาเฟ่บรรยากาศอบอุ่นในอำเภอปากช่อง",
      preferredDistrict: "ปากช่อง",
      hotelIndex: 0,
    });
    planConfigs.push({
      id: "plan-mueang-lifestyle",
      name: "ทริปไฮไลท์เมืองย่าโม: ช้อป ชิม ชิลล์ กลางใจเมือง",
      theme: "แลนด์มาร์ก & สตรีทฟู้ด",
      description: "สักการะย่าโม เที่ยวแลนด์มาร์กชื่อดัง ชิมอาหารรสเด็ดโคราช และเช็คอินตลาดไนท์คึกคัก",
      preferredDistrict: "เมืองนครราชสีมา",
      hotelIndex: 0,
    });
    if (districtKeys.includes("วังน้ำเขียว")) {
      planConfigs.push({
        id: "plan-wangnamkhiao",
        name: "ทริปสวิสเซอร์แลนด์แดนอีสาน: วังน้ำเขียว & ฟาร์มสวย",
        theme: "ฟาร์ม & สายหมอก",
        description: "สัมผัสอากาศเย็นสบาย ทุ่งดอกไม้ฟลอร่าพาร์ค และวิถีเกษตรอินทรีย์วังน้ำเขียว",
        preferredDistrict: "วังน้ำเขียว",
        hotelIndex: 0,
      });
    } else {
      planConfigs.push({
        id: "plan-mueang-chill",
        name: "ทริปประหยัดสุดคุ้ม: พักสบาย ตะลุยกิน เที่ยวครบ",
        theme: "ประหยัด & คุ้มค่า",
        description: "จัดเต็มความคุ้มค่า ที่พักราคาสบายกระเป๋า พร้อมร้านอร่อยและสถานที่ท่องเที่ยวยอดนิยม",
        preferredDistrict: "เมืองนครราชสีมา",
        hotelIndex: 1,
      });
    }
  } else if (districtKeys.includes("พิมาย") && districtKeys.includes("เมืองนครราชสีมา")) {
    // มีทั้งพิมายและเมือง ที่อยู่ในงบ
    planConfigs.push({
      id: "plan-mueang-highlights",
      name: "ทริปไฮไลท์เมืองย่าโม & วิถีคนเมือง",
      theme: "แลนด์มาร์ก & คาเฟ่",
      description: "เที่ยวจุดเช็คอินยอดฮิตกลางเมืองโคราช ไหว้พระคู่บ้านคู่เมือง และลิ้มลองสเต็ก-หมูกะทะรสเด็ด",
      preferredDistrict: "เมืองนครราชสีมา",
      hotelIndex: 0,
    });
    planConfigs.push({
      id: "plan-phimai-history",
      name: "ทริปมนต์เสน่ห์พิมาย & อารยธรรมขอมโบราณ",
      theme: "ประวัติศาสตร์ & วัฒนธรรม",
      description: "ย้อนรอยประวัติศาสตร์อุทยานประวัติศาสตร์พิมาย ชมไทรงามร่มรื่น และชิมผัดหมี่โคราชต้นตำรับ",
      preferredDistrict: "พิมาย",
      hotelIndex: 0,
    });
    planConfigs.push({
      id: "plan-nature-culture",
      name: "ทริปธรรมชาติ ชานเมือง & พักผ่อนริมน้ำ",
      theme: "ธรรมชาติ & ผ่อนคลาย",
      description: "พักผ่อนสบายๆ ริมอ่างเก็บน้ำ สวนสัตว์นครราชสีมา และสัมผัสธรรมชาติอันร่มรื่น",
      preferredDistrict: "เมืองนครราชสีมา",
      hotelIndex: 1,
    });
  } else {
    // กรณีที่พักส่วนใหญ่อยู่ในอำเภอเดียวกัน (เช่น เมืองนครราชสีมา)
    const primaryDistrict = districtKeys[0] || "เมืองนครราชสีมา";
    planConfigs.push({
      id: "plan-1-city-highlights",
      name: `ทริปไฮไลท์ยอดนิยม โซน${primaryDistrict}`,
      theme: "แลนด์มาร์ก & เช็คอินสุดฮิต",
      description: `ตะลุยแลนด์มาร์กสำคัญและจุดถ่ายรูปยอดนิยมใน${primaryDistrict} เดินทางสะดวกและครบเครื่อง`,
      preferredDistrict: primaryDistrict,
      hotelIndex: 0,
    });
    planConfigs.push({
      id: "plan-2-culture-dining",
      name: `ทริปวัฒนธรรม ศิลปะ & ตะลุยชิมของอร่อย`,
      theme: "วัฒนธรรม & รสเด็ดเมืองย่าโม",
      description: `สัมผัสเสน่ห์ประวัติศาสตร์ วัดวาอารามงดงาม และลิ้มลองร้านอาหารขึ้นชื่อหลากหลายสไตล์`,
      preferredDistrict: primaryDistrict,
      hotelIndex: Math.min(1, eligibleAccs.length - 1),
    });
    planConfigs.push({
      id: "plan-3-nature-relax",
      name: `ทริปธรรมชาติ พักผ่อนชิลล์ & คาเฟ่สวย`,
      theme: "ธรรมชาติ & พักผ่อนสบายๆ",
      description: `หลีกหนีความวุ่นวาย สูดอากาศบริสุทธิ์ริมน้ำ นั่งชิลล์คาเฟ่บรรยากาศสบายในงบประมาณที่คุ้มค่า`,
      preferredDistrict: primaryDistrict,
      hotelIndex: Math.min(2, eligibleAccs.length - 1),
    });
  }

  const plans: TripPlan[] = [];

  for (const config of planConfigs) {
    // 1. เลือกที่พักสำหรับแผนนี้จากที่พักที่อยู่ในงบ
    let hotelPool = eligibleAccs;
    if (config.preferredDistrict && accsByDistrict[config.preferredDistrict]?.length > 0) {
      hotelPool = accsByDistrict[config.preferredDistrict];
    }
    const chosenHotel = hotelPool[config.hotelIndex % hotelPool.length] || eligibleAccs[0] || null;

    if (!chosenHotel) continue;

    const hotelPricePerNight = Number(chosenHotel.min_price) || 0;
    const totalHotelCost = hotelPricePerNight * actualNights;

    // ถ้าราคาที่พักอย่างเดียวเกินงบ ให้ข้ามแผนนี้ทันที
    if (totalHotelCost > effectiveUserBudget) continue;

    let remainingBudgetForPlan = effectiveUserBudget - totalHotelCost;

    // 2. จัดเส้นทางในแต่ละวันสำหรับแผนนี้
    const usedDestIds = new Set<string | number>();
    const usedRestIds = new Set<string | number>();
    const dailyRoutes: DailyRoute[] = [];
    const planItemsMap = new Map<string, { id: string | number; type: "destination" | "restaurant" | "accommodation" }>();

    planItemsMap.set(`acc-${chosenHotel.id}`, { id: chosenHotel.id, type: "accommodation" });

    let previousAnchor: any = chosenHotel;

    for (let i = 0; i < travelDays.length; i++) {
      const dayCode = travelDays[i];
      const dayLabels: Record<string, string> = {
        mon: "จันทร์", tue: "อังคาร", wed: "พุธ", thu: "พฤหัสบดี",
        fri: "ศุกร์", sat: "เสาร์", sun: "อาทิตย์",
      };

      // กรองสถานที่เปิดวันนี้
      const dayDests = destinations.filter((d) => isPlaceOpenOnDay(d, dayCode));
      const dayRests = restaurants.filter((r) => isPlaceOpenOnDay(r, dayCode));

      // เรียงสถานที่ตามความใกล้ชิดกับที่พักหรือ anchor วันก่อนหน้า
      const anchor = previousAnchor || chosenHotel || dayDests[0];
      let sortedDests = anchor ? sortByProximity(dayDests, anchor) : dayDests;
      let sortedRests = anchor ? sortByProximity(dayRests, anchor) : dayRests;

      // จัดลำดับสถานที่เที่ยว: ให้ความสำคัญกับสถานที่ที่ยังไม่ใช้ และราคาไม่เกินงบที่เหลือ
      sortedDests = [
        ...sortedDests.filter((d) => !usedDestIds.has(d.id) && (Number(d.min_price) || 0) <= remainingBudgetForPlan),
        ...sortedDests.filter((d) => usedDestIds.has(d.id) && (Number(d.min_price) || 0) <= remainingBudgetForPlan),
        ...sortedDests,
      ];
      // ลบรายการซ้ำใน sortedDests
      const seenDestIds = new Set<string | number>();
      sortedDests = sortedDests.filter((d) => {
        if (seenDestIds.has(d.id)) return false;
        seenDestIds.add(d.id);
        return true;
      });

      if (sortedDests[0]) usedDestIds.add(sortedDests[0].id);
      if (sortedDests[1]) usedDestIds.add(sortedDests[1].id);

      // จัดลำดับร้านอาหาร: ให้ความสำคัญกับร้านที่ยังไม่ใช้ และราคาไม่เกินงบที่เหลือ
      sortedRests = [
        ...sortedRests.filter((r) => !usedRestIds.has(r.id) && (Number(r.min_price) || 0) <= remainingBudgetForPlan),
        ...sortedRests.filter((r) => usedRestIds.has(r.id) && (Number(r.min_price) || 0) <= remainingBudgetForPlan),
        ...sortedRests,
      ];
      const seenRestIds = new Set<string | number>();
      sortedRests = sortedRests.filter((r) => {
        if (seenRestIds.has(r.id)) return false;
        seenRestIds.add(r.id);
        return true;
      });

      if (sortedRests[0]) usedRestIds.add(sortedRests[0].id);

      const dailyRoute = buildDailyRoute(
        sortedDests,
        sortedRests,
        [chosenHotel],
        { dayCode, dayLabel: dayLabels[dayCode] || dayCode, dayNumber: i + 1 }
      );

      dailyRoutes.push(dailyRoute);

      // บันทึก items และหักงบประมาณคงเหลือ
      for (const stop of dailyRoute.stops) {
        planItemsMap.set(`${stop.type}-${stop.id}`, { id: stop.id, type: stop.type });
        if (stop.type !== "accommodation") {
          remainingBudgetForPlan -= Number(stop.price || stop.min_price || 0);
        }
      }

      if (dailyRoute.stops[1]) {
        previousAnchor = dailyRoute.stops[1];
      }
    }

    // 3. คำนวณค่าใช้จ่ายและระยะทางรวมจริงทั้งหมด
    let totalActivitiesCost = 0;
    let totalDist = 0;

    for (const dr of dailyRoutes) {
      totalDist += dr.totalDistanceKm;
      for (const stop of dr.stops) {
        if (stop.type !== "accommodation") {
          totalActivitiesCost += Number(stop.price || stop.min_price || 0);
        }
      }
    }

    const totalCost = totalHotelCost + totalActivitiesCost;
    const totalDistanceKm = Math.round(totalDist * 10) / 10;

    // ─── เงื่อนไขบังคับ (HARD CONSTRAINT): totalCost <= userBudget เท่านั้น ───
    // ห้ามมี tolerance หรือ buffer ใดๆ ทั้งสิ้น
    if (totalCost <= effectiveUserBudget) {
      // เลือก cover image จากที่เที่ยวแรกของแผน
      const firstDestStop = dailyRoutes[0]?.stops?.find((s) => s.type === "destination");
      const coverImage = firstDestStop?.image_url || chosenHotel?.images?.[0] || FALLBACK_IMAGES.destination;

      plans.push({
        id: config.id,
        name: config.name,
        theme: config.theme,
        coverImage,
        description: config.description,
        totalCost,
        totalDistanceKm,
        days,
        dailyRoutes,
        items: Array.from(planItemsMap.values()),
      });
    }
  }

  return plans;
}
