"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  MapPin,
  Utensils,
  BedDouble,
  RotateCcw,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ROMY_IMAGE = "/images/romy.jpg.png";

const GREETING =
  "สวัสดีครับ! บอทน้อยน้องโรมี่♡ เองครับ เป็นผู้ช่วยป้อนข้อมูลและวางแผนเที่ยวอัจฉริยะยินดีต้อนรับครับ 🚘⛰️ วันนี้อยากให้โรมี่ช่วยแพลนทริป ค้นหาพิกัดลับ หรือเช็กการเดินทางไปที่ไหนดีน๊า? พิมพ์ถามโรมี่ด้านล่างนี้ได้เลย หรือเลือกหัวข้อที่สนใจได้เลยน๊า👇";

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

const KIND_META: Record<
  PlaceKind,
  {
    label: string;
    icon: typeof MapPin;
    className: string;
  }
> = {
  destination: {
    label: "ที่เที่ยว",
    icon: MapPin,
    className: "bg-emerald-50 text-emerald-700",
  },
  restaurant: {
    label: "ของกิน",
    icon: Utensils,
    className: "bg-amber-50 text-amber-700",
  },
  accommodation: {
    label: "ที่พัก",
    icon: BedDouble,
    className: "bg-sky-50 text-sky-700",
  },
};

