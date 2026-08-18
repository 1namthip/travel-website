"use client";

// src/component/ChatWidget.tsx
//
// ผู้ช่วยแนะนำการท่องเที่ยว แสดงเป็นปุ่มลอยมุมขวาล่างของทุกหน้า
// กดแล้วเปิดหน้าต่างแชท คุยกับ /api/chat และแสดงการ์ดสถานที่ที่บอทค้นเจอ

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  MapPin,
  Utensils,
  BedDouble,
  RotateCcw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PlaceKind = "destination" | "restaurant" | "accommodation";

interface PlaceCard {
  id: string | number;
  kind: PlaceKind;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  url: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  places?: PlaceCard[];
  isError?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GREETING =
  "สวัสดีค่ะ เราคือน้องย่าโม ผู้ช่วยวางแผนเที่ยวโคราช ถามได้เลยว่าอยากไปไหน งบเท่าไหร่ หรือมีเวลากี่วัน";

/** คำถามตัวอย่าง เลือกให้ครอบคลุมหลายรูปแบบการถาม ไม่ใช่แค่ "แนะนำที่เที่ยว" */
const SUGGESTIONS = [
  "งบ 500 บาท เที่ยวไหนดี",
  "ช่วงนี้มีเทศกาลอะไรบ้าง",
  "วันนี้ฝนตก ไปไหนดี",
  "2 วัน 1 คืน จัดทริปยังไงดี",
  "อาหารโคราชที่ต้องลองมีอะไร",
  "ไม่มีรถส่วนตัว เที่ยวได้ไหม",
  "พาผู้สูงอายุไปเที่ยวไหนดี",
  "บันทึกทริปยังไง",
];

const KIND_META: Record<PlaceKind, { label: string; icon: typeof MapPin; className: string }> = {
  destination: { label: "ที่เที่ยว", icon: MapPin, className: "bg-emerald-50 text-emerald-700" },
  restaurant: { label: "ของกิน", icon: Utensils, className: "bg-amber-50 text-amber-700" },
  accommodation: { label: "ที่พัก", icon: BedDouble, className: "bg-sky-50 text-sky-700" },
};

// ─── Place card ──────────────────────────────────────────────────────────────

function PlaceCardItem({ place }: { place: PlaceCard }) {
  const meta = KIND_META[place.kind];
  const Icon = meta.icon;

  const price =
    place.minPrice === null
      ? null
      : place.minPrice === 0
        ? "เข้าฟรี"
        : `เริ่ม ${place.minPrice.toLocaleString("th-TH")} บาท`;

  return (
    <Link
      href={place.url}
      className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-2.5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
    >
      {/* ใช้ img ธรรมดาแทน next/image เพราะรูปในฐานข้อมูลมาจากหลายโฮสต์
          ถ้าเจอโฮสต์ที่ยังไม่ได้ตั้งใน next.config next/image จะพังทั้งการ์ด */}
      {place.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.imageUrl}
          alt={place.name}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-5 w-5 text-neutral-400" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.className}`}>
            {meta.label}
          </span>
          {place.category && (
            <span className="truncate text-[10px] text-neutral-400">{place.category}</span>
          )}
        </div>

        <p className="mt-1 truncate text-sm font-semibold text-neutral-800">{place.name}</p>

        {price && <p className="text-xs text-neutral-500">{price}</p>}
      </div>
    </Link>
  );
}

// ─── Widget ──────────────────────────────────────────────────────────────────

/** หน้าที่ไม่ควรมีผู้ช่วยท่องเที่ยวโผล่ขึ้นมา */
const HIDDEN_PATHS = ["/admin", "/sign-in", "/sign-up", "/auth-redirect"];

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // เลื่อนลงล่างสุดทุกครั้งที่มีข้อความใหม่
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // เปิดหน้าต่างแล้วโฟกัสช่องพิมพ์ให้เลย
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ปิดด้วยปุ่ม Escape
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || isLoading) return;

      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ส่งเฉพาะ role กับ content ฝั่งเซิร์ฟเวอร์ไม่ต้องรู้เรื่องการ์ด
          body: JSON.stringify({
            messages: nextMessages.map(({ role, content }) => ({ role, content })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data?.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ",
              isError: true,
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, places: data.places ?? [] },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "เชื่อมต่อไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วลองใหม่อีกครั้งนะ",
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages],
  );

  // เช็กหลังเรียก hook ครบทุกตัวแล้ว เพื่อไม่ให้ลำดับ hook เปลี่ยนระหว่าง render
  if (HIDDEN_PATHS.some((path) => pathname?.startsWith(path))) return null;

  return (
    <>
      {/* ปุ่มลอยเปิดแชท */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setIsOpen(true)}
            aria-label="เปิดผู้ช่วยแนะนำการท่องเที่ยว"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3.5 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden text-sm font-medium sm:inline">ถามน้องย่าโม</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* หน้าต่างแชท */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-3 bottom-3 z-50 flex h-[min(600px,85vh)] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
          >
            {/* หัวหน้าต่าง */}
            <header className="flex items-center gap-3 bg-linear-to-r from-emerald-600 to-emerald-500 px-4 py-3.5 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">น้องย่าโม</p>
                <p className="text-[11px] text-emerald-50">ผู้ช่วยวางแผนเที่ยวโคราช</p>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  aria-label="เริ่มบทสนทนาใหม่"
                  title="เริ่มบทสนทนาใหม่"
                  className="rounded-full p-2 transition-colors hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                aria-label="ปิดหน้าต่างแชท"
                className="rounded-full p-2 transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* พื้นที่ข้อความ */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-3.5 py-4">
              {/* ข้อความทักทายและคำถามตัวอย่าง แสดงเฉพาะตอนยังไม่เริ่มคุย */}
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed text-neutral-700 shadow-sm">
                    {GREETING}
                  </div>

                  <p className="pt-1 text-[11px] font-medium text-neutral-400">ลองถามแบบนี้ดู</p>

                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className="space-y-2">
                  <div
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-emerald-600 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white"
                        : `max-w-[92%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            message.isError
                              ? "bg-red-50 text-red-700"
                              : "bg-white text-neutral-700"
                          }`
                    }
                  >
                    {message.content}
                  </div>

                  {/* การ์ดสถานที่ที่บอทค้นเจอจากฐานข้อมูลจริง */}
                  {message.places && message.places.length > 0 && (
                    <div className="space-y-1.5">
                      {message.places.map((place) => (
                        <PlaceCardItem key={`${place.kind}-${place.id}`} place={place} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm text-neutral-500 shadow-sm w-fit">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  กำลังหาข้อมูลให้...
                </div>
              )}
            </div>

            {/* ช่องพิมพ์ */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2.5"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="พิมพ์คำถามเกี่ยวกับเที่ยวโคราช..."
                maxLength={1500}
                disabled={isLoading}
                className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="ส่งข้อความ"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
