// src/component/Restaurant/RestaurantList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Search, MapPin, Heart, Star, X } from "lucide-react";
import { useFavorites } from "@/component/FavoritesProvider";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  min_price: number;
  max_price: number;
  location: string;
  category: string;
  image_url: string | null;
  created_at?: string;
}

// Framer Motion Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function RestaurantList() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "", label: "ทั้งหมด", icon: "🍽️"},
    { value: "คาเฟ่", label: "คาเฟ่", icon: "☕" },
    { value: "อาหารไทย", label: "อาหารไทย", icon: "🍜" },
    { value: "ร้านขนม", label: "ร้านขนม", icon: "🍰" },
    { value: "อื่นๆ", label: "อื่นๆ", icon: "📍" },
  ];

  const fetchRestaurants = useCallback(
    async (searchTerm: string, catTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("q", searchTerm);
        if (catTerm) params.append("category", catTerm);

        const res = await fetch(`/api/restaurants?${params.toString()}`);
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");

        const data = await res.json();
        setRestaurants(data);
      } catch (err) {
        console.error("❌ Error fetching restaurants:", err);
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Debounce delay 400ms
    const timer = setTimeout(() => {
      fetchRestaurants(search, category);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, category, fetchRestaurants]);

  const getRestaurantImageUrl = (url: string | null | undefined): string => {
    const defaultImage =
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";

    if (!url) return defaultImage;

    try {
      // ตรวจสอบว่าเป็น JSON Array String หรือไม่ (เช่น '["url1", "url2"]')
      if (url.trim().startsWith("[")) {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed[0]
          : defaultImage;
      }
    } catch (e) {
      console.log("หารูปภาพไม่เจอ", e);
      return url;
    }

    return url;
  };

  // 🌟 Skeleton Loading สไตล์มินิมอล 4 คอลัมน์
  if (loading && restaurants.length === 0) {
    return (
      <div id="restaurants" className="w-full mt-4 max-w-350 mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="h-9 w-56 bg-stone-200/60 rounded-lg animate-pulse" />
          <div className="h-11 w-full lg:w-72 bg-stone-200/60 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 border border-stone-200/70 animate-pulse">
              <div className="w-full aspect-4/3 bg-stone-200/70 rounded-xl mb-3.5" />
              <div className="px-1 space-y-3 pb-1">
                <div className="h-5 bg-stone-200/70 rounded-md w-3/4" />
                <div className="h-4 bg-stone-200/70 rounded-md w-1/2" />
                <div className="h-4 bg-stone-200/70 rounded-md w-1/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🚨 Error State
  if (error) {
    return (
      <div id="restaurants" className="w-full flex justify-center px-6 mt-4">
        <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-10 text-center shadow-sm max-w-md w-full">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🚨
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            เกิดข้อผิดพลาด
          </h3>
          <p className="text-sm text-red-600/80 mb-6">{error}</p>
          <button
            onClick={() => fetchRestaurants(search, category)}
            className="bg-teal-700 hover:bg-teal-800 transition-colors text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="restaurants" className="w-full mt-4 md:mt-6 max-w-350 mx-auto px-4 sm:px-6">
      {/* 🌟 Section Header & Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                ร้านอาหารแนะนำ
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs">
                {restaurants.length} ร้าน
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              ค้นพบร้านอาหารอร่อย คาเฟ่น่านั่ง และเมนูเด็ดที่ไม่ควรพลาดในโคราช
              {(search || category) && " (กำลังกรอง)"}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72 group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100/90 group-focus-within:bg-teal-50 flex items-center justify-center transition-colors pointer-events-none">
                <Search className="w-3.5 h-3.5 text-stone-400 group-focus-within:text-teal-700 transition-colors" strokeWidth={2.2} />
              </div>
              <input
                type="text"
                placeholder="ค้นหาชื่อร้านหรือสถานที่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-9 py-2.5 rounded-full border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  aria-label="ล้างการค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Clear button if filter active */}
            {(search || category) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-stone-200 bg-white text-xs font-medium text-stone-500 hover:text-stone-800 hover:border-stone-300 transition-all shadow-2xs shrink-0"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                  isActive
                    ? "bg-teal-700 text-white border-teal-700 shadow-2xs font-semibold"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 Content Area */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200/80 shadow-xs flex flex-col items-center">
          <div className="text-4xl mb-4 opacity-70">🍳</div>
          <h4 className="text-base font-semibold text-stone-900 mb-2">
            ไม่พบร้านอาหารที่คุณค้นหา
          </h4>
          <p className="text-sm text-stone-500 mb-6">
            ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูสิ
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCategory("");
            }}
            className="px-6 py-2.5 bg-teal-700 text-white rounded-full text-sm font-semibold hover:bg-teal-800 transition-colors shadow-2xs"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative"
        >
          {loading && (
            <div className="absolute inset-0 bg-white/50 z-10 rounded-2xl" />
          )}

          {restaurants.map((r) => {
            const catInfo =
              categories.find((c) => c.value === r.category) || categories[0];

            return (
              <motion.div variants={itemVariants} key={r.id}>
                <Link
                  href={`/restaurant/${r.id}`}
                  className="block outline-none group h-full"
                >
                  <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-stone-200/80 hover:shadow-lg hover:border-teal-300/80 hover:-translate-y-1 transition-all duration-300 ease-out h-full flex flex-col">
                    {/* Image Section */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-3 bg-stone-100">
                      <Image
                        src={getRestaurantImageUrl(r.image_url)}
                        alt={r.name}
                        fill
                        unoptimized={true}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Badge Top Left */}
                      <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-stone-900 shadow-2xs border border-white/60 flex items-center gap-1.5">
                        <span>{catInfo.icon}</span>
                        <span>{r.category || "ทั่วไป"}</span>
                      </div>

                      {/* Favorite Button Top Right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite("restaurant", r.id);
                        }}
                        aria-label="เก็บไว้ในคอลเลคชั่น"
                        className={`absolute top-2.5 right-2.5 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xs border border-white/60 z-10 ${
                          isFavorite("restaurant", r.id)
                            ? "text-rose-500"
                            : "text-stone-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFavorite("restaurant", r.id) ? "fill-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="px-1 pb-1 flex flex-col grow justify-between gap-2">
                      <div>
                        <h4 className="text-[15px] sm:text-base font-bold text-stone-900 line-clamp-1 mb-1 group-hover:text-teal-800 transition-colors leading-snug">
                          {r.name}
                        </h4>
                        
                        <p className="text-xs text-stone-500 line-clamp-2 mb-2 leading-relaxed">
                          {r.description || "ร้านอาหารยอดนิยมในจังหวัดนครราชสีมา"}
                        </p>

                        <p className="text-xs text-stone-500 flex items-center gap-1 font-medium truncate">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">
                            {r.location || "เมือง นครราชสีมา"}
                          </span>
                        </p>
                      </div>

                      {/* Bottom Info Row */}
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between mt-2 gap-2">
                        {r.min_price || r.max_price ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/70">
                            ฿{r.min_price?.toLocaleString()} - {r.max_price?.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400">
                            ราคาเฉลี่ยทั่วไป
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-stone-800">
                            4.5
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Mobile Load More Button */}
      {restaurants.length > 0 && (
        <div className="mt-8 flex justify-center lg:hidden">
          <button className="px-8 py-3 rounded-full border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all shadow-2xs">
            ดูเพิ่มเติม
          </button>
        </div>
      )}
    </div>
  );
}