// ─────────────────────────────────────────────
// Place Card
// ─────────────────────────────────────────────

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
      className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40"
    >
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
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.className}`}
          >
            {meta.label}
          </span>

          {place.category && (
            <span className="truncate text-[10px] text-neutral-400">
              {place.category}
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-sm font-semibold text-neutral-800">
          {place.name}
        </p>

        {price && (
          <p className="text-xs text-neutral-500">
            {price}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Chat Widget
// ─────────────────────────────────────────────

const HIDDEN_PATHS = [
  "/admin",
  "/sign-in",
  "/sign-up",
  "/auth-redirect",
];

export default function ChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────
  // Speech Bubble
  // ─────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setShowBubble(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowBubble(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // ─────────────────────────────────────────
  // Scroll
  // ─────────────────────────────────────────

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // ─────────────────────────────────────────
  // Focus
  // ─────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  // ─────────────────────────────────────────
  // Escape
  // ─────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // ─────────────────────────────────────────
  // Send Message
  // ─────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim();

      if (!question || isLoading) return;

      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: question,
        },
      ];

      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: nextMessages.map(({ role, content }) => ({
              role,
              content,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                data?.error ??
                "เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ",
              isError: true,
            },
          ]);

          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            places: data.places ?? [],
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "เชื่อมต่อไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วลองใหม่อีกครั้งนะ",
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages],
  );

  // ─────────────────────────────────────────
  // Hidden Paths
  // ─────────────────────────────────────────

  if (
    HIDDEN_PATHS.some((path) =>
      pathname?.startsWith(path),
    )
  ) {
    return null;
  }

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════
          Floating Chatbot
      ═══════════════════════════════════════ */}

      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-5 right-5 z-50">

            {/* ═══════════════════════════════
                Speech Bubble
            ═══════════════════════════════ */}

            <AnimatePresence>
              {showBubble && (
                <motion.button
                  initial={{
                    opacity: 0,
                    x: 20,
                    scale: 0.85,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: 15,
                    scale: 0.9,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  onClick={() => {
                    setShowBubble(false);
                    setIsOpen(true);
                  }}
                  className="
                    absolute
                    bottom-[78px]
                    right-1
                    w-[245px]
                    rounded-2xl
                    border
                    border-emerald-100
                    bg-white
                    px-4
                    py-3
                    text-left
                    shadow-xl
                    shadow-emerald-900/10
                    transition-all
                    hover:-translate-y-0.5
                    hover:shadow-2xl
                  "
                >
                  {/* Bubble Arrow */}
                  <div
                    className="
                      absolute
                      -bottom-2
                      right-7
                      h-4
                      w-4
                      rotate-45
                      border-b
                      border-r
                      border-emerald-100
                      bg-white
                    "
                  />

                  <div className="relative flex items-center gap-2.5">

                    {/* Mini Roto */}

                    <div
                      className="
                        relative
                        h-10
                        w-10
                        shrink-0
                        overflow-hidden
                        rounded-full
                        border-2
                        border-emerald-100
                        bg-emerald-50
                      "
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ROMY_IMAGE}
                        alt="บอทน้อยน้องโรมี่"
                        className="
                          absolute
                          left-1/2
                          top-0
                          h-[85px]
                          w-[65px]
                          max-w-none
                          -translate-x-1/2
                          object-cover
                          object-[50%_10%]
                        "
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-emerald-700">
                        บอทน้อยน้องโรมี่ ♡
                      </p>

                      <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-600">
                        มีอะไรให้บอทน้อยน้องโรมี่ช่วยไหมครับ? 
                      </p>
                    </div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════
                Floating Button
            ═══════════════════════════════ */}

            <motion.button
              initial={{
                scale: 0,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              whileHover={{
                scale: 1.08,
                y: -3,
              }}
              whileTap={{
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 22,
              }}
              onClick={() => {
                setShowBubble(false);
                setIsOpen(true);
              }}
              aria-label="เปิดแชทบอทน้องโรมี่"
              className="
                group
                relative
                flex
                h-[70px]
                w-[70px]
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border-[3px]
                border-white
                bg-gradient-to-br
                from-emerald-400
                via-emerald-500
                to-teal-600
                shadow-xl
                shadow-emerald-600/30
              "
            >

              {/* Glow ด้านหลัง */}

              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="
                  absolute
                  inset-0
                  z-0
                  rounded-full
                  bg-white/20
                "
              />

              {/* ═══════════════════════════
                  รูปบอทน้อยน้องโรมี่
              ═══════════════════════════ */}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ROMY_IMAGE}
                alt="บอทน้อยน้องโรมี่"
                className="
                  absolute
                  left-1/2
                  top-[-14px]
                  z-10
                  h-[150px]
                  w-[105px]
                  max-w-none
                  -translate-x-1/2
                  object-cover
                  object-[50%_8%]
                  transition-transform
                  duration-300
                  group-hover:scale-105
                "
              />

              {/* Online Status */}

              <span
                className="
                  absolute
                  bottom-1
                  right-1
                  z-20
                  h-4
                  w-4
                  rounded-full
                  border-[3px]
                  border-white
                  bg-green-400
                  shadow-sm
                "
              />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          Chat Window
      ═══════════════════════════════════════ */}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: 24,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 24,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
            }}
            className="
              fixed
              inset-x-3
              bottom-3
              z-50
              flex
              h-[min(600px,85vh)]
              flex-col
              overflow-hidden
              rounded-3xl
              border
              border-neutral-200
              bg-white
              shadow-2xl
              sm:inset-x-auto
              sm:right-5
              sm:bottom-5
              sm:w-[400px]
            "
          >

            {/* ═══════════════════════════════
                Header
            ═══════════════════════════════ */}

            <header
              className="
                flex
                items-center
                gap-3
                bg-gradient-to-r
                from-emerald-600
                via-emerald-500
                to-teal-500
                px-4
                py-3.5
                text-white
              "
            >

              {/* ═══════════════════════════
                  Roto Avatar ใน Header
              ═══════════════════════════ */}

              <div
                className="
                  relative
                  h-12
                  w-12
                  shrink-0
                  overflow-hidden
                  rounded-full
                  border-2
                  border-white/80
                  bg-emerald-100
                  shadow-md
                "
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ROMY_IMAGE}
                  alt="บอทน้อยน้องโรมี่"
                  className="
                    absolute
                    left-1/2
                    top-[-4px]
                    h-[105px]
                    w-[80px]
                    max-w-none
                    -translate-x-1/2
                    object-cover
                    object-[50%_8%]
                  "
                />

                {/* Online Status */}
                <span
                  className="
                    absolute
                    bottom-0.5
                    right-0.5
                    h-3
                    w-3
                    rounded-full
                    border-2
                    border-white
                    bg-green-400
                  "
                />
              </div>

              {/* Header Text */}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">
                    บอทน้อยโรมี่ ♡
                  </p>

                  <Sparkles className="h-3.5 w-3.5" />
                </div>

                <p className="text-[11px] text-emerald-50">
                  บอทน้อยโรมี่จะเป็นผู้ช่วยแนะนำการท่องเที่ยวในโคราชให้เองครับ
                </p>
              </div>

              {/* Reset */}

              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  aria-label="เริ่มบทสนทนาใหม่"
                  title="เริ่มบทสนทนาใหม่"
                  className="
                    rounded-full
                    p-2
                    transition-colors
                    hover:bg-white/20
                  "
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}

              {/* Close */}

              <button
                onClick={() => setIsOpen(false)}
                aria-label="ปิดหน้าต่างแชท"
                className="
                  rounded-full
                  p-2
                  transition-colors
                  hover:bg-white/20
                "
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* ═══════════════════════════════
                Messages
            ═══════════════════════════════ */}

            <div
              ref={scrollRef}
              className="
                flex-1
                space-y-3
                overflow-y-auto
                bg-gradient-to-b
                from-emerald-50/40
                via-neutral-50
                to-white
                px-3.5
                py-4
              "
            >

              {/* Greeting */}

              {messages.length === 0 && (
                <div className="space-y-3">

                  <div className="flex items-start gap-2">

                    {/* Roto Mini Avatar */}

                    <div
                      className="
                        relative
                        mt-1
                        h-8
                        w-8
                        shrink-0
                        overflow-hidden
                        rounded-full
                        border
                        border-emerald-100
                        bg-emerald-50
                      "
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ROMY_IMAGE}
                        alt="บอทน้อยโรมี่"
                        className="
                          absolute
                          left-1/2
                          top-0
                          h-[72px]
                          w-[55px]
                          max-w-none
                          -translate-x-1/2
                          object-cover
                          object-[50%_8%]
                        "
                      />
                    </div>

                    {/* Greeting Bubble */}

                    <div
                      className="
                        max-w-[85%]
                        rounded-2xl
                        rounded-tl-md
                        border
                        border-emerald-100
                        bg-white
                        px-3.5
                        py-2.5
                        text-sm
                        leading-relaxed
                        text-neutral-700
                        shadow-sm
                      "
                    >
                      {GREETING}
                    </div>
                  </div>

                  <p className="pt-1 text-[11px] font-medium text-neutral-400">
                    ลองถามบอทน้อยโรมี่แบบนี้ดูนะ ✨
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() =>
                          sendMessage(suggestion)
                        }
                        className="
                          rounded-full
                          border
                          border-emerald-200
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          text-emerald-700
                          shadow-sm
                          transition-all
                          hover:-translate-y-0.5
                          hover:bg-emerald-50
                          hover:shadow
                        "
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className="space-y-2"
                >
                  <div
                    className={
                      message.role === "user"
                        ? `
                          ml-auto
                          max-w-[85%]
                          rounded-2xl
                          rounded-tr-md
                          bg-emerald-600
                          px-3.5
                          py-2.5
                          text-sm
                          leading-relaxed
                          whitespace-pre-wrap
                          text-white
                        `
                        : `flex items-start gap-2`
                    }
                  >
                    {/* Avatar เฉพาะข้อความของบอทน้อยโรมี่ */}

                    {message.role === "assistant" && (
                      <div
                        className="
                          relative
                          mt-1
                          h-8
                          w-8
                          shrink-0
                          overflow-hidden
                          rounded-full
                          border
                          border-emerald-100
                          bg-emerald-50
                        "
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ROMY_IMAGE}
                          alt="บอทน้อยน้องโรมี่"
                          className="
                            absolute
                            left-1/2
                            top-0
                            h-[72px]
                            w-[55px]
                            max-w-none
                            -translate-x-1/2
                            object-cover
                            object-[50%_8%]
                          "
                        />
                      </div>
                    )}

                    {/* Message Bubble */}

                    <div
                      className={
                        message.role === "assistant"
                          ? `
                            max-w-[85%]
                            rounded-2xl
                            rounded-tl-md
                            px-3.5
                            py-2.5
                            text-sm
                            leading-relaxed
                            whitespace-pre-wrap
                            shadow-sm
                            ${
                              message.isError
                                ? "bg-red-50 text-red-700"
                                : "bg-white text-neutral-700"
                            }
                          `
                          : ""
                      }
                    >
                      {message.content}
                    </div>
                  </div>

                  {/* Place Cards */}

                  {message.places &&
                    message.places.length > 0 && (
                      <div className="space-y-1.5 pl-10">
                        {message.places.map((place) => (
                          <PlaceCardItem
                            key={`${place.kind}-${place.id}`}
                            place={place}
                          />
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {/* Loading */}

              {isLoading && (
                <div className="flex items-start gap-2">

                  {/* Roto Avatar */}

                  <div
                    className="
                      relative
                      mt-1
                      h-8
                      w-8
                      shrink-0
                      overflow-hidden
                      rounded-full
                      border
                      border-emerald-100
                      bg-emerald-50
                    "
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ROMY_IMAGE}
                      alt="บอทน้อยน้องโรมี่"
                      className="
                        absolute
                        left-1/2
                        top-0
                        h-[72px]
                        w-[55px]
                        max-w-none
                        -translate-x-1/2
                        object-cover
                        object-[50%_8%]
                      "
                    />
                  </div>

                  <div
                    className="
                      flex
                      w-fit
                      items-center
                      gap-2
                      rounded-2xl
                      rounded-tl-md
                      bg-white
                      px-3.5
                      py-2.5
                      text-sm
                      text-neutral-500
                      shadow-sm
                    "
                  >
                    <Loader2
                      className="
                        h-4
                        w-4
                        animate-spin
                        text-emerald-500
                      "
                    />

                    <span>
                      โรมี่กำลังหาข้อมูลให้...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════
                Input
            ═══════════════════════════════ */}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
              className="
                flex
                items-center
                gap-2
                border-t
                border-neutral-200
                bg-white
                px-3
                py-2.5
              "
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="พิมพ์คำถามเกี่ยวกับเที่ยวโคราช..."
                maxLength={1500}
                disabled={isLoading}
                className="
                  min-w-0
                  flex-1
                  rounded-full
                  bg-neutral-100
                  px-4
                  py-2.5
                  text-sm
                  text-neutral-800
                  outline-none
                  placeholder:text-neutral-400
                  focus:bg-white
                  focus:ring-2
                  focus:ring-emerald-500/40
                  disabled:opacity-60
                "
              />

              <button
                type="submit"
                disabled={
                  isLoading ||
                  !input.trim()
                }
                aria-label="ส่งข้อความ"
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-600
                  text-white
                  transition-all
                  hover:scale-105
                  hover:bg-emerald-700
                  disabled:cursor-not-allowed
                  disabled:bg-neutral-300
                "
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
