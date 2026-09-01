// src/component/User/DestinationList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Heart, Star, Tag, Wallet, Search, Images, SlidersHorizontal, X } from "lucide-react";
import type { Destination } from "@/types/destination";
import { useFavorites } from "@/component/FavoritesProvider";

// ─── Framer Motion variants ───────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
};

// ─── Category chips ───────────────────────────────────────────────────────────
const CATEGORIES = ["ทั้งหมด", "ธรรมชาติ", "วัด", "ที่พัก", "อาหาร", "กิจกรรม"];

// ─── Mini star row ────────────────────────────────────────────────────────────
function MiniStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${
            s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 border border-neutral-100 animate-pulse">
      <div className="w-full aspect-4/3 bg-neutral-200/70 rounded-xl mb-4" />
      <div className="px-2 space-y-3 pb-2">
        <div className="h-5 bg-neutral-200/70 rounded-md w-3/4" />
        <div className="h-4 bg-neutral-200/70 rounded-md w-1/2" />
        <div className="h-4 bg-neutral-200/70 rounded-md w-1/3 mt-2" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DestinationList() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [minBudget, setMinBudget] = useState<number | "">("");
  const [maxBudget, setMaxBudget] = useState<number | "">("");
  const [showBudget, setShowBudget] = useState(false);

  // ── Fetch destinations (ครั้งเดียวจบ ได้ข้อมูลครบพร้อม Rating) ───────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (minBudget !== "") params.append("minBudget", minBudget.toString());
        if (maxBudget !== "") params.append("maxBudget", maxBudget.toString());

        const res = await fetch(`/api/destinations?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data: Destination[] = await res.json();
        setDestinations(data);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching destinations:", err);
        setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [minBudget, maxBudget]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredDestinations = destinations.filter((d) => {
    const matchSearch =
      searchQuery === "" ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory =
      activeCategory === "ทั้งหมด" ||
      (d.category ?? "").includes(activeCategory);
    return matchSearch && matchCategory;
  });

  const hasActiveFilters =
    searchQuery !== "" ||
    activeCategory !== "ทั้งหมด" ||
    minBudget !== "" ||
    maxBudget !== "";

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveCategory("ทั้งหมด");
    setMinBudget("");
    setMaxBudget("");
    setShowBudget(false);
  };

  const getFirstImageUrl = (data: any): string => {
    if (!data) return "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70";
    
    try {
      if (typeof data === 'string' && data.startsWith('[')) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? (parsed[0] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70") : data;
      }
      if (Array.isArray(data)) {
        return data[0] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70";
      }
      return data;
    } catch {
      return data; 
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div id="destinations" className="w-full mt-4 max-w-350 mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="h-9 w-56 bg-neutral-200/60 rounded-lg animate-pulse" />
          <div className="h-11 w-full lg:w-96 bg-neutral-200/60 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div id="destinations" className="w-full flex justify-center px-6 mt-4">
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-10 text-center shadow-sm max-w-md w-full">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🚨
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm text-red-600/80 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-600 hover:bg-amber-700 transition-colors text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="destinations" className="w-full mt-4 md:mt-6 max-w-350 mx-auto px-4 sm:px-6">

      {/* ── Header + Filter bar ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">สถานที่ท่องเที่ยว</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {filteredDestinations.length} แห่ง
              {hasActiveFilters && " (กรองแล้ว)"}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสถานที่..."
                className="w-full pl-10 pr-9 py-2.5 rounded-full border border-neutral-200 bg-white text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label="ล้างการค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Budget toggle */}
            <button
              type="button"
              onClick={() => setShowBudget((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all shadow-sm shrink-0 ${
                showBudget || minBudget !== "" || maxBudget !== ""
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
              aria-label="กรองงบประมาณ"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">งบ</span>
            </button>

            {/* Clear all */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 transition-all shadow-sm shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                ล้าง
              </button>
            )}
          </div>
        </div>

        {/* Budget panel */}
        {showBudget && (
          <div className="mb-4 flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl px-4 py-3 shadow-sm w-full sm:w-auto sm:inline-flex">
            <Wallet className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="number"
              placeholder="ราคาต่ำสุด"
              value={minBudget}
              onChange={(e) =>
                setMinBudget(e.target.value ? Number(e.target.value) : "")
              }
              className="w-28 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
            />
            <span className="text-neutral-300">—</span>
            <input
              type="number"
              placeholder="ราคาสูงสุด"
              value={maxBudget}
              onChange={(e) =>
                setMaxBudget(e.target.value ? Number(e.target.value) : "")
              }
              className="w-28 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
            />
            <span className="text-sm text-neutral-400">฿</span>
          </div>
        )}

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeCategory === cat
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {filteredDestinations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-neutral-100 shadow-sm flex flex-col items-center">
          <div className="text-4xl mb-4 opacity-40">🏜️</div>
          <h4 className="text-base font-semibold text-neutral-900 mb-2">
            ไม่พบสถานที่ที่ตรงเงื่อนไข
          </h4>
          <p className="text-sm text-neutral-500 mb-6">
            ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-full text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {filteredDestinations.map((d) => {
            const minPrice = d.min_price ?? 0;
            const maxPrice = d.max_price ?? 0;
            
            // ดึงข้อมูล Rating จากออบเจ็กต์ d ได้โดยตรงเลย 🚀
            const rating = d.rating; 
            
            let imageCount = 0;
            try {
              const parsedImage = typeof d.image_url === 'string' && d.image_url.startsWith('[') 
                ? JSON.parse(d.image_url) 
                : d.image_url;
              imageCount = Array.isArray(parsedImage) ? parsedImage.length : 1;
            } catch {
              imageCount = 1;
            }
            const hasMultipleImages = imageCount > 1;

            return (
              <motion.div variants={itemVariants} key={d.id}>
                <Link href={`/destinations/${d.id}`} className="block outline-none group h-full">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-neutral-100/80 hover:shadow-md hover:border-neutral-200 transition-all duration-300 ease-out h-full flex flex-col">

                    {/* Image */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-4 bg-neutral-100">
                      <Image
                        src={getFirstImageUrl(d.image_url)}
                        alt={d.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-[filter] duration-300 group-hover:brightness-95"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Price badge */}
                      <div className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full text-xs font-bold text-neutral-900 shadow-sm border border-white/20">
                        {maxPrice === 0 ? (
                          <span className="text-emerald-600">ฟรี</span>
                        ) : (
                          <>
                            ฿{minPrice.toLocaleString()}
                            <span className="text-neutral-400 font-normal ml-0.5">+</span>
                          </>
                        )}
                      </div>

                      {/* Multi-image badge */}
                      {hasMultipleImages && (
                        <div className="absolute top-3 right-10 bg-black/40 text-white px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1">
                          <Images className="w-2.5 h-2.5" />
                          {imageCount}
                        </div>
                      )}

                      {/* Heart */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite("destination", d.id);
                        }}
                        className={`absolute top-3 right-3 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 z-10 ${
                          isFavorite("destination", d.id)
                            ? "text-rose-500"
                            : "text-neutral-400 hover:text-rose-500"
                        }`}
                        aria-label="เก็บไว้ในคอลเลคชั่น"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFavorite("destination", d.id) ? "fill-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Card body */}
                    <div className="px-1 pb-2 flex flex-col grow justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-neutral-900 line-clamp-1 mb-1 group-hover:text-neutral-700 transition-colors leading-snug">
                          {d.name}
                        </h4>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 font-medium">
                          <Tag className="w-3 h-3 opacity-70 shrink-0" />
                          <span className="truncate">{d.category ?? "ท่องเที่ยวทั่วไป"}</span>
                        </p>
                      </div>

                      {/* Rating row (โหลดมาพร้อมข้อมูลแล้ว ไม่ต้องเช็ค ratingsLoading) */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-50">
                        {rating && rating.count > 0 ? (
                          <>
                            <MiniStars rating={rating.avg} />
                            <span className="text-xs font-bold text-neutral-800">
                              {rating.avg.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              ({rating.count})
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            ยังไม่มีรีวิว
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* See all (mobile only) */}
      <div className="mt-8 flex justify-center lg:hidden">
        <button className="px-8 py-3 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm">
          ดูทั้งหมด
        </button>
      </div>
    </div>
  );
}