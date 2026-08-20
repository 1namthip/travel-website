# PROJECT.md — เที่ยวตามงบโคราช (travel-website)

เอกสารสรุปโครงสร้างและการทำงานของโปรเจกต์ สำหรับผู้พัฒนา/ผู้ตรวจงาน

---

## 1. ภาพรวม

เว็บแอปแนะนำสถานที่ท่องเที่ยว ร้านอาหาร และที่พัก ในจังหวัดนครราชสีมา (โคราช)
จุดขายหลักคือ **ตัววางแผนทริปตามงบประมาณ (Budget Trip Planner)** ที่ให้ผู้ใช้กรอกงบ
แล้วระบบสุ่ม/คัดรายการที่อยู่ในงบมาให้เลือกจัดเป็นทริป และบันทึกเก็บไว้ได้

- Live demo: https://travel-website-delta-puce.vercel.app
- Figma: https://www.figma.com/design/3gg5WPPZOZh214V6yLiGbf/Untitled?node-id=6-36
- ภาษา UI: ไทยทั้งหมด (`<html lang="th">`, ฟอนต์ `Prompt` จาก next/font)

## 2. Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline`) |
| Database / Auth / Storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |
| แชทบอท AI | Google Gemini ผ่าน `@google/genai` (function calling) |
| Animation | framer-motion (มาผ่านแพ็กเกจ `motion`) |
| Icons | lucide-react |
| Toast | react-hot-toast |
| Deploy | Vercel |

> ⚠️ **AGENTS.md เตือนไว้ว่า** Next.js เวอร์ชันนี้มี breaking changes จากที่เอกสาร/ความรู้ทั่วไปรู้จัก
> ก่อนเขียนโค้ดใหม่ให้อ่านคู่มือใน `node_modules/next/dist/docs/` ก่อนเสมอ

## 3. เริ่มต้นใช้งาน

```bash
npm install
npm run dev
```

สคริปต์อื่น: `npm run build`, `npm run start`, `npm run lint`

### Environment variables (`.env.local`)

