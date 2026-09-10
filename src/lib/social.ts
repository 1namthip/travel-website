// src/lib/social.ts
//
// ค่า contact_facebook / contact_line ในฐานข้อมูลไม่สม่ำเสมอมาก
//   - บางแถวเป็น URL เต็ม
//   - บางแถวเป็นแค่ชื่อเพจ ("AisanA Hotel Korat")
//   - บางแถวเป็น @handle ของ LINE Official Account ("@aisanahotel")
//   - บางแถวเป็น id เปล่า ("grandever9") หรือแม้แต่เบอร์โทร ("083...") ที่กรอกผิดช่อง
//   - บางแถวเป็น placeholder "-" หรือค่าว่าง
// ถ้าเอาค่าดิบไปใส่ href ตรง ๆ เบราว์เซอร์จะตีความเป็นลิงก์สัมพัทธ์ (พาไปหน้า 400)
// หรือได้ลิงก์ LINE ที่สแกน QR แล้ว error — helper กลุ่มนี้แปลงให้เป็น URL ที่เปิดได้จริงเสมอ

/** ค่าที่ถือว่า "ไม่มีข้อมูล" */
function isBlank(v: string): boolean {
  return v === "" || v === "-" || v === "—" || v === "–" || v.toLowerCase() === "n/a";
}

/** แปลงค่า contact_facebook เป็น URL ที่เปิดได้จริง (คืน null ถ้าไม่มี) */
export function facebookUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (isBlank(v)) return null;

  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?(facebook\.com|fb\.com|fb\.me|m\.me)\//i.test(v)) return `https://${v}`;
  if (v.startsWith("@")) return `https://www.facebook.com/${v.slice(1).trim()}`;

  // เหลือกรณีเป็นชื่อเพจล้วน ๆ → ส่งไปหน้าค้นหาของ Facebook (เจอเพจแน่นอน)
  return `https://www.facebook.com/search/top?q=${encodeURIComponent(v)}`;
}

/** แปลงค่า contact_line เป็น URL ที่เปิดได้จริง (คืน null ถ้าไม่มีหรือไม่ใช่ LINE ID) */
export function lineUrl(raw: string | null | undefined): string | null {
  let v = (raw ?? "").trim();
  if (isBlank(v)) return null;

  if (/^https?:\/\//i.test(v)) return v;

  // ค่าที่เป็นเบอร์โทร/ตัวเลขล้วน = กรอกผิดช่อง ไม่สร้างลิงก์ LINE ที่พังดีกว่า
  if (/^[\d\s()+.-]+$/.test(v)) return null;

  // ตัดเอาเฉพาะ token แรก แล้วเลาะ @ / ~ นำหน้าออก
  v = v.split(/\s+/)[0].replace(/^[@~]+/, "");
  if (!v) return null;

  // หน้าเพจ Official Account เปิดได้ทั้งบนมือถือและเดสก์ท็อป และมีปุ่มเพิ่มเพื่อนให้
  return `https://page.line.me/${encodeURIComponent(v)}`;
}
