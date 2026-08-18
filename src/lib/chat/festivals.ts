// src/lib/chat/festivals.ts
//
// ปฏิทินเทศกาลไทย + เทศกาลประจำจังหวัดนครราชสีมา
//
// ข้อมูลชุดนี้ตั้งใจให้เป็น "ข้อมูลจริงที่คนเขียนไว้" ไม่ใช่ให้ AI เดาเอง
// เพราะโมเดลภาษามักจำวันที่เทศกาลผิด โดยเฉพาะเทศกาลที่อิงปฏิทินจันทรคติ
//
// เทศกาลแบ่งเป็น 2 แบบ
//   - certainty: "exact"  → วันที่ตายตัวทุกปี (เช่น สงกรานต์ 13-15 เม.ย.)
//   - certainty: "approx" → อิงจันทรคติ เปลี่ยนทุกปี เก็บได้แค่ "ช่วงเดือน"
//     ตัวบอทจะถูกสั่งให้พูดว่า "ประมาณ" และแนะนำให้เช็กวันที่แน่นอนอีกครั้ง

export type FestivalCertainty = "exact" | "approx";

export interface Festival {
  name: string;
  /** ข้อความบอกช่วงเวลาแบบที่คนอ่านเข้าใจ */
  when: string;
  /** ขอบเขตช่วงเวลาแบบ [เดือน, วัน] ใช้คำนวณว่าใกล้ถึงหรือยัง */
  start: [month: number, day: number];
  end: [month: number, day: number];
  certainty: FestivalCertainty;
  /** "นครราชสีมา" = งานประจำจังหวัด, "ทั่วประเทศ" = เทศกาลระดับชาติ */
  area: "นครราชสีมา" | "ทั่วประเทศ";
  detail: string;
  /** คำค้นที่ใช้ไปหาสถานที่ในฐานข้อมูลให้เข้ากับเทศกาลนี้ */
  relatedKeywords: string[];
}

