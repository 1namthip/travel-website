// src/app/api/chat/route.ts
//
// API ของแชทบอทผู้ช่วยแนะนำการท่องเที่ยว ทำงานด้วย Google Gemini
//
// รูปแบบการทำงานคือ agentic loop แบบเขียนเอง
//   1. รอบเลือก tool — ใช้โมเดลเล็ก (flash-lite) ถามว่าต้องดึงข้อมูลอะไรบ้าง วนได้สูงสุด 2 รอบ
//   2. รอบตอบ — ใช้โมเดลตอบ (flash) แบบ streaming ส่งข้อความทีละส่วนกลับหน้าเว็บทันที
// ระหว่างทางจะเก็บรายการสถานที่ที่ค้นเจอไว้ ส่งกลับให้หน้าเว็บวาดเป็นการ์ด
//
// การปรับแต่งเพื่อคุมโควตา Gemini (มี key เดียว) และรองรับผู้ใช้หลายคนพร้อมกัน:
//   - แคชคำตอบทั้งก้อนต่อบทสนทนา คำถามซ้ำ (เช่นปุ่มตัวอย่าง) ไม่แตะ Gemini เลย
//   - 1 คำถามทั่วไปยิง Gemini ~2 ครั้ง (เดิม 3-6 ครั้ง)
//   - ตัวนับโควตาต่อวัน เต็มงบแล้วลดชั้นไปใช้ flash-lite ตอบ แล้วค่อยขึ้นข้อความพัก

import { ApiError, GoogleGenAI, type Content, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import { chatRateLimit } from "@/lib/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { CHAT_TOOLS, runTool, type PlaceCard } from "@/lib/chat/tools";
import {
  bumpDailyCall,
  getCachedReply,
  isOverBudget,
  setCachedReply,
} from "@/lib/chat/cache";

// การตอบแบบ streaming ต้องรันบน Node runtime และเผื่อเวลาให้เกินค่า default ของ Vercel
export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Config ──────────────────────────────────────────────────────────────────

/** จำนวนรอบสูงสุดที่ยอมให้โมเดลเรียก tool ก่อนบังคับให้สรุปคำตอบ */
const MAX_TOOL_ROUNDS = 2;

/** ความยาวข้อความสูงสุดต่อครั้ง กันคนวางข้อความยาวผิดปกติเพื่อเผาโควตา */
const MAX_MESSAGE_LENGTH = 1500;

/** เก็บประวัติย้อนหลังเท่านี้ข้อความ เพื่อคุมขนาด context และค่าใช้จ่าย */
const MAX_HISTORY = 20;

// โมเดลเล็กสำหรับรอบเลือก/เรียก tool (เร็วและโควตาเยอะกว่า) — เปลี่ยนผ่าน env ได้
// ใช้ alias "*-latest" เป็นค่าเริ่มต้น กันปัญหารุ่นเก่าถูกปลด ("no longer available to new users")
const TOOL_MODEL = process.env.GEMINI_TOOL_MODEL ?? "gemini-flash-lite-latest";

// โมเดลสำหรับเรียบเรียงคำตอบสุดท้าย — เปลี่ยนผ่าน env ได้
const ANSWER_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

const TOOL_MAX_OUTPUT_TOKENS = 512;
const ANSWER_MAX_OUTPUT_TOKENS = 1024;

/** หน่วงก่อน retry เมื่อโดน 429 (มิลลิวินาที) */
const RETRY_DELAY_MS = 1500;

const EMPTY_REPLY_FALLBACK =
  "ขอโทษด้วย ตอบคำถามนี้ไม่ได้ ลองถามใหม่อีกครั้งได้ไหม";

const MID_STREAM_ERROR =
  "ขอโทษด้วย ระบบผู้ช่วยขัดข้องกลางคัน ลองถามใหม่อีกครั้งนะ";

const BUDGET_EXHAUSTED_REPLY =
  "วันนี้โรมี่คุยกับทุกคนเยอะมากกก ขอพักชาร์จแบตแป๊บนึงนะ 🥺 " +
  "พรุ่งนี้ค่อยมาคุยกันใหม่ หรือใช้ตัวกรองบนหน้าเว็บค้นที่เที่ยว/ที่พัก/ร้านอาหารไปก่อนได้เลย";

// ─── Types ───────────────────────────────────────────────────────────────────

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

type StreamEvent =
  | { type: "places"; places: PlaceCard[] }
  | { type: "delta"; text: string }
  | { type: "error"; error: string }
  | { type: "done" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "anonymous";
}

/** ตรวจว่า payload ที่ส่งมาเป็นบทสนทนาที่ใช้ได้จริงหรือไม่ */
function parseMessages(body: unknown): IncomingMessage[] | null {
  if (typeof body !== "object" || body === null) return null;

  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages: IncomingMessage[] = [];

  for (const item of raw.slice(-MAX_HISTORY)) {
    if (typeof item !== "object" || item === null) return null;

    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;

    const trimmed = content.trim();
    if (!trimmed) continue;

    messages.push({ role, content: trimmed.slice(0, MAX_MESSAGE_LENGTH) });
  }

  // บทสนทนาต้องเริ่มและจบด้วยฝั่งผู้ใช้เสมอ
  if (messages.length === 0) return null;
  if (messages[0].role !== "user") return null;
  if (messages[messages.length - 1].role !== "user") return null;

  return messages;
}

/**
 * ประกอบ system instruction พร้อมบอกวันที่ปัจจุบันให้โมเดลรู้
 * เพื่อให้แนะนำเรื่องฤดูกาลได้ถูกต้อง
 */
function buildSystemInstruction(): string {
  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });

  return `${SYSTEM_PROMPT}

วันนี้คือ ${today} (เวลาประเทศไทย) ใช้ข้อมูลนี้ประกอบเวลาผู้ใช้ถามถึงฤดูกาลหรือช่วงเวลา แต่ถ้าจะตอบเรื่องเทศกาลต้องเรียก get_festival_calendar เสมอ`;
}

