// src/app/accommodations/page.tsx (หรือ path ปัจจุบันของคุณ)
"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {Navbar} from "@/component/User/Navbar";
import { useFavorites } from "@/component/FavoritesProvider";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { 
  Search, 
  MapPin, 
  Heart, 
  ChevronRight, 
  Home, 
  Banknote, 
  X, 
  BedDouble,
  AlertCircle
} from "lucide-react";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  price_range: string;
  category: string;
  contact_phone: string;
  contact_line: string;
  contact_facebook: string;
  images: string[];
  created_by: string;
  created_at: string;
}

// 🌟 Framer Motion Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const categoryOptions = [
  { value: "all", label: "ทุกประเภท", icon: "✨" },
  { value: "โรงแรม", label: "โรงแรม", icon: "🏡" },
  { value: "คอนโด", label: "คอนโด", icon: "🏢" },
  { value: "หอพัก", label: "หอพัก", icon: "🚪" },
  { value: "อพาร์ทเมนท์", label: "อพาร์ทเมนท์", icon: "🏙️" },
  { value: "โฮมสเตย์", label: "โฮมสเตย์", icon: "🏕️" },
];

const priceRanges = [
  { value: "all", label: "ทุกราคา" },
  { value: "0-3000", label: "ต่ำกว่า 3,000 บาท" },
  { value: "3000-5000", label: "3,000 - 5,000 บาท" },
  { value: "5000-10000", label: "5,000 - 10,000 บาท" },
  { value: "10000+", label: "มากกว่า 10,000 บาท" },
];

// 📸 ฟังก์ชันจัดการรูปภาพตามที่คุณกำหนด
const getFirstImageUrl = (data: any): string => {
  if (!data) return "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70";
  
  try {
    // 1. ถ้าเป็น String JSON เช่น '["url1", "url2"]'
    if (typeof data === 'string' && data.startsWith('[')) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed[0] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70") : data;
    }
    // 2. ถ้าเป็น Array ปกติ ['url1', 'url2']
    if (Array.isArray(data)) {
      return data[0] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70";
    }
    // 3. ถ้าเป็น String URL ปกติ (ข้อมูลเก่า)
    return data;
  } catch {
    return data; // ถ้า Parse พลาด ให้ส่งกลับเป็น data เดิมไป
  }
};

