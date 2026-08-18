// src/lib/rate-limit.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
// ตั้งไว้ 12 ข้อความต่อนาที พอสำหรับการคุยปกติ แต่กันการยิงรัวเพื่อเผาโควตา API
export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(12, "1 m"),
  prefix: "ratelimit:chat",
  analytics: true,
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});

