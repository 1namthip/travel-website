// src/component/Restaurant/RestaurantList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Search, MapPin, Heart, Star } from "lucide-react";
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
      <div
        id="restaurants"
        className="w-full max-w-350 mx-auto px-6 pb-20"
      >
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="h-10 w-72 bg-neutral-200/60 rounded-lg animate-pulse"></div>
            <div className="h-12 w-full lg:w-80 bg-neutral-200/60 rounded-full animate-pulse"></div>
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-28 bg-neutral-200/60 rounded-full animate-pulse shrink-0"
              ></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 animate-pulse"
            >
              <div className="w-full aspect-4/3 bg-neutral-200/60 rounded-[1.25rem] mb-4"></div>
              <div className="px-2 space-y-3">
                <div className="h-5 bg-neutral-200/60 rounded-md w-3/4"></div>
                <div className="h-4 bg-neutral-200/60 rounded-md w-full"></div>
                <div className="h-4 bg-neutral-200/60 rounded-md w-2/3"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-4 bg-neutral-200/60 rounded-md w-1/3"></div>
                  <div className="h-4 bg-neutral-200/60 rounded-md w-1/4"></div>
                </div>
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
      <div
        id="restaurants"
        className="mt-6 w-full flex justify-center px-6 pb-20"
      >
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-10 text-center shadow-sm max-w-md w-full">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🚨
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            เกิดข้อผิดพลาด
          </h3>
          <p className="text-sm text-red-600/80 mb-6">{error}</p>
          <button
            onClick={() => fetchRestaurants(search, category)}
            className="bg-neutral-900 hover:bg-black transition-colors text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="restaurants"
      className="w-full mt-6 max-w-350 mx-auto px-6 pb-20"
    >
      {/* 🌟 Section Header & Filters */}
      <div className="flex flex-col gap-6 mb-10">
        {/* Title & Search Pill */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">
              ร้านอาหารแนะนำ
            </h2>
            <p className="text-sm font-medium text-neutral-500">
              ค้นพบร้านอาหารอร่อยๆ ในโคราช
            </p>
          </div>

          <div className="w-full lg:w-auto">
            <div className="flex items-center bg-white px-4 py-3 lg:py-2.5 rounded-full border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-neutral-900/10 focus-within:border-neutral-900 transition-all w-full lg:w-80">
              <Search className="w-4 h-4 text-neutral-400 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาชื่อร้านหรือสถานที่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-neutral-700 outline-none placeholder:text-neutral-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="ml-2 text-neutral-400 hover:text-neutral-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Pills (Scrollable) */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0 no-scrollbar w-full">
          {categories.map((cat) => {
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors shrink-0 border flex items-center gap-2 ${isActive
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 Content Area */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-neutral-100 shadow-sm flex flex-col items-center">
          <div className="text-4xl mb-4 opacity-50">🍳</div>
          <h4 className="text-lg font-medium text-neutral-900 mb-2">
            ไม่พบร้านอาหารที่คุณค้นหา
          </h4>
          <p className="text-sm text-neutral-500 mb-6">
            ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่ใหม่ดูสิ
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCategory("");
            }}
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative"
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
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 hover:shadow-md hover:border-neutral-200 transition-all duration-300 h-full flex flex-col">
                    {/* Image Section */}
                    <div className="relative w-full aspect-4/3 rounded-[1.25rem] overflow-hidden mb-4 bg-neutral-100">
                      <Image
                        src={getRestaurantImageUrl(r.image_url)}
                        alt={r.name}
                        fill
                        unoptimized={true} // ป้องกัน Error หากดึงรูปจาก External URL ที่ไม่ได้ตั้งค่าใน next.config.js
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-cover transition-[filter] duration-300 group-hover:brightness-95"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Badge Top Left */}
                      <div className="absolute top-3 left-3 bg-white/95 px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-900 shadow-sm border border-white/20 flex items-center gap-1.5">
                        <span>{catInfo.icon}</span>
                        {r.category || "ทั่วไป"}
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
                        className={`absolute top-3 right-3 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 z-10 ${
                          isFavorite("restaurant", r.id)
                            ? "text-rose-500"
                            : "text-neutral-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${isFavorite("restaurant", r.id) ? "fill-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="px-2 pb-2 flex flex-col grow">
                      <h4 className="text-[1.1rem] font-bold text-neutral-900 line-clamp-1 mb-1.5 group-hover:text-neutral-700 transition-colors">
                        {r.name}
                      </h4>
                      <p className="text-sm text-neutral-500 line-clamp-2 mb-4 grow leading-relaxed">
                        {r.description}
                      </p>
                      <p className="text-xs font-bold text-neutral-800 line-clamp-2 mb-4 grow leading-relaxed">
                        {r.min_price} -{" "}
                        {r.max_price} บาท
                      </p>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between mt-auto">
                        <p className="text-sm text-neutral-500 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          <span className="truncate max-w-35">
                            {r.location}
                          </span>
                        </p>

                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-bold text-neutral-900">
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
        <div className="mt-10 flex justify-center lg:hidden">
          <button className="px-8 py-3 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm">
            ดูเพิ่มเติม
          </button>
        </div>
      )}
    </div>
  );
}