/** SSE response ที่รัน callback แล้วปิด stream ให้เองเสมอ */
function streamResponse(
  run: (send: (event: StreamEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await run(send);
      } catch (error) {
        console.error("[chat] stream callback error:", error);
        try {
          send({ type: "error", error: MID_STREAM_ERROR });
        } catch {
          // controller ปิดไปแล้ว
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // กัน reverse proxy / Nginx buffer ทั้งก้อนก่อนส่ง
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ─── Gemini calls with a single 429 retry ───────────────────────────────────

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: GenerateParams,
  canRetry = true,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  try {
    return await ai.models.generateContent(params);
  } catch (error) {
    if (canRetry && error instanceof ApiError && error.status === 429) {
      await sleep(RETRY_DELAY_MS);
      return generateContentWithRetry(ai, params, false);
    }
    throw error;
  }
}

async function startStreamWithRetry(
  ai: GoogleGenAI,
  params: GenerateParams,
  canRetry = true,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContentStream"]>>> {
  try {
    return await ai.models.generateContentStream(params);
  } catch (error) {
    if (canRetry && error instanceof ApiError && error.status === 429) {
      await sleep(RETRY_DELAY_MS);
      return startStreamWithRetry(ai, params, false);
    }
    throw error;
  }
}

// ─── Tool loop ───────────────────────────────────────────────────────────────

interface ToolLoopResult {
  /** ถ้าโมเดลตอบเป็นข้อความจบตั้งแต่ในรอบ tool จะได้ค่านี้ ไม่ต้องเรียกรอบตอบอีก */
  directReply: string | null;
  places: PlaceCard[];
}

/** dedupe การเรียก tool ซ้ำภายในรีเควสต์เดียว (กัน loop วน + ประหยัด round-trip) */
function memoKey(name: string, args: Record<string, unknown>): string {
  const sorted = Object.keys(args)
    .sort()
    .map((k) => `${k}=${JSON.stringify(args[k])}`)
    .join("&");
  return `${name}?${sorted}`;
}

async function runToolLoop(
  ai: GoogleGenAI,
  contents: Content[],
  systemInstruction: string,
): Promise<ToolLoopResult> {
  const collectedPlaces = new Map<string, PlaceCard>();
  const toolMemo = new Map<string, { result: unknown; places: PlaceCard[] }>();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // งบ tool ต่อวันหมด — ไม่ยิงเพิ่ม ตอบด้วยความรู้/ผลที่ได้มาแล้ว
    const toolCount = await bumpDailyCall("tool");
    if (isOverBudget("tool", toolCount)) break;

    const response = await generateContentWithRetry(ai, {
      model: TOOL_MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: CHAT_TOOLS }],
        maxOutputTokens: TOOL_MAX_OUTPUT_TOKENS,
      },
    });

    const functionCalls = response.functionCalls ?? [];

    // ไม่มีการเรียก tool แล้ว = โมเดลตอบคำถามได้เลย ใช้ข้อความนี้เป็นคำตอบ
    if (functionCalls.length === 0) {
      return {
        directReply: response.text?.trim() || null,
        places: [...collectedPlaces.values()],
      };
    }

    // ต้องส่งเทิร์นของโมเดลกลับเข้าไปในประวัติ ไม่งั้นโมเดลจะไม่รู้ว่าตัวเองเรียกอะไรไป
    const modelParts = response.candidates?.[0]?.content?.parts;
    contents.push({
      role: "model",
      parts: modelParts ?? functionCalls.map((call) => ({ functionCall: call })),
    });

    // รัน tool ทั้งหมดพร้อมกัน แล้วส่งผลกลับไปในเทิร์นเดียว
    const responseParts: Part[] = await Promise.all(
      functionCalls.map(async (call) => {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, unknown>;

        const key = memoKey(name, args);
        let outcome = toolMemo.get(key);
        if (!outcome) {
          outcome = await runTool(name, args);
          toolMemo.set(key, outcome);
        }

        for (const place of outcome.places) {
          collectedPlaces.set(`${place.kind}:${place.id}`, place);
        }

        return {
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { output: outcome.result },
          },
        };
      }),
    );

    contents.push({ role: "user", parts: responseParts });
  }

  return { directReply: null, places: [...collectedPlaces.values()] };
}

