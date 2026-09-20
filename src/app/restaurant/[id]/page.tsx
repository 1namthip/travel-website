// src/app/restaurant/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Share2,
  Heart,
  Utensils,
  ChevronLeft,
  Navigation,
  Copy,
  Check,
  Compass,
  Sparkles,
  Coffee,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import ImageGallery from "@/component/ImageGallery";
import PlaceReviews, { type PlaceReview } from "@/component/PlaceReviews";
import PlaceDetailSkeleton from "@/component/PlaceDetailSkeleton";
import PlaceDetailError from "@/component/PlaceDetailError";
import DetailStickyBar from "@/component/DetailStickyBar";
import { useFavorites } from "@/component/FavoritesProvider";
import { mapsSearchUrl } from "@/lib/maps";

interface RestaurantDetailData {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  location?: string;
  phone?: string;
  hours?: string;
  image_url?: string | string[];
}

const getParsedImages = (data: any): string[] => {
  const defaultImg =
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200";
  if (!data) return [defaultImg];

  try {
    if (typeof data === "string" && data.startsWith("[")) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultImg];
    }
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    if (typeof data === "string") {
      return [data];
    }
    return [defaultImg];
  } catch {
    return [defaultImg];
  }
};

export default function RestaurantDetail() {
  const params = useParams();
  const pathname = usePathname();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanId = id?.toString().trim();

  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [restaurant, setRestaurant] = useState<RestaurantDetailData | null>(
    null,
  );
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = !!cleanId && isFavorite("restaurant", cleanId);

  // ================= 1. ดึงข้อมูล Auth & ร้านอาหาร =================
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchSession();

    const fetchRestaurantDetail = async () => {
      if (!cleanId) return;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/restaurants/${cleanId}`);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || "ไม่พบข้อมูลร้านอาหาร หรือเกิดข้อผิดพลาด",
          );
        }

        const data: RestaurantDetailData = await res.json();
        setRestaurant(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "ไม่สามารถโหลดข้อมูลร้านอาหารได้ในขณะนี้",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantDetail();
  }, [cleanId, supabase.auth]);

  // ================= 2. ดึงข้อมูลรีวิว =================
  const fetchReviews = useCallback(async () => {
    if (!cleanId) return null;
    try {
      const res = await fetch(`/api/reviews?restaurant_id=${cleanId}`);
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }, [cleanId]);

  useEffect(() => {
    const loadReviews = async () => {
      const data = await fetchReviews();
      if (data) setReviews(data);
    };
    loadReviews();
  }, [fetchReviews]);

  // ================= 3. ส่ง / ลบ รีวิว =================
  const submitReview = async (rating: number, comment: string) => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำการรีวิว");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: cleanId,
        rating,
        comment,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "ไม่สามารถส่งรีวิวได้");
    }
    const newData = await fetchReviews();
    if (newData) setReviews(newData);
  };

  const handleDeleteReview = async (reviewId: number | string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?")) return;

    try {
      const res = await fetch(`/api/reviews?id=${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบรีวิวไม่สำเร็จ");

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("ลบรีวิวเรียบร้อยแล้ว");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบรีวิว",
      );
    }
  };

  // ================= 4. แชร์ & คัดลอกที่อยู่ =================
  const handleShare = async () => {
    const shareData = {
      title: restaurant?.name || "ร้านอาหาร",
      text: `แนะนำร้านอาหาร: ${restaurant?.name || ""}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user dismissed
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("คัดลอกลิงก์เรียบร้อยแล้ว");
    } catch {
      toast.error("ไม่สามารถคัดลอกลิงก์ได้");
    }
  };

  const handleCopyAddress = async () => {
    if (!restaurant?.location) return;
    try {
      await navigator.clipboard.writeText(restaurant.location);
      setCopiedAddress(true);
      toast.success("คัดลอกที่อยู่เรียบร้อยแล้ว");
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกที่อยู่ได้");
    }
  };

  if (loading) return <PlaceDetailSkeleton />;

  if (error || !restaurant) {
    return (
      <PlaceDetailError
        message={error || "ไม่พบข้อมูลร้านอาหาร"}
        backHref="/restaurant"
        backLabel="กลับไปหน้ารวมร้านอาหาร"
      />
    );
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  const images = getParsedImages(restaurant.image_url);
  const mapsHref = mapsSearchUrl(restaurant.name);

  // Price/Category badge
  const priceNode = (
    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-sm font-bold shadow-2xs">
      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
      <span>{restaurant.category || "ร้านอาหารและเครื่องดื่ม"}</span>
    </div>
  );

  const primaryCta = restaurant.phone ? (
    <a
      href={`tel:${restaurant.phone}`}
      className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all cursor-pointer"
    >
      <Phone className="w-4 h-4 text-amber-300" /> โทรจองโต๊ะ
    </a>
  ) : (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all cursor-pointer"
    >
      <Navigation className="w-4 h-4 text-amber-300" /> นำทาง
    </a>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 lg:pb-16 text-stone-800 selection:bg-teal-100 selection:text-teal-900">
      {/* ── Top Bar (Glassmorphism + Duo-tone accents) ── */}
      <nav className="sticky top-0 z-50 border-b border-stone-200/70 bg-white/85 backdrop-blur-md transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/restaurant"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950 px-3 py-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">กลับไปหน้ารวมร้านอาหาร</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200/80 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="แชร์ร้านนี้"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("restaurant", cleanId)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border shadow-2xs transition-all cursor-pointer active:scale-95 ${
                saved
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-white border-stone-200/80 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  saved ? "fill-rose-500 text-rose-500" : "text-stone-500"
                }`}
              />
              <span className="hidden sm:inline">
                {saved ? "บันทึกแล้ว" : "บันทึก"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Breadcrumb Navigation ── */}
        <nav className="text-xs sm:text-sm text-stone-500 mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
          <Link
            href="/"
            className="hover:text-teal-800 transition-colors inline-flex items-center gap-1"
          >
            หน้าแรก
          </Link>
          <span className="text-stone-300">/</span>
          <Link
            href="/restaurant"
            className="hover:text-teal-800 transition-colors"
          >
            ร้านอาหาร
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900 font-medium truncate max-w-[45vw]">
            {restaurant.name}
          </span>
        </nav>

        {/* ── Title & Duo-Tone Meta Badges ── */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight mb-3 sm:mb-4">
          {restaurant.name}
        </h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-6 sm:mb-8">
          {/* Rating Pill (Sunset Amber) */}
          {avgRating && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 border border-amber-200/80 px-3.5 py-1 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-all shadow-2xs"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
              <span className="text-amber-700/80 font-normal">
                · {reviews.length} รีวิว
              </span>
            </a>
          )}

          {/* Category Pill (Deep Pine Teal) */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200/70 px-3.5 py-1 text-xs sm:text-sm font-semibold text-teal-800 shadow-2xs">
            <Utensils className="w-3.5 h-3.5 text-teal-600" />
            {restaurant.category || "ร้านอาหาร"}
          </span>

          {/* Operating hours pill if available */}
          {restaurant.hours && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold border border-amber-200/70 bg-amber-50 text-amber-900 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{restaurant.hours}</span>
            </div>
          )}

          {/* Location Chip */}
          {restaurant.location && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white px-3.5 py-1 text-xs sm:text-sm font-medium text-stone-600 hover:border-teal-300 hover:text-teal-800 hover:bg-stone-50 transition-colors max-w-full shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{restaurant.location}</span>
            </a>
          )}
        </div>

        {/* ── Image Gallery Section ── */}
        <ImageGallery images={images} alt={restaurant.name} />

        {/* ── Content Grid: 2 Cols Left / 1 Col Right Sticky ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left Column: Details & Story */}
          <div className="lg:col-span-2">
            {/* 1. Quick Facts (Duo-Tone Cards 2x2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-8">
              {/* Card: Opening hours */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-teal-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/15 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    เวลาเปิด-ปิด
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {restaurant.hours || "ไม่ได้ระบุเวลา"}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium mt-1">
                    {restaurant.hours ? "ตรวจสอบเวลาก่อนเดินทาง" : "สอบถามทางร้านโดยตรง"}
                  </p>
                </div>
              </div>

              {/* Card: Category */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-amber-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    ประเภทร้านอาหาร
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {restaurant.category || "อาหารและของทานเล่น"}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    เมนูคัดสรรประจำท้องถิ่น
                  </p>
                </div>
              </div>

              {/* Card: Location & Quick Copy */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-teal-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                      ที่ตั้งร้าน
                    </p>
                    {restaurant.location && (
                      <button
                        onClick={handleCopyAddress}
                        className="text-[11px] text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                        title="คัดลอกที่อยู่"
                      >
                        {copiedAddress ? (
                          <>
                            <Check className="w-3 h-3 text-teal-600" /> คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> คัดลอก
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">
                    {restaurant.location || "ตามพิกัดแผนที่"}
                  </p>
                </div>
              </div>

              {/* Card: Phone & Call */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-amber-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    เบอร์โทรศัพท์ติดต่อ
                  </p>
                  {restaurant.phone ? (
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="text-sm font-bold text-stone-900 hover:text-teal-800 leading-snug inline-block underline decoration-stone-300 underline-offset-2"
                    >
                      {restaurant.phone}
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-stone-900 leading-snug">
                      ไม่มีเบอร์โทรระบุ
                    </p>
                  )}
                  <p className="text-[11px] text-stone-400 font-medium mt-1">
                    {restaurant.phone ? "กดเพื่อโทรจองหรือสอบถาม" : "สอบถามได้ ณ หน้าร้าน"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Restaurant Story (Editorial Travel Style) */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 mb-8 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-1.5 h-5 bg-teal-700 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                  เรื่องราวและเอกลักษณ์ของร้าน
                </h2>
              </div>
              <div className="text-[15px] sm:text-base text-stone-700 leading-relaxed sm:leading-loose whitespace-pre-line mb-6 font-normal">
                {restaurant.description ||
                  "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับร้านนี้ คุณสามารถแวะไปลิ้มลองความอร่อยหรือสอบถามเมนูแนะนำได้โดยตรง"}
              </div>

              {/* Characteristic highlight tags */}
              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" /> รสชาติต้นตำรับ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Coffee className="w-3.5 h-3.5 text-teal-700" /> บรรยากาศน่านั่ง
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Users className="w-3.5 h-3.5 text-stone-600" /> เหมาะสำหรับครอบครัวและกลุ่มเพื่อน
                </span>
              </div>
            </div>

            {/* 3. Location & Direction Guide Card */}
            {restaurant.location && (
              <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-stone-900">
                      ที่ตั้งและการเดินทาง
                    </h3>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-md hover:bg-teal-50 transition cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> คัดลอกที่อยู่แล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> คัดลอกที่อยู่
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  {restaurant.location}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4.5 py-2.5 text-sm font-bold shadow-sm transition active:scale-95"
                  >
                    <Navigation className="w-4 h-4 text-amber-300" /> เปิดใน Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Sticky Action Card (Desktop) */}
          <div className="lg:col-span-1">
            <div className="hidden lg:block sticky top-20 rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-xl shadow-stone-200/50">
              <div className="mb-5 pb-4 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                  ประเภทอาหาร &amp; บริการ
                </p>
                {priceNode}
              </div>

              {/* Status Banner */}
              {restaurant.hours && (
                <div className="mb-6 p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-stone-200/60 flex items-center justify-center text-stone-500 shadow-2xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-800">เวลาทำการ</p>
                      <p className="text-xs text-stone-500 font-medium">
                        {restaurant.hours}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              {restaurant.phone ? (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex w-full h-12 items-center justify-center gap-2.5 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-amber-300" /> โทรจองโต๊ะ · {restaurant.phone}
                </a>
              ) : (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full h-12 items-center justify-center gap-2.5 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-amber-300" /> นำทางด้วย Google Maps
                </a>
              )}

              {/* Secondary Action */}
              {restaurant.phone && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-stone-200/80 bg-white text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300"
                >
                  <Navigation className="w-4 h-4 text-stone-500" /> นำทางด้วย Google Maps
                </a>
              )}

              {/* Dining Tip Box */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-950/80 leading-relaxed">
                    <strong className="font-semibold text-amber-950">
                      ข้อแนะนำสำหรับนักชิม:{" "}
                    </strong>
                    หากเดินทางมาเป็นกลุ่มใหญ่ หรือต้องการลิ้มลองเมนูเด็ดประจำร้าน แนะนำให้โทรสอบถามโต๊ะล่วงหน้า โดยเฉพาะช่วงวันหยุดและมื้อเย็น
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <PlaceReviews
          reviews={reviews}
          currentUserId={user?.id}
          isLoggedIn={!!user}
          signInHref={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
          onSubmit={submitReview}
          onDelete={handleDeleteReview}
          copy={{
            formHeading: "เขียนรีวิวร้านอาหารนี้",
            ratingLabel: "คุณให้คะแนนความอร่อยและความประทับใจเท่าไหร่?",
            placeholder:
              "รสชาติอาหารเป็นอย่างไร? บรรยากาศและการบริการดีไหม? แชร์ความรู้สึกให้เพื่อนๆ นักเดินทางรู้เลย...",
            emptyText:
              "เป็นคนแรกที่แชร์ความอร่อยและประสบการณ์ความประทับใจของร้านนี้สิ!",
          }}
        />
      </main>

      {/* ── Mobile Sticky Bar ── */}
      <DetailStickyBar
        price={<div className="text-sm">{priceNode}</div>}
        cta={primaryCta}
      />
    </div>
  );
}
