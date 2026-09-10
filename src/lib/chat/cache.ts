// src/lib/chat/cache.ts
//
// แคช 3 ชั้นของแชทบอท + ตัวนับโควตา Gemini ต่อวัน ทั้งหมดเก็บบน Upstash Redis
//
//   1. reply cache   — คำตอบทั้งก้อน (reply + places) ต่อบทสนทนาหนึ่ง ๆ
//                      คำถามซ้ำ (โดยเฉพาะปุ่มตัวอย่าง) จะไม่แตะ Gemini เลย
//   2. tool cache    — ผลลัพธ์ search_places / chat_category_summary จาก Supabase
//   3. daily budget  — นับจำนวนครั้งที่ยิง Gemini จริงต่อวัน กันไม่ให้ key เดียว 429
//
// ทุกฟังก์ชัน "ห้าม throw" — ถ้า Redis ล่มให้ทำงานต่อได้เสมือนไม่มีแคช

import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import type { PlaceCard } from "./tools";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedReply {
  reply: string;
  places: PlaceCard[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type BudgetKind = "tool" | "answer";

// ─── Keys / TTL ──────────────────────────────────────────────────────────────

const REPLY_PREFIX = "chat:reply:";
const TOOL_PREFIX = "chat:tool:";
const CATEGORIES_KEY = "chat:categories";
const USAGE_PREFIX = "chat:usage:";

const REPLY_TTL_FIRST_TURN = 60 * 60 * 24; // 24 ชม. สำหรับคำถามแรก (คงที่ที่สุด)
const REPLY_TTL_FOLLOW_UP = 60 * 60; // 1 ชม. สำหรับบทสนทนาที่มีหลาย turn
const TOOL_TTL = 60 * 10; // 10 นาที
const CATEGORIES_TTL = 60 * 60; // 1 ชม.
const USAGE_TTL = 60 * 60 * 48; // 2 วัน (เผื่อ key ค้างข้ามวัน)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashMessages(messages: ChatMessage[]): string {
  const basis = messages
    .map((m) => `${m.role}:${normalize(m.content)}`)
    .join("\n");
  return createHash("sha256").update(basis).digest("hex");
}

/** stringify แบบเรียง key เพื่อให้ args ชุดเดียวกันได้ key เดียวกันเสมอ */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

function hashArgs(args: unknown): string {
  return createHash("sha1").update(stableStringify(args ?? {})).digest("hex");
}

// ─── 1. Reply cache ──────────────────────────────────────────────────────────

export async function getCachedReply(
  messages: ChatMessage[],
): Promise<CachedReply | null> {
  try {
    const hit = await redis.get<CachedReply>(REPLY_PREFIX + hashMessages(messages));
    return hit && typeof hit.reply === "string" ? hit : null;
  } catch {
    return null;
  }
}

export async function setCachedReply(
  messages: ChatMessage[],
  payload: CachedReply,
): Promise<void> {
  if (!payload.reply?.trim()) return;
  const ttl = messages.length <= 1 ? REPLY_TTL_FIRST_TURN : REPLY_TTL_FOLLOW_UP;
  try {
    await redis.set(REPLY_PREFIX + hashMessages(messages), payload, { ex: ttl });
  } catch {
    // เขียนแคชไม่สำเร็จก็ไม่เป็นไร
  }
}

// ─── 2. Tool cache ───────────────────────────────────────────────────────────

export async function getCachedTool<T>(
  name: string,
  args: unknown,
): Promise<T | null> {
  try {
    return (await redis.get<T>(`${TOOL_PREFIX}${name}:${hashArgs(args)}`)) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedTool(
  name: string,
  args: unknown,
  value: unknown,
): Promise<void> {
  try {
    await redis.set(`${TOOL_PREFIX}${name}:${hashArgs(args)}`, value, {
      ex: TOOL_TTL,
    });
  } catch {
    // ไม่เป็นไร
  }
}

export async function getCachedCategories<T>(): Promise<T | null> {
  try {
    return (await redis.get<T>(CATEGORIES_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedCategories(value: unknown): Promise<void> {
  try {
    await redis.set(CATEGORIES_KEY, value, { ex: CATEGORIES_TTL });
  } catch {
    // ไม่เป็นไร
  }
}

// ─── 3. Daily budget ─────────────────────────────────────────────────────────

function budgetFor(kind: BudgetKind): number {
  const raw =
    kind === "answer"
      ? process.env.GEMINI_ANSWER_DAILY_BUDGET
      : process.env.GEMINI_TOOL_DAILY_BUDGET;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return kind === "answer" ? 200 : 800;
}

/**
 * นับ 1 ครั้งว่ากำลังจะยิง Gemini (เรียกก่อนยิงจริง) แล้วคืนยอดสะสมของวันนี้
 * ถ้า Redis ล่มจะคืน 0 = ถือว่ายังไม่เต็มงบ ผู้ใช้ไม่ถูกบล็อก
 */
export async function bumpDailyCall(kind: BudgetKind): Promise<number> {
  try {
    const key = `${USAGE_PREFIX}${kind}:${new Date().toISOString().slice(0, 10)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, USAGE_TTL);
    return count;
  } catch {
    return 0;
  }
}

/** เต็มงบสำหรับ kind นี้แล้วหรือยัง (count ที่ได้จาก bumpDailyCall) */
export function isOverBudget(kind: BudgetKind, count: number): boolean {
  const limit = budgetFor(kind);
  return limit > 0 && count > limit;
}