/**
 * เลือกโมเดลสำหรับรอบตอบตามงบที่เหลือ
 *   - งบ answer ยังไม่หมด → ใช้ ANSWER_MODEL
 *   - งบ answer หมดแต่งบ tool ยังเหลือ → ลดชั้นไปใช้ TOOL_MODEL ตอบ
 *   - หมดทั้งคู่ → exhausted (ให้ตอบข้อความพัก)
 */
async function pickAnswerModel(): Promise<{ model: string; exhausted: boolean }> {
  const answerCount = await bumpDailyCall("answer");
  if (!isOverBudget("answer", answerCount)) {
    return { model: ANSWER_MODEL, exhausted: false };
  }

  const toolCount = await bumpDailyCall("tool");
  if (!isOverBudget("tool", toolCount)) {
    return { model: TOOL_MODEL, exhausted: false };
  }

  return { model: TOOL_MODEL, exhausted: true };
}

// ─── POST /api/chat ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("[chat] ไม่พบ GEMINI_API_KEY ใน environment");
    return NextResponse.json(
      { error: "ระบบผู้ช่วยยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
      { status: 503 },
    );
  }

  // 1. จำกัดจำนวนคำขอตาม IP เพราะแชทเปิดให้ใช้โดยไม่ต้องล็อกอิน
  const { success } = await chatRateLimit.limit(`chat_${getClientIp(req)}`);
  if (!success) {
    return NextResponse.json(
      { error: "คุยเร็วไปนิดนึง รอสักครู่แล้วลองใหม่อีกครั้งนะ" },
      { status: 429 },
    );
  }

  // 2. อ่านและตรวจสอบข้อมูลที่ส่งมา
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const incoming = parseMessages(body);
  if (!incoming) {
    return NextResponse.json({ error: "ไม่พบข้อความที่ส่งมา" }, { status: 400 });
  }

  // 3. คำถามซ้ำ — ตอบจากแคช ไม่แตะ Gemini และไม่นับโควตา
  const cached = await getCachedReply(incoming);
  if (cached) {
    return streamResponse(async (send) => {
      send({ type: "places", places: cached.places });
      send({ type: "delta", text: cached.reply });
      send({ type: "done" });
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Gemini เรียกฝั่งผู้ช่วยว่า "model" ไม่ใช่ "assistant"
  const contents: Content[] = incoming.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const systemInstruction = buildSystemInstruction();

  try {
    // 4. รอบเลือก/เรียก tool (โมเดลเล็ก)
    const { directReply, places } = await runToolLoop(
      ai,
      contents,
      systemInstruction,
    );

    // 4.1 โมเดลตอบจบตั้งแต่ในรอบ tool — ไม่ต้องเรียกรอบตอบอีก (ประหยัดไป 1 ครั้ง)
    if (directReply) {
      await setCachedReply(incoming, { reply: directReply, places });
      return streamResponse(async (send) => {
        send({ type: "places", places });
        send({ type: "delta", text: directReply });
        send({ type: "done" });
      });
    }

    // 5. รอบตอบ — เลือกโมเดลตามงบที่เหลือ
    const { model, exhausted } = await pickAnswerModel();

    if (exhausted) {
      return streamResponse(async (send) => {
        send({ type: "places", places });
        send({ type: "delta", text: BUDGET_EXHAUSTED_REPLY });
        send({ type: "done" });
      });
    }

    // ตัด tools ออกในรอบนี้เพื่อบังคับให้โมเดลตอบเป็นข้อความ
    const iterator = await startStreamWithRetry(ai, {
      model,
      contents,
      config: { systemInstruction, maxOutputTokens: ANSWER_MAX_OUTPUT_TOKENS },
    });

    // 6. สตรีมคำตอบทีละส่วนกลับหน้าเว็บ
    return streamResponse(async (send) => {
      send({ type: "places", places });

      let full = "";
      try {
        for await (const chunk of iterator) {
          const piece = chunk.text;
          if (piece) {
            full += piece;
            send({ type: "delta", text: piece });
          }
        }
      } catch (error) {
        console.error("[chat] error ระหว่างสตรีมคำตอบ:", error);
        send({ type: "error", error: MID_STREAM_ERROR });
        send({ type: "done" });
        return;
      }

      const reply = full.trim();
      if (!reply) {
        send({ type: "delta", text: EMPTY_REPLY_FALLBACK });
      }
      send({ type: "done" });

      if (reply) {
        await setCachedReply(incoming, { reply, places });
      }
    });
  } catch (error) {
    // error ก่อนเริ่มสตรีม — ตอบเป็น JSON พร้อม status code ที่ถูกต้อง
    if (error instanceof ApiError) {
      console.error(`[chat] Gemini API error ${error.status}:`, error.message);

      // 429 คือใช้เกินโควตา ควรบอกผู้ใช้ให้ชัดว่าให้รอ ไม่ใช่ระบบพัง
      if (error.status === 429) {
        return NextResponse.json(
          { error: "ตอนนี้มีคนใช้งานเยอะ รอสักครู่แล้วลองใหม่นะ" },
          { status: 429 },
        );
      }

      // 401/403 = ปัญหาที่ตัว API key เอง (หมดอายุ / โปรเจกต์ถูกจำกัด) ไม่ใช่เรื่องชั่วคราว
      // ต้องให้ผู้ดูแลเปลี่ยน GEMINI_API_KEY เป็นคีย์ถาวร (ขึ้นต้น AIza...) ไม่ใช่ ephemeral token (AQ....)
      if (error.status === 401 || error.status === 403) {
        console.error(
          "[chat] GEMINI_API_KEY ใช้สร้างคำตอบไม่ได้ — ตรวจสอบว่าเป็นคีย์ถาวร (AIza...) และโปรเจกต์เปิดใช้งาน Gemini API",
        );
        return NextResponse.json(
          { error: "ระบบผู้ช่วยยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "ระบบผู้ช่วยขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ" },
        { status: 502 },
      );
    }

    console.error("[chat] ข้อผิดพลาดที่ไม่คาดคิด:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ" },
      { status: 500 },
    );
  }
}