export default function AccommodationsPage() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await createSupabaseClient()
          .from("accommodations")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        setAccommodations(data || []);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        setError(errorMessage);
        console.error("Error fetching accommodations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccommodations();
  }, []);

  // Filter logic
  const filteredAccommodations = useMemo(() => {
    return accommodations.filter((acc) => {
      const matchesSearch =
        searchQuery === "" ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.address?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || acc.category === selectedCategory;

      let matchesPrice = true;
      if (priceFilter !== "all" && acc.price_range) {
        const priceNum = parseInt(acc.price_range.replace(/[^\d]/g, ""));
        if (!isNaN(priceNum)) {
          switch (priceFilter) {
            case "0-3000":
              matchesPrice = priceNum <= 3000;
              break;
            case "3000-5000":
              matchesPrice = priceNum > 3000 && priceNum <= 5000;
              break;
            case "5000-10000":
              matchesPrice = priceNum > 5000 && priceNum <= 10000;
              break;
            case "10000+":
              matchesPrice = priceNum > 10000;
              break;
          }
        }
      }

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [accommodations, searchQuery, selectedCategory, priceFilter]);

  return (
    <>
      <Navbar />

      {/* 🌟 Hero Banner Section */}
      <div className="relative w-full min-h-100 md:min-h-125 bg-neutral-900 flex flex-col items-center justify-center overflow-hidden pt-20 pb-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/banner3.png')" }}
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

        <div className="relative z-10 text-center px-4 md:px-8 w-full max-w-4xl mx-auto mt-8">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-md tracking-tight leading-tight"
          >
            ค้นหาที่พักใน<span className="text-amber-400">โคราช</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-neutral-200 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-medium drop-shadow-md"
          >
            ไม่ว่าจะเป็นบ้านพักตากอากาศ คอนโดใจกลางเมือง หรือโฮมสเตย์ชิลๆ เราคัดสรรมาให้คุณแล้ว
          </motion.p>
        </div>
      </div>

      <main className="w-full max-w-350 mx-auto px-4 sm:px-6 pb-20">
        
        {/* 🌟 Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex mt-6 mb-4">
          <ol className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 font-medium">
            <li>
              <Link href="/" className="hover:text-teal-700 transition-colors flex items-center gap-1.5 focus:outline-none group">
                <Home className="w-4 h-4" />
                <span>หน้าแรก</span>
              </Link>
            </li>
            <li><ChevronRight className="w-4 h-4 text-stone-400" /></li>
            <li aria-current="page">
              <span className="text-stone-900 font-semibold">ที่พัก</span>
            </li>
          </ol>
        </nav>

        {/* 🌟 Section Header & Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                  ที่พักแนะนำ
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs">
                  {filteredAccommodations.length} แห่ง
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                เลือกพักผ่อนสบายๆ ไม่ว่าจะเป็นโรงแรม คอนโด หอพัก หรือโฮมสเตย์ในโคราช
                {(searchQuery !== "" || selectedCategory !== "all" || priceFilter !== "all") && " (กำลังกรอง)"}
              </p>
            </div>

            {/* Search & Price Filter Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100/90 group-focus-within:bg-teal-50 flex items-center justify-center transition-colors pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-stone-400 group-focus-within:text-teal-700 transition-colors" strokeWidth={2.2} />
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อที่พัก, ทำเล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-9 py-2.5 rounded-full border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label="ล้างการค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Price Dropdown */}
              <div className="relative w-36 sm:w-44 shrink-0">
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-8 rounded-full border border-stone-200 text-xs sm:text-sm font-medium text-stone-700 shadow-2xs focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none transition-all cursor-pointer"
                >
                  {priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-stone-400">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              {/* Clear button */}
              {(searchQuery !== "" || selectedCategory !== "all" || priceFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setPriceFilter("all");
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-stone-200 bg-white text-xs font-medium text-stone-500 hover:text-stone-800 hover:border-stone-300 transition-all shadow-2xs shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Categories Pills */}
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
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

        {/* 🚨 Error Message */}
        {error && (
          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-10 mb-8 text-center shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              🚨
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-sm text-red-600/80 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-teal-700 hover:bg-teal-800 transition-colors text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* 🌟 Content Area */}
        {loading ? (
          // Skeleton Loading 4 Columns
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
        ) : filteredAccommodations.length > 0 ? (
          // Grid Data
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {filteredAccommodations.map((acc) => (
              <motion.div variants={itemVariants} key={acc.id}>
                <Link href={`/accommodations/${acc.id}`} className="block outline-none group h-full">
                  <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-stone-200/80 hover:shadow-lg hover:border-teal-300/80 hover:-translate-y-1 transition-all duration-300 ease-out h-full flex flex-col">

                    {/* Image Section */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-3 bg-stone-100">
                      <Image
                        src={getFirstImageUrl(acc.images)}
                        alt={acc.name}
                        fill
                        unoptimized={true}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Badge Top Left */}
                      <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-stone-900 shadow-2xs border border-white/60 flex items-center gap-1.5">
                        <span className="text-xs">
                          {categoryOptions.find(c => c.value === acc.category)?.icon || "🏠"}
                        </span>
                        <span>{acc.category}</span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite("accommodation", acc.id);
                        }}
                        aria-label="เก็บไว้ในคอลเลคชั่น"
                        className={`absolute top-2.5 right-2.5 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xs border border-white/60 z-10 ${
                          isFavorite("accommodation", acc.id)
                            ? "text-rose-500"
                            : "text-stone-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFavorite("accommodation", acc.id) ? "fill-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="px-1 pb-1 flex flex-col grow justify-between gap-2">
                      <div>
                        <h4 className="text-[15px] sm:text-base font-bold text-stone-900 line-clamp-1 mb-1 group-hover:text-teal-800 transition-colors leading-snug">
                          {acc.name}
                        </h4>
                        <p className="text-xs text-stone-500 line-clamp-2 mb-2 leading-relaxed">
                          {acc.description || "ที่พักพร้อมสิ่งอำนวยความสะดวกครบครันในโคราช"}
                        </p>

                        <p className="text-xs text-stone-500 flex items-center gap-1 font-medium truncate">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">
                            {acc.address || "นครราชสีมา"}
                          </span>
                        </p>
                      </div>

                      {/* Bottom Info Row */}
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between mt-2 gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/70">
                          <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{acc.price_range || "สอบถามราคา"}</span>
                        </span>

                        <span className="text-[11px] font-semibold text-teal-800 group-hover:underline">
                          ดูห้องพัก →
                        </span>
                      </div>
                    </div>

                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Empty State
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-16 text-center border border-stone-200/80 shadow-xs flex flex-col items-center mt-4"
          >
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
              <BedDouble className="w-8 h-8 text-stone-400" />
            </div>
            <h4 className="text-base font-semibold text-stone-900 mb-2">ไม่พบที่พักที่คุณค้นหา</h4>
            <p className="text-sm text-stone-500 mb-6 max-w-sm">
              ลองปรับเปลี่ยนคำค้นหา ปรับช่วงราคา หรือเลือกหมวดหมู่อื่นดูนะครับ
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setPriceFilter("all");
              }}
              className="px-6 py-2.5 bg-teal-700 text-white rounded-full text-sm font-semibold hover:bg-teal-800 transition-colors shadow-2xs"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </motion.div>
        )}
      </main>
    </>
  );
}