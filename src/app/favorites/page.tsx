"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Utensils, BedDouble, LogIn, Compass } from "lucide-react";
import { Navbar } from "@/component/User/Navbar";
import { useFavorites, type FavoriteType } from "@/component/FavoritesProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FavItemDetail {
  id: string | number;
  name: string;
  min_price: number;
  image_url?: string | string[];
  images?: string | string[];
  category?: string;
}

interface FavoriteEntry {
  id: number;
  item_id: string;
  item_type: FavoriteType;
  item_detail: FavItemDetail;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const SECTIONS: {
  type: FavoriteType;
  label: string;
  icon: React.ElementType;
  hrefBase: string;
}[] = [
  { type: "destination", label: "สถานที่ท่องเที่ยว", icon: MapPin, hrefBase: "/destinations" },
  { type: "accommodation", label: "ที่พัก", icon: BedDouble, hrefBase: "/accommodations" },
  { type: "restaurant", label: "ของกิน", icon: Utensils, hrefBase: "/restaurant" },
];

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800";

function firstImage(detail: FavItemDetail): string {
  const raw = detail.image_url ?? detail.images;
  if (!raw) return DEFAULT_IMG;
  if (Array.isArray(raw)) return raw[0] || DEFAULT_IMG;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed[0] || DEFAULT_IMG : DEFAULT_IMG;
    } catch {
      return raw;
    }
  }
  return raw;
}

// ─── Card ────────────────────────────────────────────────────────────────────

function FavoriteCard({
  entry,
  onRemove,
}: {
  entry: FavoriteEntry;
  onRemove: () => void;
}) {
  const section = SECTIONS.find((s) => s.type === entry.item_type);
  const d = entry.item_detail;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="group relative flex flex-col bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-200 transition-all duration-300"
    >
      <Link
        href={`${section?.hrefBase ?? "/"}/${entry.item_id}`}
        className="block outline-none"
      >
        <div className="relative aspect-4/3 bg-neutral-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstImage(d)}
            alt={d.name}
            loading="lazy"
            className="w-full h-full object-cover transition-[filter] duration-300 group-hover:brightness-95"
          />
          {d.category && (
            <span className="absolute top-2.5 left-2.5 bg-white/95 text-neutral-700 border border-neutral-200 text-[10px] font-medium px-1.5 py-0.5 rounded">
              {d.category}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-[15px] font-semibold text-neutral-900 truncate">
            {d.name}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            {d.min_price === 0
              ? "เข้าฟรี"
              : d.min_price
                ? `เริ่ม ฿${d.min_price.toLocaleString("th-TH")}`
                : "สอบถามราคา"}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label="เอาออกจากคอลเลคชั่น"
        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 border border-neutral-200 shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <Heart className="w-4 h-4 fill-rose-500" />
      </button>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const { ready, isLoggedIn, isFavorite, toggleFavorite } = useFavorites();
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites");
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const data = await res.json();
      setEntries(data.favorites ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, isLoggedIn, load]);

  // ตัดการ์ดที่ถูกกดออกจากคอลเลคชั่นระหว่างอยู่หน้านี้ (จากปุ่มหัวใจที่อื่น)
  const visibleEntries = useMemo(
    () => entries.filter((e) => isFavorite(e.item_type, e.item_id)),
    [entries, isFavorite],
  );

  const grouped = useMemo(() => {
    return SECTIONS.map((s) => ({
      ...s,
      items: visibleEntries.filter((e) => e.item_type === s.type),
    }));
  }, [visibleEntries]);

  const handleRemove = async (entry: FavoriteEntry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    await toggleFavorite(entry.item_type, entry.item_id);
  };

  return (
    <>
      <Navbar />

      <div className="relative w-full bg-neutral-900 flex flex-col items-center justify-center overflow-hidden pt-28 pb-14">
        <div className="absolute inset-0 bg-linear-to-br from-neutral-900 via-neutral-900 to-neutral-800" />
        <div className="relative z-10 text-center px-4 w-full max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-amber-400 mb-3">
            <Heart className="w-5 h-5 fill-amber-400" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              My Collection
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-md">
            คอลเลคชั่นของฉัน
          </h1>
          <p className="mt-3 text-neutral-300 text-sm sm:text-base">
            ที่เที่ยว ที่พัก และร้านอาหารที่คุณกดหัวใจไว้ รวมอยู่ที่เดียว
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[50vh]">
        {!ready || loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="aspect-4/3 bg-neutral-200/70" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-neutral-200/70 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200/70 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !isLoggedIn ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-5">
              <LogIn className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              เข้าสู่ระบบเพื่อดูคอลเลคชั่น
            </h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-xs">
              กดหัวใจที่สถานที่ ที่พัก หรือร้านอาหารที่ชอบ แล้วมันจะมาอยู่ที่นี่
            </p>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-5">
              <Compass className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              ยังไม่มีอะไรในคอลเลคชั่น
            </h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-xs">
              ลองไปดูสถานที่ท่องเที่ยว ที่พัก หรือร้านอาหาร แล้วกดหัวใจที่ชอบไว้
            </p>
            <Link
              href="/destinations"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              เริ่มสำรวจ
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(
              (section) =>
                section.items.length > 0 && (
                  <section key={section.type}>
                    <div className="flex items-center gap-2.5 mb-5">
                      <section.icon className="w-5 h-5 text-neutral-500" />
                      <h2 className="text-lg font-bold text-neutral-900">
                        {section.label}
                      </h2>
                      <span className="text-sm text-neutral-400 font-medium">
                        {section.items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                      <AnimatePresence mode="popLayout">
                        {section.items.map((entry) => (
                          <FavoriteCard
                            key={entry.id}
                            entry={entry}
                            onRemove={() => handleRemove(entry)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                ),
            )}
          </div>
        )}
      </main>
    </>
  );
}
