-- ============================================================================
-- เพิ่ม column open_days สำหรับระบุวันเปิดให้บริการของสถานที่
-- ค่า default = เปิดทุกวัน (สถานที่เดิมที่ไม่ได้กรอกจะถือว่าเปิดทุกวัน)
--
-- ค่าที่เก็บ: mon, tue, wed, thu, fri, sat, sun
-- ตัวอย่าง: เปิด จันทร์-เสาร์ → '{mon,tue,wed,thu,fri,sat}'
--          เปิดทุกวัน       → '{mon,tue,wed,thu,fri,sat,sun}'
--          เปิด เสาร์-อาทิตย์ → '{sat,sun}'
--
-- วิธีใช้: รัน SQL นี้ใน Supabase Dashboard → SQL Editor
-- ============================================================================

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

-- อัปเดตข้อมูลเดิมที่ยังเป็น NULL ให้เป็นค่า default (เปิดทุกวัน)
UPDATE destinations SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
UPDATE restaurants SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
UPDATE accommodations SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
