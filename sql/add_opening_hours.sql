-- ============================================================================
-- SQL Migration: เพิ่มคอลัมน์ opening_hours (jsonb) และ open_days (text[])
-- สำหรับระบบกำหนดวันและเวลาเปิด-ปิดของสถานที่
--
-- วิธีใช้: คัดลอกคำสั่งทั้งหมดนี้ไปวางใน Supabase Dashboard → SQL Editor แล้วกด RUN
-- สคริปต์นี้เป็น Idempotent (สามารถรันซ้ำได้อย่างปลอดภัย)
-- ============================================================================

-- 1. ตาราง DESTINATIONS
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS opening_hours jsonb
  DEFAULT '{
    "mon": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "tue": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "wed": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "thu": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "fri": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "sat": {"is_open": true, "open_time": "08:00", "close_time": "17:00"},
    "sun": {"is_open": true, "open_time": "08:00", "close_time": "17:00"}
  }'::jsonb;

-- 2. ตาราง RESTAURANTS
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS opening_hours jsonb
  DEFAULT '{
    "mon": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "tue": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "wed": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "thu": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "fri": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "sat": {"is_open": true, "open_time": "10:00", "close_time": "21:00"},
    "sun": {"is_open": true, "open_time": "10:00", "close_time": "21:00"}
  }'::jsonb;

-- 3. ตาราง ACCOMMODATIONS
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS open_days text[]
  DEFAULT '{mon,tue,wed,thu,fri,sat,sun}';

ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS opening_hours jsonb
  DEFAULT '{
    "mon": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "tue": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "wed": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "thu": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "fri": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "sat": {"is_open": true, "open_time": "00:00", "close_time": "23:59"},
    "sun": {"is_open": true, "open_time": "00:00", "close_time": "23:59"}
  }'::jsonb;

-- 4. อัปเดตข้อมูลเดิมที่เป็น NULL ให้มีค่าเริ่มต้น
UPDATE destinations SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
UPDATE restaurants SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
UPDATE accommodations SET open_days = '{mon,tue,wed,thu,fri,sat,sun}' WHERE open_days IS NULL;
