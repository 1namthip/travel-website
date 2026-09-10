-- sql/chat_search_optimization.sql
--
-- ปรับ query ของแชทบอท (/api/chat) ให้เร็วขึ้น
--   1. เปิด pg_trgm + สร้าง GIN trigram index ให้ `ilike '%คำค้น%'` ใช้ index ได้
--      (เดิมเป็น sequential scan ทั้งตารางทุกครั้งที่บอทเรียก search_places)
--   2. btree index บน min_price สำหรับตัวกรองงบประมาณ
--   3. RPC chat_category_summary() รวมการนับหมวดหมู่ + ช่วงราคาของ 3 ตาราง
--      ให้จบใน query เดียว แทนการดึงทุกแถวมานับใน JavaScript
--
-- ไฟล์นี้รันซ้ำได้ (idempotent) — เอาไปวางใน Supabase Dashboard > SQL Editor แล้ว Run
-- ต้องรันด้วยสิทธิ์เจ้าของโปรเจกต์ (service role / dashboard) เพราะมีการสร้าง extension

-- ─── 1. Extension ────────────────────────────────────────────────────────────
create extension if not exists pg_trgm;

-- ─── 2. GIN trigram index สำหรับคอลัมน์ที่ search_places ใช้ค้นจริง ──────────
-- destinations: ค้นใน name, description
create index if not exists idx_destinations_name_trgm
  on public.destinations using gin (name gin_trgm_ops);
create index if not exists idx_destinations_description_trgm
  on public.destinations using gin (description gin_trgm_ops);

-- restaurants: ค้นใน name, description, location
create index if not exists idx_restaurants_name_trgm
  on public.restaurants using gin (name gin_trgm_ops);
create index if not exists idx_restaurants_description_trgm
  on public.restaurants using gin (description gin_trgm_ops);
create index if not exists idx_restaurants_location_trgm
  on public.restaurants using gin (location gin_trgm_ops);

-- accommodations: ค้นใน name, description, address
create index if not exists idx_accommodations_name_trgm
  on public.accommodations using gin (name gin_trgm_ops);
create index if not exists idx_accommodations_description_trgm
  on public.accommodations using gin (description gin_trgm_ops);
create index if not exists idx_accommodations_address_trgm
  on public.accommodations using gin (address gin_trgm_ops);

-- ─── 3. btree index สำหรับตัวกรองงบ (.lte / .gte min_price) ──────────────────
create index if not exists idx_destinations_min_price
  on public.destinations (min_price);
create index if not exists idx_restaurants_min_price
  on public.restaurants (min_price);
create index if not exists idx_accommodations_min_price
  on public.accommodations (min_price);

-- ─── 4. RPC สรุปหมวดหมู่ + ช่วงราคา ของทั้ง 3 ตารางใน query เดียว ────────────
-- คืน jsonb array เช่น
-- [
--   { "kind":"destination", "total":42,
--     "categories":[{"name":"ธรรมชาติ","count":18}, ...],
--     "priceRange":{"lowest":0,"highest":500,"unit":"บาท"} },
--   ...
-- ]
create or replace function public.chat_category_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with rows as (
    select 'destination'::text as kind,
           coalesce(nullif(btrim(category), ''), 'ไม่ระบุ') as category,
           min_price, max_price
    from public.destinations
    union all
    select 'restaurant'::text,
           coalesce(nullif(btrim(category), ''), 'ไม่ระบุ'),
           min_price, max_price
    from public.restaurants
    union all
    select 'accommodation'::text,
           coalesce(nullif(btrim(category), ''), 'ไม่ระบุ'),
           min_price, max_price
    from public.accommodations
  ),
  per_category as (
    select kind, category,
           count(*)::int as cnt,
           min(min_price) as lo,
           max(max_price) as hi
    from rows
    group by kind, category
  ),
  per_kind as (
    select kind,
           sum(cnt)::int as total,
           jsonb_agg(
             jsonb_build_object('name', category, 'count', cnt)
             order by cnt desc, category
           ) as categories,
           min(lo) as lowest,
           max(hi) as highest
    from per_category
    group by kind
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', kind,
        'total', total,
        'categories', categories,
        'priceRange',
          case when lowest is null then null
          else jsonb_build_object('lowest', lowest, 'highest', highest, 'unit', 'บาท')
          end
      )
      order by kind
    ),
    '[]'::jsonb
  )
  from per_kind;
$$;

grant execute on function public.chat_category_summary() to service_role;

-- ─── ตรวจผล ────────────────────────────────────────────────────────────────
-- select public.chat_category_summary();
-- explain analyze
--   select id, name from public.destinations
--   where name ilike '%น้ำตก%' or description ilike '%น้ำตก%';
--   -> ควรเห็น "Bitmap Index Scan on idx_destinations_*_trgm" ไม่ใช่ "Seq Scan"
