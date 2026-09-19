// src/lib/opening-hours.ts
import type { OpeningHoursMap, DaySchedule } from "@/types/destination";

export interface DayInfo {
  key: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  label: string;
  fullLabel: string;
  shortLabel: string;
}

export const DAYS_CONFIG: DayInfo[] = [
  { key: "mon", label: "จันทร์", fullLabel: "วันจันทร์", shortLabel: "จ." },
  { key: "tue", label: "อังคาร", fullLabel: "วันอังคาร", shortLabel: "อ." },
  { key: "wed", label: "พุธ", fullLabel: "วันพุธ", shortLabel: "พ." },
  { key: "thu", label: "พฤหัสบดี", fullLabel: "วันพฤหัสบดี", shortLabel: "พฤ." },
  { key: "fri", label: "ศุกร์", fullLabel: "วันศุกร์", shortLabel: "ศ." },
  { key: "sat", label: "เสาร์", fullLabel: "วันเสาร์", shortLabel: "ส." },
  { key: "sun", label: "อาทิตย์", fullLabel: "วันอาทิตย์", shortLabel: "อา." },
];

export const DAY_KEY_MAP: Record<number, DayInfo["key"]> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

/**
 * ดึงรหัสวันปัจจุบันตามเวลาประเทศไทย (mon, tue, ..., sun)
 */
export function getTodayDayCode(): DayInfo["key"] {
  const now = new Date();
  // ปรับให้อิงตามเวลาท้องถิ่น
  const day = now.getDay();
  return DAY_KEY_MAP[day] || "mon";
}

/**
 * แปลงข้อมูล opening_hours จาก object หรือ JSON string ให้เป็น OpeningHoursMap อย่างปลอดภัย
 */
