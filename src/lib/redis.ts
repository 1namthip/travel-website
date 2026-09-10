// src/lib/redis.ts
//
// Upstash Redis client ที่แชร์กันทั้งโปรเจกต์ (rate limit, chat cache, ตัวนับโควตา)
// รวมไว้ที่เดียวเพื่อไม่ให้เปิดหลาย connection โดยไม่จำเป็น

import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
