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

      <main className="w-full max-w-350 mx-auto px-4 sm:px-6 pb-24">
        
        {/* 🌟 Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex mt-6 mb-8">
          <ol className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
            <li>
              <Link href="/" className="hover:text-amber-600 transition-colors flex items-center gap-1.5 focus:outline-none group">
                <Home className="w-4 h-4" />
                <span>หน้าแรก</span>
              </Link>
            </li>
            <li><ChevronRight className="w-4 h-4 text-neutral-400" /></li>
            <li aria-current="page">
              <span className="text-neutral-900 font-bold">สถานที่พักผ่อน</span>
            </li>
          </ol>
        </nav>

        {/* 🌟 Section Header & Filters */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-2">
                รายการที่พัก
              </h2>
              <p className="text-sm sm:text-base font-medium text-neutral-500">
                พบ <span className="text-amber-600 font-bold">{filteredAccommodations.length}</span> รายการที่ตรงกับใจคุณ
              </p>
            </div>

            {/* Search & Price Filter Controls */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex items-center bg-white px-5 py-3 rounded-full border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-colors w-full sm:w-72 lg:w-80 group">
                <Search className="w-4 h-4 text-neutral-400 mr-3 shrink-0 group-focus-within:text-amber-600 transition-colors" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อที่พัก, ทำเลที่ตั้ง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400 placeholder:font-normal"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="ml-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 p-1 rounded-full transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Price Dropdown */}
              <div className="relative w-full sm:w-48 shrink-0">
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full appearance-none bg-white px-5 py-3 pr-10 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 shadow-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-colors cursor-pointer"
                >
                  {priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-neutral-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>
          </div>

          {/* Categories Pills (Scrollable) */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 no-scrollbar w-full">
            {categoryOptions.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors shrink-0 border flex items-center gap-2.5 ${
                    isActive
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900"
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🚨 Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm max-w-3xl mx-auto">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900 mb-1">เกิดข้อผิดพลาด</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 🌟 Content Area */}
        {loading ? (
          // Skeleton Loading 3-4 Columns
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 animate-pulse">
                <div className="w-full aspect-4/3 bg-neutral-200/80 rounded-xl mb-5" />
                <div className="px-2 space-y-4 pb-2">
                  <div className="h-5 bg-neutral-200/80 rounded-md w-3/4" />
                  <div className="space-y-2">
                    <div className="h-3.5 bg-neutral-200/80 rounded-md w-full" />
                    <div className="h-3.5 bg-neutral-200/80 rounded-md w-2/3" />
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                    <div className="h-4 bg-neutral-200/80 rounded-md w-1/3" />
                    <div className="h-6 bg-neutral-200/80 rounded-md w-1/4" />
                  </div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
          >
            {filteredAccommodations.map((acc) => (
              <motion.div variants={itemVariants} key={acc.id}>
                <Link href={`/accommodations/${acc.id}`} className="block outline-none group h-full">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 hover:shadow-md hover:border-neutral-200 transition-all duration-300 h-full flex flex-col relative z-10">

                    {/* Image Section */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-5 bg-neutral-100">
                      <Image
                        src={getFirstImageUrl(acc.images)}
                        alt={acc.name}
                        fill
                        unoptimized={true} // ป้องกัน Error จาก External Image Domain
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-[filter] duration-300 group-hover:brightness-95"
                      />

                      {/* Badge Top Left */}
                      <div className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full text-[0.7rem] font-bold text-neutral-900 shadow-sm flex items-center gap-1.5">
                        <span className="text-xs">
                          {categoryOptions.find(c => c.value === acc.category)?.icon || "🏠"}
                        </span>
                        {acc.category}
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
                        className={`absolute top-3 right-3 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center transition-colors shadow-sm z-10 ${
                          isFavorite("accommodation", acc.id)
                            ? "text-rose-500"
                            : "text-neutral-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${isFavorite("accommodation", acc.id) ? "fill-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="px-3 pb-3 flex flex-col grow">
                      <h4 className="text-lg font-bold text-neutral-900 line-clamp-1 mb-1.5 group-hover:text-amber-700 transition-colors">
                        {acc.name}
                      </h4>
                      <p className="text-sm text-neutral-500 line-clamp-2 mb-5 grow leading-relaxed">
                        {acc.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                      </p>

                      <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-1.5 text-neutral-500 min-w-0 flex-1">
                          <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {acc.address || "ไม่ระบุตำแหน่ง"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100 shrink-0">
                          <Banknote className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-amber-800 whitespace-nowrap">
                            {acc.price_range || "สอบถาม"}
                          </span>
                        </div>
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
            className="bg-white rounded-2xl p-16 text-center border border-neutral-100 shadow-sm flex flex-col items-center mt-8"
          >
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
              <BedDouble className="w-8 h-8 text-neutral-300" />
            </div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">ไม่พบที่พักที่คุณค้นหา</h4>
            <p className="text-neutral-500 mb-8 max-w-sm leading-relaxed">
              ลองปรับเปลี่ยนคำค้นหา ปรับช่วงราคา หรือเลือกหมวดหมู่ให้กว้างขึ้นดูนะครับ
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setPriceFilter("all");
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </motion.div>
        )}
      </main>
    </>
  );
}