export function parseOpeningHours(raw: unknown): OpeningHoursMap | null {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as OpeningHoursMap;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as OpeningHoursMap;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export interface DayScheduleItem {
  key: DayInfo["key"];
  label: string;
  fullLabel: string;
  shortLabel: string;
  isToday: boolean;
  isOpen: boolean;
  is24Hours: boolean;
  openTime: string | null;
  closeTime: string | null;
  timeDisplay: string;
}

export interface PlaceOpeningStatus {
  hasData: boolean;
  isTodayOpen: boolean;
  isOpenNow: boolean;
  todayHoursText: string;
  badgeLabel: string;
  badgeColor: "emerald" | "amber" | "rose" | "neutral";
  badgeClasses: string;
  dotColor: string;
  schedule: DayScheduleItem[];
  openDaysSummary: string;
}

/**
 * คำนวณสถานะเปิด-ปิดของสถานที่และแจกแจงตาราง 7 วัน
 */
export function getPlaceOpeningStatus(place: {
  opening_hours?: unknown;
  opening_hours_raw?: unknown;
  open_days?: string[] | null;
  hours?: string | null;
}): PlaceOpeningStatus {
  const todayCode = getTodayDayCode();
  const parsedMap =
    parseOpeningHours(place?.opening_hours) ||
    parseOpeningHours(place?.opening_hours_raw);
  const openDays = Array.isArray(place?.open_days) ? place.open_days : null;
  const legacyHours =
    typeof place?.opening_hours === "string" && !place.opening_hours.trim().startsWith("{")
      ? place.opening_hours
      : place?.hours || null;

  // ตรวจสอบว่ามีข้อมูลจากระบบแอดมินหรือไม่
  const hasData = Boolean(
    parsedMap ||
    (openDays && openDays.length > 0) ||
    legacyHours
  );

  const schedule: DayScheduleItem[] = DAYS_CONFIG.map((day) => {
    const isToday = day.key === todayCode;
    const sched = parsedMap ? (parsedMap[day.key] ?? parsedMap[day.fullLabel]) : undefined;

    let isOpen = false;
    let is24Hours = false;
    let openTime: string | null = null;
    let closeTime: string | null = null;
    let timeDisplay = "ปิดทำการ";

    if (sched && typeof sched === "object" && typeof sched.is_open === "boolean") {
      isOpen = sched.is_open;
      openTime = sched.open_time || null;
      closeTime = sched.close_time || null;

      if (isOpen) {
        if (openTime === "00:00" && (closeTime === "23:59" || closeTime === "00:00" || !closeTime)) {
          is24Hours = true;
          timeDisplay = "เปิด 24 ชั่วโมง";
        } else if (openTime && closeTime) {
          timeDisplay = `${openTime} - ${closeTime} น.`;
        } else {
          timeDisplay = "เปิดให้บริการ";
        }
      } else {
        timeDisplay = "ปิดทำการ";
      }
    } else if (openDays) {
      isOpen = openDays.includes(day.key);
      timeDisplay = isOpen ? (legacyHours || "08:00 - 17:00 น.") : "ปิดทำการ";
    } else if (legacyHours) {
      isOpen = true;
      timeDisplay = legacyHours;
    } else {
      // Default: เปิดทุกวัน
      isOpen = true;
      timeDisplay = "เปิดให้บริการ";
    }

    return {
      key: day.key,
      label: day.label,
      fullLabel: day.fullLabel,
      shortLabel: day.shortLabel,
      isToday,
      isOpen,
      is24Hours,
      openTime,
      closeTime,
      timeDisplay,
    };
  });

  const todayItem = schedule.find((s) => s.isToday) || schedule[0];
  const isTodayOpen = todayItem.isOpen;

  // เช็คว่า ณ เวลาปัจจุบันเปิดอยู่หรือไม่ (Real-time check)
  let isOpenNow = false;
  if (isTodayOpen) {
    if (todayItem.is24Hours) {
      isOpenNow = true;
    } else if (todayItem.openTime && todayItem.closeTime) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = todayItem.openTime.split(":").map(Number);
      const [closeH, closeM] = todayItem.closeTime.split(":").map(Number);
      const openMinutes = openH * 60 + (openM || 0);
      const closeMinutes = closeH * 60 + (closeM || 0);

      if (closeMinutes > openMinutes) {
        isOpenNow = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
      } else {
        // ข้ามคืน (เช่น 18:00 - 02:00)
        isOpenNow = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
      }
    } else {
      isOpenNow = true;
    }
  }

  // กำหนด Badge Label & Color
  let badgeLabel = "เปิดให้บริการ";
  let badgeColor: "emerald" | "amber" | "rose" | "neutral" = "emerald";

  if (!isTodayOpen) {
    badgeLabel = "ปิดให้บริการวันนี้";
    badgeColor = "rose";
  } else if (todayItem.is24Hours) {
    badgeLabel = "เปิด 24 ชม.";
    badgeColor = "emerald";
  } else if (isOpenNow) {
    badgeLabel = todayItem.openTime && todayItem.closeTime
      ? `เปิดอยู่ • ปิด ${todayItem.closeTime} น.`
      : "เปิดอยู่";
    badgeColor = "emerald";
  } else if (todayItem.openTime && todayItem.closeTime) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayItem.openTime.split(":").map(Number);
    const openMinutes = openH * 60 + (openM || 0);

    if (currentMinutes < openMinutes) {
      badgeLabel = `เปิดเวลา ${todayItem.openTime} น.`;
      badgeColor = "amber";
    } else {
      badgeLabel = "ปิดแล้ววันนี้";
      badgeColor = "rose";
    }
  }

  // สรุปวันเปิดให้บริการ เช่น "เปิดทุกวัน" หรือ "เปิด: จันทร์, อังคาร, พุธ"
  const openCount = schedule.filter((s) => s.isOpen).length;
  let openDaysSummary = "เปิดทุกวัน";

  if (openCount === 0) {
    openDaysSummary = "ปิดทำการชั่วคราว";
  } else if (openCount === 7) {
    openDaysSummary = "เปิดให้บริการทุกวัน (จันทร์ - อาทิตย์)";
  } else {
    const openDayNames = schedule.filter((s) => s.isOpen).map((s) => s.label);
    openDaysSummary = `เปิดบริการ: ${openDayNames.join(", ")}`;
  }

  // กำหนด badgeClasses และ dotColor สำหรับ UI
  const badgeClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
  }[badgeColor];

  const dotColor = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    neutral: "bg-neutral-400",
  }[badgeColor];

  return {
    hasData,
    isTodayOpen,
    isOpenNow,
    todayHoursText: todayItem.timeDisplay,
    badgeLabel,
    badgeColor,
    badgeClasses,
    dotColor,
    schedule,
    openDaysSummary,
  };
}

