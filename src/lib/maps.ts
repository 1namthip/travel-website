// src/lib/maps.ts
//
// ตัวช่วยสร้างลิงก์ Google Maps ให้ทุกหน้ารายละเอียด (ที่เที่ยว / ร้านอาหาร / ที่พัก)
// ใช้วิธีเดียวกันหมด: ค้นด้วย "ชื่อสถานที่" ผ่านหน้า search ของ Google Maps
// (endpoint ทางการ /maps/search/?api=1 เสถียรกว่าแบบเก่า maps.google.com/?q=)

export function mapsSearchUrl(query: string | null | undefined): string {
  const q = (query ?? "").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
