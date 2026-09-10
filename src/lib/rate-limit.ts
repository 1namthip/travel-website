// src/lib/rate-limit.ts

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const roleChangeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:role-change",
  analytics: true, // เปิดดู metrics ได้ใน Upstash dashboard
});

export const generalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:general",
  analytics: true,
});

// แชทบอทเปิดให้คนทั่วไปใช้โดยไม่ต้องล็อกอิน จึงจำกัดตาม IP
// 1 คำถามยิง Gemini ~2 ครั้ง (รอบเลือก tool + คำตอบ) ตั้ง 8 ข้อความ/นาที
// พอสำหรับการคุยปกติ แต่กันการยิงรัวจนเบียดโควตา RPM ของ API key
export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 m"),
  prefix: "ratelimit:chat",
  analytics: true,
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});

