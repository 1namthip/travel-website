// src/app/api/chat/route.ts
//
// API ของแชทบอทผู้ช่วยแนะนำการท่องเที่ยว ทำงานด้วย Google Gemini
//
// รูปแบบการทำงานคือ agentic loop แบบเขียนเอง
//   1. ส่งบทสนทนาไปให้โมเดล
//   2. ถ้าโมเดลขอเรียก function ก็รัน tool แล้วส่งผลกลับไป
//   3. วนจนกว่าโมเดลจะตอบเป็นข้อความ
// ระหว่างทางจะเก็บรายการสถานที่ที่ค้นเจอไว้ ส่งกลับให้หน้าเว็บวาดเป็นการ์ด

import { ApiError, GoogleGenAI, type Content, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import { chatRateLimit } from "@/lib/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { CHAT_TOOLS, runTool, type PlaceCard } from "@/lib/chat/tools";

// ─── Config ──────────────────────────────────────────────────────────────────

/** จำนวนรอบสูงสุดที่ยอมให้โมเดลเรียก tool ก่อนบังคับให้สรุปคำตอบ */
const MAX_TOOL_ROUNDS = 5;

/** ความยาวข้อความสูงสุดต่อครั้ง กันคนวางข้อความยาวผิดปกติเพื่อเผาโควตา */
const MAX_MESSAGE_LENGTH = 1500;

/** เก็บประวัติย้อนหลังเท่านี้ข้อความ เพื่อคุมขนาด context และค่าใช้จ่าย */
const MAX_HISTORY = 20;

// เปลี่ยนรุ่นโมเดลผ่าน env ได้ เผื่ออยากใช้รุ่นที่ฉลาดกว่าหรือประหยัดกว่า
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

// ─── Types ───────────────────────────────────────────────────────────────────

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  const ai = new GoogleGenAI({ apiKey });

  // Gemini เรียกฝั่งผู้ช่วยว่า "model" ไม่ใช่ "assistant"
  const contents: Content[] = incoming.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const systemInstruction = buildSystemInstruction();

  // เก็บสถานที่ที่ค้นเจอระหว่างทาง ไว้ส่งให้ UI วาดการ์ด (กันซ้ำด้วย key)
  const collectedPlaces = new Map<string, PlaceCard>();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: CHAT_TOOLS }],
          maxOutputTokens: 2048,
        },
      });

      const functionCalls = response.functionCalls ?? [];

      // ไม่มีการเรียก tool แล้ว แปลว่าโมเดลตอบคำถามเสร็จ
      if (functionCalls.length === 0) {
        return NextResponse.json({
          reply:
            response.text?.trim() ||
            "ขอโทษด้วย ตอบคำถามนี้ไม่ได้ ลองถามใหม่อีกครั้งได้ไหม",
          places: [...collectedPlaces.values()],
        });
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
          const { result, places } = await runTool(
            call.name ?? "",
            (call.args ?? {}) as Record<string, unknown>,
          );

          for (const place of places) {
            collectedPlaces.set(`${place.kind}:${place.id}`, place);
          }

          return {
            functionResponse: {
              id: call.id,
              name: call.name,
              response: { output: result },
            },
          };
        }),
      );

      contents.push({ role: "user", parts: responseParts });
    }

    // วนครบจำนวนรอบแล้วโมเดลยังเรียก tool อยู่ ให้บังคับสรุปคำตอบโดยไม่ให้ใช้ tool อีก
    const summary = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction, maxOutputTokens: 2048 },
    });

    return NextResponse.json({
      reply:
        summary.text?.trim() ||
        "ขอโทษด้วย ตอนนี้หาข้อมูลให้ไม่ครบ ลองถามให้เจาะจงขึ้นอีกนิดได้ไหม",
      places: [...collectedPlaces.values()],
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[chat] Gemini API error ${error.status}:`, error.message);

      // 429 คือใช้เกินโควตาฟรี ควรบอกผู้ใช้ให้ชัดว่าให้รอ ไม่ใช่ระบบพัง
      if (error.status === 429) {
        return NextResponse.json(
          { error: "ตอนนี้มีคนใช้งานเยอะ รอสักครู่แล้วลองใหม่นะ" },
          { status: 429 },
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