export const FESTIVALS: Festival[] = [
  {
    name: "วันขึ้นปีใหม่",
    when: "31 ธ.ค. - 1 ม.ค.",
    start: [12, 31],
    end: [1, 1],
    certainty: "exact",
    area: "ทั่วประเทศ",
    detail:
      "ช่วงเคานต์ดาวน์และทำบุญตักบาตรวันขึ้นปีใหม่ หลายวัดในโคราชจัดสวดมนต์ข้ามปี คนเดินทางกลับบ้านเยอะ ที่พักควรจองล่วงหน้า",
    relatedKeywords: ["วัด", "คาเฟ่"],
  },
  {
    name: "ตรุษจีน",
    when: "ราวปลายเดือน ม.ค. ถึงกลางเดือน ก.พ. (เปลี่ยนทุกปี)",
    start: [1, 20],
    end: [2, 20],
    certainty: "approx",
    area: "ทั่วประเทศ",
    detail:
      "ย่านการค้าและศาลเจ้าในตัวเมืองโคราชจะคึกคักเป็นพิเศษ มีการไหว้เจ้าและอาหารมงคล",
    relatedKeywords: ["ศาลเจ้า", "ตลาด", "อาหารจีน"],
  },
  {
    name: "งานฉลองวันแห่งชัยชนะท้าวสุรนารี (งานย่าโม)",
    when: "23 มีนาคม - 3 เมษายน ของทุกปี",
    start: [3, 23],
    end: [4, 3],
    certainty: "exact",
    area: "นครราชสีมา",
    detail:
      "งานประจำจังหวัดที่ใหญ่ที่สุดของโคราช จัดบริเวณอนุสาวรีย์ท้าวสุรนารี (ย่าโม) และลานอนุสรณ์สถาน มีขบวนแห่ การแสดงแสงสีเสียงเล่าประวัติศาสตร์วีรกรรมทุ่งสัมฤทธิ์ การรำบวงสรวงย่าโม ออกร้านสินค้าโอทอป และงานผ้าไหมโคราช ช่วงนี้ตัวเมืองคนเยอะมากและที่พักเต็มเร็ว",
    relatedKeywords: ["อนุสาวรีย์", "ย่าโม", "ท้าวสุรนารี", "ตลาด"],
  },
  {
    name: "ประเพณีกินเข่าค่ำของดีเมืองสูงเนิน",
    when: "ราวเดือนมีนาคม - เมษายน (อำเภอสูงเนิน)",
    start: [3, 1],
    end: [4, 15],
    certainty: "approx",
    area: "นครราชสีมา",
    detail:
      "ประเพณีท้องถิ่นของอำเภอสูงเนิน จัดบริเวณปราสาทเมืองแขก/ปราสาทเมืองเสมา มีการรับประทานอาหารเย็นแบบพาแลงพื้นบ้าน ชมการแสดงย้อนยุคขอม เหมาะกับสายวัฒนธรรม",
    relatedKeywords: ["ปราสาท", "สูงเนิน", "ประวัติศาสตร์"],
  },
  {
    name: "วันสงกรานต์",
    when: "13 - 15 เมษายน",
    start: [4, 13],
    end: [4, 15],
    certainty: "exact",
    area: "ทั่วประเทศ",
    detail:
      "ปีใหม่ไทย มีเล่นน้ำ รดน้ำดำหัวผู้ใหญ่ ก่อเจดีย์ทราย และสรงน้ำพระตามวัด ในโคราชมีถนนสายน้ำที่ตัวเมือง อากาศร้อนจัด ควรเตรียมกันแดดและเผื่อเวลารถติด",
    relatedKeywords: ["วัด", "น้ำตก", "อ่างเก็บน้ำ"],
  },
  {
    name: "วันวิสาขบูชา",
    when: "วันเพ็ญเดือน 6 ประมาณเดือนพฤษภาคม (เปลี่ยนทุกปี)",
    start: [5, 1],
    end: [6, 5],
    certainty: "approx",
    area: "ทั่วประเทศ",
    detail: "วันสำคัญทางพระพุทธศาสนา มีเวียนเทียนตามวัดในช่วงค่ำ",
    relatedKeywords: ["วัด"],
  },
  {
    name: "เทศกาลผลไม้และของดีอำเภอปากช่อง",
    when: "ราวเดือนมิถุนายน (อำเภอปากช่อง)",
    start: [6, 1],
    end: [6, 30],
    certainty: "approx",
    area: "นครราชสีมา",
    detail:
      "งานประจำปีของอำเภอปากช่อง มีผลไม้ขึ้นชื่ออย่างน้อยหน่า องุ่น และผลผลิตการเกษตร เหมาะกับการเที่ยวต่อเนื่องไปเขาใหญ่",
    relatedKeywords: ["ปากช่อง", "เขาใหญ่", "ไร่องุ่น", "ฟาร์ม"],
  },
  {
    name: "วันอาสาฬหบูชาและวันเข้าพรรษา",
    when: "วันเพ็ญเดือน 8 ประมาณเดือนกรกฎาคม (เปลี่ยนทุกปี)",
    start: [7, 1],
    end: [8, 5],
    certainty: "approx",
    area: "ทั่วประเทศ",
    detail:
      "ช่วงถวายเทียนพรรษาและผ้าอาบน้ำฝน หลายวัดในโคราชจัดขบวนแห่เทียน เป็นช่วงฤดูฝน น้ำตกกำลังสวย",
    relatedKeywords: ["วัด", "น้ำตก"],
  },
  {
    name: "วันแม่แห่งชาติ",
    when: "12 สิงหาคม",
    start: [8, 12],
    end: [8, 12],
    certainty: "exact",
    area: "ทั่วประเทศ",
    detail:
      "วันหยุดยาวที่คนนิยมพาครอบครัวเที่ยว เหมาะกับสถานที่ที่ไปได้ทั้งครอบครัวและผู้สูงอายุ",
    relatedKeywords: ["วัด", "สวน", "ธรรมชาติ"],
  },
  {
    name: "วันออกพรรษาและประเพณีตักบาตรเทโว",
    when: "วันเพ็ญเดือน 11 ประมาณเดือนตุลาคม (เปลี่ยนทุกปี)",
    start: [10, 1],
    end: [10, 31],
    certainty: "approx",
    area: "ทั่วประเทศ",
    detail:
      "มีตักบาตรเทโวโรหณะตามวัดที่มีบันไดหรือเนินเขา อากาศเริ่มเย็นสบาย เป็นช่วงเริ่มต้นฤดูท่องเที่ยว",
    relatedKeywords: ["วัด"],
  },
  {
    name: "เทศกาลเที่ยวพิมาย",
    when: "ราวเดือนพฤศจิกายน (อำเภอพิมาย)",
    start: [11, 1],
    end: [11, 30],
    certainty: "approx",
    area: "นครราชสีมา",
    detail:
      "งานใหญ่ประจำปีที่อุทยานประวัติศาสตร์พิมาย มีการแสดงแสงสีเสียงในปราสาทหินพิมาย ขบวนแห่ประวัติศาสตร์ และการแข่งเรือยาวพิมาย เป็นช่วงที่เหมาะไปพิมายที่สุดของปี",
    relatedKeywords: ["พิมาย", "ปราสาท", "ประวัติศาสตร์"],
  },
  {
    name: "วันลอยกระทง",
    when: "วันเพ็ญเดือน 12 ประมาณเดือนพฤศจิกายน (เปลี่ยนทุกปี)",
    start: [11, 1],
    end: [11, 30],
    certainty: "approx",
    area: "ทั่วประเทศ",
    detail:
      "ลอยกระทงตามแหล่งน้ำ ในโคราชนิยมลอยที่บึงและลำตะคอง อากาศกำลังเย็น เหมาะกับการเดินเล่นกลางคืน",
    relatedKeywords: ["บึง", "อ่างเก็บน้ำ", "ลำตะคอง"],
  },
  {
    name: "ฤดูหนาวและเทศกาลชมดอกไม้",
    when: "ธันวาคม - มกราคม",
    start: [12, 1],
    end: [1, 31],
    certainty: "exact",
    area: "นครราชสีมา",
    detail:
      "ช่วงที่อากาศโคราชเย็นที่สุด เหมาะกับเขาใหญ่ ปากช่อง วังน้ำเขียว ไร่องุ่น และจุดกางเต็นท์ ทุ่งดอกไม้และไร่ต่าง ๆ กำลังสวย ที่พักโซนเขาใหญ่ควรจองล่วงหน้าหลายสัปดาห์",
    relatedKeywords: ["เขาใหญ่", "ปากช่อง", "วังน้ำเขียว", "ไร่", "ภูเขา"],
  },
  {
    name: "วันคริสต์มาสและเทศกาลส่งท้ายปี",
    when: "24 - 31 ธันวาคม",
    start: [12, 24],
    end: [12, 31],
    certainty: "exact",
    area: "ทั่วประเทศ",
    detail:
      "ห้างและคาเฟ่ในตัวเมืองตกแต่งไฟ เหมาะกับการเที่ยวกลางคืนและถ่ายรูป",
    relatedKeywords: ["คาเฟ่", "ตลาด"],
  },
];