| ตัวแปร | ใช้ที่ไหน |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ทุกที่ (client / server / admin) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server client (ตรวจ session) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabaseAdmin.ts` เท่านั้น — **ห้ามหลุดไปฝั่ง client** |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | `lib/rate-limit.ts` |
| `SUPABASE_WEBHOOK_SECRET` | `api/webhooks/supabase` (ดูข้อ 10 — ปัจจุบันยังไม่มีในไฟล์ env) |
| `GEMINI_API_KEY` | แชทบอทผู้ช่วยท่องเที่ยว (`api/chat`) — **ต้องใส่เอง** ไม่งั้นแชทจะขึ้น 503 ขอฟรีได้ที่ Google AI Studio |
| `GEMINI_MODEL` | ไม่บังคับ เปลี่ยนรุ่นโมเดล ค่าเริ่มต้นคือ `gemini-3.6-flash` |
| `NEXT_PUBLIC_CLERK_*`, `CLERK_*` | ตกค้างจากตอนใช้ Clerk — โค้ดปัจจุบันไม่ใช้แล้ว |

`.env*` ถูก ignore ใน git แล้ว (ยืนยันว่าไม่มีไฟล์ env ถูก track)

## 4. โครงสร้างไดเรกทอรี

```
src/
├── actions/              # Server Actions
│   ├── auth.ts           # สมัคร / ล็อกอิน / ยืนยัน OTP + สร้าง SSR client
│   └── users.ts          # จัดการผู้ใช้ฝั่งแอดมิน + อัปเดตสถานะออนไลน์
├── app/
│   ├── layout.tsx        # root layout (ฟอนต์ + Toaster)
│   ├── page.tsx          # หน้าแรก (guest)
│   ├── dashboard/        # หน้าแรกของผู้ใช้ที่ล็อกอินแล้ว
│   ├── destinations/     # รายการ + รายละเอียดสถานที่ท่องเที่ยว
│   ├── restaurant/       # รายการ + รายละเอียดร้านอาหาร
│   ├── accommodations/   # รายการ + รายละเอียดที่พัก
│   ├── trips/            # ทริปที่บันทึกไว้ของผู้ใช้
│   ├── sign-in/ sign-up/ # หน้า auth (page = server, *Client.tsx = client)
│   ├── auth/callback/    # แลก OAuth code เป็น session
│   ├── auth-redirect/    # หน้าคั่นเช็ค role แล้วส่งต่อ
│   ├── admin/            # โซนแอดมิน (มี layout ตรวจสิทธิ์ของตัวเอง)
│   └── api/              # Route Handlers ทั้งหมด
├── component/            # UI components (สังเกต: ชื่อโฟลเดอร์เอกพจน์)
│   ├── Admin/Sidebar.tsx
│   ├── User/{Navbar,DestinationList,DestinationCard,CategorySection}.tsx
│   └── BudgetTripPlanner.tsx  ← ฟีเจอร์หลัก (~1,350 บรรทัด)
├── lib/
│   ├── supabaseClient.ts # createBrowserClient (anon key)
│   ├── supabaseAdmin.ts  # service-role client (server เท่านั้น)
│   └── rate-limit.ts     # 3 นโยบาย rate limit
├── types/                # Destination interface, Roles type
└── middleware.ts         # ยาม (guard) เส้นทางตาม role
```

## 5. แผนผังหน้าเว็บ (Routes)

### ฝั่งผู้ใช้

| Path | คำอธิบาย |
|---|---|
| `/` | หน้าแรกสำหรับผู้ยังไม่ล็อกอิน (Hero + Budget Planner แบบจำกัด) |
| `/dashboard` | หน้าแรกหลังล็อกอิน (Hero + หมวดหมู่ + Budget Planner เต็มรูปแบบ) |
| `/destinations`, `/destinations/[id]` | รายการ/รายละเอียดสถานที่ + รีวิว |
| `/restaurant`, `/restaurant/[id]` | รายการ/รายละเอียดร้านอาหาร + รีวิว |
| `/accommodations`, `/accommodations/[id]` | รายการ/รายละเอียดที่พัก + รีวิว |
| `/trips` | ทริปที่บันทึกไว้ (แก้ชื่อ / ลบรายการ / ลบทริป) |
| `/sign-in`, `/sign-up` | ล็อกอิน/สมัคร (อีเมล+รหัสผ่าน + OTP, และ Google OAuth) |

### ฝั่งแอดมิน

`/admin/*` ป้องกันทั้งใน middleware และ `admin/layout.tsx`:
`/admin/dashboard` (สถิติ) · `/admin/destinations` · `/admin/food` · `/admin/accomodations` · `/admin/reviews` · `/admin/users`

## 6. API Endpoints

| Endpoint | Method | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| `/api/destinations` | GET | public | join `reviews` แล้วคำนวณ `rating.avg/count` ให้เลย (แก้ N+1); กรองด้วย `minBudget`/`maxBudget` เทียบกับ `min_price` |
| `/api/destinations` | POST | admin | ตรวจ role จากตาราง `profiles` |
| `/api/destinations/[id]` | GET / PUT / DELETE | public / admin / admin | |
| `/api/restaurants` | GET / POST | public / ผู้ใช้ที่ล็อกอิน | GET รองรับ `q` (ilike ชื่อ+รายละเอียด+ที่ตั้ง) และ `category` |
| `/api/restaurants/[id]` | GET / PUT / DELETE | — | DELETE ลบไฟล์รูปใน storage ด้วย |
| `/api/accomodations` | GET / POST | public / ผู้ใช้ที่ล็อกอิน | สังเกตสะกด `accomodations` (m ตัวเดียว) ต่างจากหน้าเว็บ `/accommodations` |
| `/api/accomodations/[id]` | GET / PUT / DELETE | — | |
| `/api/categories` | GET | public | นับจำนวนต่อหมวด แล้วผูก emoji ไอคอนแบบ hard-code 6 หมวด |
| `/api/reviews` | GET / POST / PUT / DELETE | public / ล็อกอิน / เจ้าของหรือแอดมิน | POST ต้องส่ง target id มาเพียง 1 ใน 3 ชนิด |
| `/api/trips` | GET | เจ้าของ | คืนทริป + รายการในทริปพร้อมรายละเอียด |
| `/api/trips/generate` | POST | public | หัวใจของ Budget Planner (ดูข้อ 8) |
| `/api/trips/save` | POST | ล็อกอิน | บันทึกหัวทริป + `trip_items` |
| `/api/trips/[id]` | PATCH / DELETE | เจ้าของ (`verifyOwnership`) | |
| `/api/upload` | POST | **ไม่มีการตรวจสิทธิ์** | อัปโหลดเข้า storage bucket `Images` |
| `/api/admin/stats` | GET | admin | ยอดรวม 4 ตาราง + คะแนนเฉลี่ย + รีวิวล่าสุด 5 รายการ (ยิงขนานด้วย `Promise.all`) |
| `/api/admin/destinations` | GET | admin | ดึงผ่าน anon client (พึ่ง RLS) ต่างจาก route อื่นที่ใช้ service role |
| `/api/set-role` | POST | admin | เปลี่ยน role ใน `app_metadata`, กันลดสิทธิ์ตัวเอง, rate limit 5 ครั้ง/นาที |
| `/api/webhooks/supabase` | POST | Bearer secret | ตั้ง role อัตโนมัติตอนสร้าง user ใหม่ |
| `/api/chat` | POST | public (rate limit ตาม IP 12 ครั้ง/นาที) | แชทบอทผู้ช่วยท่องเที่ยว ดูข้อ 8.1 |

## 7. ฐานข้อมูลและ Storage (Supabase)

ตารางที่โค้ดอ้างถึง:

- `profiles` — `id` (= auth user id), `role` (`admin` | `user`), `last_active_at`
- `destinations` — `name, description, category, image_url, min_price, max_price, created_at, updated_at, updated_by`
- `restaurants` — `name, description, image_url, location, category`
- `accommodations` — `name, description, address, min_price, max_price, price_range, category, contact_phone, contact_line, contact_facebook, images[], created_by`
- `reviews` — `rating, comment, created_by` + FK อย่างใดอย่างหนึ่งใน `destination_id` / `restaurant_id` / `accommodation_id`
- `trips` — `user_id, name, total_budget, created_at`
- `trip_items` — `trip_id, item_id, item_type` (`destination` | `restaurant` | `accommodation`)

Storage bucket: **`Images`** (public) — ใช้กับ `/api/upload` และหน้าแอดมิน

รูปจากภายนอกที่อนุญาตใน `next.config.ts`: `images.unsplash.com`, `salehere.co.th`,
`zfwxldzntvjrfkxevuor.supabase.co/storage/v1/object/public/**`, `lh3.googleusercontent.com`

## 8. ฟีเจอร์หลัก: Budget Trip Planner

ไฟล์: `src/component/BudgetTripPlanner.tsx` + `src/app/api/trips/generate/route.ts`

1. ผู้ใช้เลือกโหมด
   - **total** — กรอกงบรวมก้อนเดียว ระบบแบ่งให้อัตโนมัติ **ที่พัก 40% / อาหาร 30% / ที่เที่ยว 30%**
   - **custom** — กรอกงบแยก 3 หมวดเอง
2. `POST /api/trips/generate` ดึงข้อมูลทั้ง 3 ตารางแบบขนาน
   - ดึงรายการที่ `min_price <= งบของหมวดนั้น` (limit 15)
   - ถ้าได้ไม่ถึง 5 รายการ จะ **fallback** ไปดึงรายการที่ถูกที่สุดมาเติม (กันหน้าจอว่าง)
   - สุ่มสลับ (Fisher–Yates) แล้วตัดเหลือหมวดละ 5 รายการ
3. ผู้ใช้กดเลือกรายการทีละใบ — มีแถบงบ (BudgetBar) แสดงยอดคงเหลือ และ modal เตือนเมื่อเกินงบ
4. กด "บันทึกทริป" → ถ้ายังไม่ล็อกอินจะขึ้น `LoginPromptModal`; ถ้าล็อกอินแล้วจะยิง
   `POST /api/trips/save` แล้วไปดูต่อได้ที่หน้า `/trips`

## 8.1 แชทบอทผู้ช่วยท่องเที่ยว "TripBuddy ♡"

ปุ่มลอยมุมขวาล่างของทุกหน้า (ซ่อนในหน้า `/admin`, `/sign-in`, `/sign-up`, `/auth-redirect`)

**ไฟล์ที่เกี่ยวข้อง**

| ไฟล์ | หน้าที่ |
|---|---|
| `src/component/ChatWidget.tsx` | UI ปุ่มลอย หน้าต่างแชท คำถามตัวอย่าง และการ์ดสถานที่ |
| `src/app/api/chat/route.ts` | agentic loop เรียก Gemini วน function call สูงสุด 5 รอบ |
| `src/lib/chat/prompt.ts` | system prompt กำหนดบทบาทและกฎห้ามมั่วข้อมูล |
| `src/lib/chat/tools.ts` | นิยาม tool 3 ตัว และโค้ดที่ไปดึงข้อมูลจริงจาก Supabase |
| `src/lib/chat/knowledge.ts` | ความรู้เรื่องโคราชที่ฐานข้อมูลไม่มี (โซนอำเภอ การเดินทาง อาหาร ฤดูกาล) + FAQ วิธีใช้เว็บ |
| `src/lib/chat/festivals.ts` | ปฏิทินเทศกาลไทยและงานประจำจังหวัด เขียนเป็นข้อมูลจริง ไม่ให้โมเดลเดา |

**Tool ที่บอทเรียกได้**

| Tool | ทำอะไร |
|---|---|
| `search_places` | ค้น `destinations` / `restaurants` / `accommodations` ด้วย keyword, หมวดหมู่ และงบ (กรองจาก `min_price`) |
| `list_available_categories` | ดูหมวดหมู่และช่วงราคาที่มีจริง กันโมเดลกรองด้วยค่าที่ไม่มีอยู่ |
| `get_festival_calendar` | ดูเทศกาลที่กำลังจัดและที่ใกล้ถึง อิงวันที่จริงของเซิร์ฟเวอร์ |

**หลักการออกแบบที่สำคัญ**

- ทุกชื่อสถานที่ที่บอทเอ่ยต้องมาจาก `search_places` เท่านั้น ห้ามแต่งเอง
  และวันที่เทศกาลต้องมาจาก `get_festival_calendar` เพราะโมเดลมักจำวันที่จันทรคติผิด
- เทศกาลที่อิงจันทรคติถูกทำเครื่องหมาย `certainty: "approx"` บอทจะบอกว่าเป็นช่วงโดยประมาณ
- ผลลัพธ์จาก `search_places` ถูกส่งกลับไปให้ UI วาดเป็นการ์ดพร้อมรูปและลิงก์ด้วย
- system prompt ก้อนใหญ่ถูกทำ prompt caching ไว้ ส่วนวันที่ปัจจุบันแยกเป็นบล็อกหลังจุดแคช
  เพื่อไม่ให้ค่าที่เปลี่ยนทุกวันทำให้แคชพัง
- หมวดหมู่ที่เที่ยวในฐานข้อมูลมีแค่ 5 แบบ คำถามอย่าง "พิพิธภัณฑ์" หรือ "ปราสาท"
  จึงถูกออกแบบให้ค้นด้วย keyword ในชื่อและคำอธิบายแทนการกรองด้วย category

**ข้อจำกัดที่บอทถูกสั่งให้บอกตามตรง**

- ไม่มีพิกัด lat/lng ในฐานข้อมูล จึงคำนวณระยะทางและเวลาเดินทางแม่นยำไม่ได้
  ตอบได้แค่ค่าประมาณจากความรู้เรื่องโซนอำเภอใน `knowledge.ts`
- ไม่มีฟิลด์เวลาเปิด-ปิดแยก บางแห่งมีเขียนอยู่ในคำอธิบายเท่านั้น
- ไม่มีข้อมูลสภาพอากาศเรียลไทม์ ถ้าผู้ใช้บอกว่าฝนตกบอทจะเชื่อตามนั้นแล้วแนะนำที่ในร่ม

## 9. Auth และการจัดการสิทธิ์

**วิธีล็อกอิน:** อีเมล+รหัสผ่านพร้อมยืนยัน OTP 6 หลัก (`AuthScreen.tsx`) และ Google OAuth
(`signInWithOAuth` → `/auth/callback` → `exchangeCodeForSession` → `/dashboard`)

**ชั้นการป้องกัน 3 ชั้น**

1. `src/middleware.ts` — ทำงานกับ `/`, `/sign-in`, `/sign-up`, `/dashboard/*`, `/admin/*`
   - ใช้ `getUser()` (ไม่ใช่ `getSession()`) เพื่อให้ตรวจ token กับเซิร์ฟเวอร์จริง
   - ล็อกอินแล้วเข้า `/`, `/sign-in`, `/sign-up` → เด้งไป dashboard ตาม role
   - ยังไม่ล็อกอินแล้วเข้า `/dashboard`, `/admin` → เด้งไป `/sign-in` พร้อม `redirect_url`
   - user ธรรมดาเข้า `/admin/*` → เด้งกลับ `/dashboard`; แอดมินเข้า `/dashboard` → เด้งไป `/admin/dashboard`
2. `src/app/admin/layout.tsx` — ตรวจซ้ำฝั่ง server (zero-trust) ก่อน render โซนแอดมิน
3. API route แต่ละตัว — ตรวจ session + role + rate limit ก่อนแตะข้อมูล

**สถานะออนไลน์:** `OnlineTracker` (mount ใน admin layout) เรียก server action `updateOnlineStatus()`
ทุก 3 นาที เขียน `profiles.last_active_at`; หน้า `/admin/users` ถือว่า active ภายใน 30 นาที = ออนไลน์

**Rate limit (`lib/rate-limit.ts`, sliding window):**
`roleChangeRateLimit` 5/นาที · `generalApiRateLimit` 30/นาที · `authRateLimit` 5/15 นาที

## 10. ข้อสังเกต / จุดที่ควรแก้

เรียงตามความสำคัญ:

1. **`/api/upload` ไม่ตรวจสิทธิ์เลย** — ใครก็ยิงอัปโหลดไฟล์เข้า bucket `Images` ได้ ทั้งไม่จำกัดชนิดและขนาดไฟล์
2. **แหล่งเก็บ role ไม่ตรงกัน** — middleware / admin layout / API ส่วนใหญ่อ่านจากตาราง `profiles`
   แต่ `/api/set-role` และ webhook เขียน/อ่านจาก `app_metadata` และหน้า `/auth-redirect` ก็อ่าน `app_metadata`
   ทำให้เปลี่ยน role ผ่าน `/api/set-role` แล้ว middleware อาจยังไม่เห็นผล ควรเลือกใช้ที่เดียว
3. **`SUPABASE_WEBHOOK_SECRET` ยังไม่มีใน `.env.local`** (มีแต่ `CLERK_WEBHOOK_SECRET` ที่ตกค้าง)
   → `/api/webhooks/supabase` จะ throw ทันทีที่ถูกเรียก
4. **`authRateLimit` ใน `actions/auth.ts` ใช้ค่า `ip = "client-ip"` แบบ hard-code**
   ทำให้ทุกคนใช้โควตาก้อนเดียวกัน (โค้ดคอมเมนต์ไว้แล้วว่าควรอ่านจาก `x-forwarded-for`)
5. **`framer-motion` ไม่ได้ประกาศใน `package.json`** — โค้ด 20 ไฟล์ import ตรงจาก `framer-motion`
   แต่ dependency ที่ประกาศไว้คือ `motion` (ใช้ได้เพราะ npm hoisting เท่านั้น เสี่ยงพังเมื่อ lockfile เปลี่ยน)
6. **`POST /api/restaurants` และ `/api/accomodations` เปิดให้ผู้ใช้ทั่วไปที่ล็อกอินสร้างข้อมูลได้**
   ต่างจาก `/api/destinations` ที่จำกัดเฉพาะแอดมิน — ควรตัดสินใจว่าตั้งใจหรือไม่
7. **พารามิเตอร์ `q` ใน `/api/restaurants` ถูกยัดลง `.or()` ตรง ๆ** ควร escape `%`, `,` และ `)` ก่อน
8. **`getSessionUser` ถูกคัดลอกซ้ำในเกือบทุก route** และยัง `export` ออกมาจาก route file
   ควรย้ายไปรวมที่ `src/lib/` เป็น helper เดียว
9. โค้ดยังมี `console.log` เพื่อ debug จำนวนมาก โดยเฉพาะ `/auth-redirect` ที่ log ข้อมูล user ทั้งก้อน
10. สะกดไม่ตรงกันระหว่าง `accomodations` (API/admin) กับ `accommodations` (หน้าเว็บ/ตาราง DB)
    และโฟลเดอร์ `src/component/` (ควรเป็น `components/` ตามธรรมเนียม)
11. `.clerk/` และตัวแปร env ของ Clerk ยังค้างอยู่ทั้งที่ย้ายมาใช้ Supabase Auth แล้ว — ลบได้
12. อีเมลแอดมิน hard-code ใน `/api/webhooks/supabase` (`admin@example.com`, `boss@example.com`)
    และใน `/auth-redirect` — ควรย้ายไปเป็น env var
13. ไฟล์คอมโพเนนต์ใหญ่มาก (`BudgetTripPlanner.tsx` 1,358 บรรทัด, `admin/destinations/page.tsx` 1,325 บรรทัด)
    ควรแยกย่อยเพื่อให้ดูแลง่ายขึ้น
14. โปรเจกต์ยังไม่มีเทสต์ และไม่มีสคริปต์ typecheck แยก (`tsc --noEmit`)