/** แปลง [เดือน, วัน] เป็นเลขลำดับวันในปี เพื่อใช้เปรียบเทียบช่วงเวลา */
function toDayIndex(month: number, day: number): number {
  const daysBeforeMonth = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  return daysBeforeMonth[month - 1] + day;
}

/** เช็กว่าวันที่ระบุอยู่ในช่วงของเทศกาลไหม (รองรับช่วงที่คร่อมปี เช่น ธ.ค. - ม.ค.) */
function isWithin(festival: Festival, dayIndex: number): boolean {
  const start = toDayIndex(...festival.start);
  const end = toDayIndex(...festival.end);

  // ช่วงคร่อมสิ้นปี เช่น 31 ธ.ค. - 1 ม.ค.
  if (start > end) return dayIndex >= start || dayIndex <= end;
  return dayIndex >= start && dayIndex <= end;
}

/** ระยะห่างเป็นจำนวนวันจากวันที่ระบุ ไปถึงวันเริ่มเทศกาล (นับข้ามปีได้) */
function daysUntilStart(festival: Festival, dayIndex: number): number {
  const start = toDayIndex(...festival.start);
  const diff = start - dayIndex;
  return diff >= 0 ? diff : diff + 365;
}

export interface FestivalLookupResult {
  /** วันที่ที่ใช้อ้างอิง รูปแบบไทย */
  today: string;
  ongoing: Festival[];
  upcoming: (Festival & { daysAway: number })[];
  note: string;
}

/**
 * ดึงเทศกาลที่กำลังจัดอยู่ และที่กำลังจะถึง โดยอิงวันที่จริงของเซิร์ฟเวอร์
 *
 * @param date วันที่อ้างอิง (ปกติคือวันนี้)
 * @param lookaheadDays มองไปข้างหน้ากี่วัน
 */
export function getFestivalsNear(
  date: Date = new Date(),
  lookaheadDays = 75,
): FestivalLookupResult {
  const dayIndex = toDayIndex(date.getMonth() + 1, date.getDate());

  const ongoing = FESTIVALS.filter((f) => isWithin(f, dayIndex));

  const upcoming = FESTIVALS.filter((f) => !isWithin(f, dayIndex))
    .map((f) => ({ ...f, daysAway: daysUntilStart(f, dayIndex) }))
    .filter((f) => f.daysAway <= lookaheadDays)
    .sort((a, b) => a.daysAway - b.daysAway);

  return {
    today: date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    ongoing,
    upcoming,
    note:
      "เทศกาลที่มี certainty เป็น approx อิงปฏิทินจันทรคติ วันที่เปลี่ยนทุกปี " +
      "ให้บอกผู้ใช้ว่าเป็นช่วงโดยประมาณ และแนะนำให้ตรวจสอบวันที่แน่นอนกับทางจังหวัดอีกครั้ง",
  };
}

/** ดึงเทศกาลทั้งหมดของเดือนที่ระบุ ใช้ตอบคำถามแบบ "เดือนหน้ามีงานอะไร" */
export function getFestivalsByMonth(month: number): Festival[] {
  return FESTIVALS.filter((f) => {
    const startMonth = f.start[0];
    const endMonth = f.end[0];
    if (startMonth > endMonth) return month >= startMonth || month <= endMonth;
    return month >= startMonth && month <= endMonth;
  });
}
