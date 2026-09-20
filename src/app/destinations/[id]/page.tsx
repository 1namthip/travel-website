// src/app/destinations/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Share2,
  Heart,
  Navigation,
  ChevronLeft,
  Ticket,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Compass,
  Sparkles,
  Camera,
  Users,
  Car,
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
import { getPlaceOpeningStatus } from "@/lib/opening-hours";
import type { OpeningHoursMap } from "@/types/destination";

interface DestinationDetailData {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  location?: string;
  phone?: string;
  hours?: string;
  min_price?: number;
  max_price?: number;
  image_url?: string;
  images?: string[];
  open_days?: string[];
  opening_hours?: OpeningHoursMap;
}

// 📸 ฟังก์ชันแปลงข้อมูลรูปภาพให้เป็น Array แบบครอบจักรวาล
const getParsedImages = (data: any, fallbackData?: any): string[] => {
  const defaultImg =
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200";
  const sourceToParse = data || fallbackData;

  if (!sourceToParse) return [defaultImg];

  try {
    if (typeof sourceToParse === "string" && sourceToParse.startsWith("[")) {
      const parsed = JSON.parse(sourceToParse);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultImg];
    }
    if (Array.isArray(sourceToParse) && sourceToParse.length > 0) {
      return sourceToParse;
    }
    if (typeof sourceToParse === "string") {
      return [sourceToParse];
    }
    return [defaultImg];
  } catch {
    return [defaultImg];
  }
};

export default function DestinationDetail() {
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
  const [destination, setDestination] = useState<DestinationDetailData | null>(
    null,
  );
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = !!cleanId && isFavorite("destination", cleanId);

  // ================= 1. ดึงข้อมูล Auth & สถานที่ =================
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchSession();

    const fetchDestinationDetail = async () => {
      if (!cleanId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/destinations/${cleanId}`);
        if (!res.ok) throw new Error("ไม่พบข้อมูลสถานที่ หรือเกิดข้อผิดพลาด");
        const data: DestinationDetailData = await res.json();
        setDestination(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDestinationDetail();
  }, [cleanId, supabase.auth]);

  // ================= 2. ดึงข้อมูลรีวิว =================
  const fetchReviews = useCallback(async () => {
    if (!cleanId) return null;
    try {
      const res = await fetch(`/api/reviews?destination_id=${cleanId}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return await res.json();
    } catch {
      return null;
    }
  }, [cleanId]);

  useEffect(() => {
    fetchReviews().then((d) => d && setReviews(d));
  }, [fetchReviews]);

  // ================= 3. ส่ง / ลบ รีวิว =================
  const submitReview = async (rating: number, comment: string) => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำการรีวิว");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_id: cleanId,
        rating,
        comment,
      }),
    });
    if (!res.ok) throw new Error("ไม่สามารถส่งรีวิวได้");
    const updated = await fetchReviews();
    if (updated) setReviews(updated);
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
      title: destination?.name || "สถานที่ท่องเที่ยว",
      text: `แนะนำสถานที่ท่องเที่ยว: ${destination?.name || ""}`,
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
    if (!destination?.location) return;
    try {
      await navigator.clipboard.writeText(destination.location);
      setCopiedAddress(true);
      toast.success("คัดลอกที่อยู่เรียบร้อยแล้ว");
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกที่อยู่ได้");
    }
  };

  if (loading) return <PlaceDetailSkeleton />;

  if (error || !destination) {
    return (
      <PlaceDetailError
        message={error || "ไม่พบข้อมูลสถานที่"}
        backHref="/destinations"
        backLabel="กลับไปหน้ารวมสถานที่"
      />
    );
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  const images = getParsedImages(destination.images, destination.image_url);
  const minPrice = destination.min_price || 0;
  const maxPrice = destination.max_price || 0;
  const isFree = maxPrice === 0;

  // ค้น Google Maps ด้วย "ชื่อสถานที่"
  const mapsHref = mapsSearchUrl(destination.name);

  // การแสดงราคาแบบ Duo-Tone พรีเมียม
  const priceNode = isFree ? (
    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-sm font-bold shadow-2xs">
      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
      <span>เข้าชมฟรี</span>
    </div>
  ) : (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
        {minPrice === maxPrice
          ? `฿${minPrice.toLocaleString()}`
          : `฿${minPrice.toLocaleString()}–${maxPrice.toLocaleString()}`}
      </span>
      <span className="text-xs sm:text-sm text-stone-500 font-medium">/ ท่าน</span>
    </div>
  );

  // ปุ่ม CTA หลัก
  const primaryCta = (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all cursor-pointer"
    >
      <Navigation className="w-4 h-4 text-amber-300" /> นำทาง
    </a>
  );

  const openingStatus = getPlaceOpeningStatus(destination);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 lg:pb-16 text-stone-800 selection:bg-teal-100 selection:text-teal-900">
      {/* ── Top Bar (Glassmorphism + Duo-tone accents) ── */}
      <nav className="sticky top-0 z-50 border-b border-stone-200/70 bg-white/85 backdrop-blur-md transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950 px-3 py-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">กลับไปหน้ารวมสถานที่</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200/80 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="แชร์สถานที่ท่องเที่ยวนี้"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("destination", cleanId)}
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
            href="/destinations"
            className="hover:text-teal-800 transition-colors"
          >
            สถานที่ท่องเที่ยว
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900 font-medium truncate max-w-[45vw]">
            {destination.name}
          </span>
        </nav>

        {/* ── Title & Duo-Tone Meta Badges ── */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight mb-3 sm:mb-4">
          {destination.name}
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
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            {destination.category || "จุดหมายปลายทาง"}
          </span>

          {/* Live Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold border shadow-2xs ${
              openingStatus.isOpenNow
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/70"
                : openingStatus.isTodayOpen
                ? "bg-amber-50 text-amber-800 border-amber-200/70"
                : "bg-stone-100 text-stone-600 border-stone-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                openingStatus.isOpenNow
                  ? "bg-emerald-500 animate-pulse"
                  : openingStatus.isTodayOpen
                  ? "bg-amber-500"
                  : "bg-stone-400"
              }`}
            />
            <span>{openingStatus.badgeLabel}</span>
          </div>

          {/* Location Chip */}
          {destination.location && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white px-3.5 py-1 text-xs sm:text-sm font-medium text-stone-600 hover:border-teal-300 hover:text-teal-800 hover:bg-stone-50 transition-colors max-w-full shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{destination.location}</span>
            </a>
          )}
        </div>

        {/* ── Image Gallery Section ── */}
        <ImageGallery images={images} alt={destination.name} />

        {/* ── Content Grid: 2 Cols Left / 1 Col Right Sticky ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left Column: Details & Insights */}
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
                    เวลาทำการวันนี้
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {openingStatus.isTodayOpen
                      ? openingStatus.todayHoursText
                      : "วันนี้ปิดทำการ"}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium mt-1">
                    {openingStatus.badgeLabel}
                  </p>
                </div>
              </div>

              {/* Card: Admission Ticket */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-amber-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    ค่าเข้าชม
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {isFree
                      ? "เข้าชมฟรี"
                      : minPrice === maxPrice
                      ? `฿${minPrice.toLocaleString()} / ท่าน`
                      : `฿${minPrice.toLocaleString()}–${maxPrice.toLocaleString()} / ท่าน`}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    {isFree ? "ไม่มีค่าบริการเข้าชม" : "ราคาสำหรับบุคคลทั่วไป"}
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
                      ที่ตั้ง
                    </p>
                    {destination.location && (
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
                    {destination.location || "ไม่มีข้อมูลที่ตั้งระบุ"}
                  </p>
                </div>
              </div>

              {/* Card: Contact / Phone */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-amber-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    ติดต่อสอบถาม
                  </p>
                  {destination.phone ? (
                    <a
                      href={`tel:${destination.phone}`}
                      className="text-sm font-bold text-stone-900 hover:text-teal-800 leading-snug inline-block underline decoration-stone-300 underline-offset-2"
                    >
                      {destination.phone}
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-stone-900 leading-snug">
                      ไม่มีเบอร์ติดต่อระบุ
                    </p>
                  )}
                  <p className="text-[11px] text-stone-400 font-medium mt-1">
                    {destination.phone ? "กดเพื่อโทรออกได้ทันที" : "สอบถามข้อมูลเพิ่มเติมที่จุดบริการ"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 7 Days Operating Schedule Section */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 mb-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      วันและเวลาเปิดให้บริการ
                    </h3>
                    <p className="text-xs text-stone-500">
                      {openingStatus.openDaysSummary}
                    </p>
                  </div>
                </div>

                {/* Live Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    openingStatus.isOpenNow
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : openingStatus.isTodayOpen
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      openingStatus.isOpenNow
                        ? "bg-emerald-500 animate-pulse"
                        : openingStatus.isTodayOpen
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  {openingStatus.badgeLabel}
                </div>
              </div>

              {/* 7 Days Schedule Table */}
              <div className="divide-y divide-stone-100 rounded-2xl overflow-hidden border border-stone-100 bg-stone-50/30">
                {openingStatus.schedule.map((day) => (
                  <div
                    key={day.key}
                    className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      day.isToday
                        ? "bg-amber-50/70 font-semibold border-l-4 border-l-amber-500 pl-3.5"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          day.isToday
                            ? "text-amber-950 font-bold"
                            : "text-stone-700"
                        }
                      >
                        {day.fullLabel}
                      </span>
                      {day.isToday && (
                        <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                          วันนี้
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {day.isOpen ? (
                        <>
                          <span className="text-stone-600 text-xs sm:text-sm font-medium">
                            {day.timeDisplay}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            เปิด
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                          <XCircle className="w-3 h-3 text-stone-400" />
                          ปิดทำการ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Description (Editorial Travel Style) */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 mb-8 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-1.5 h-5 bg-teal-700 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                  เกี่ยวกับสถานที่นี้
                </h2>
              </div>
              <div className="text-[15px] sm:text-base text-stone-700 leading-relaxed sm:leading-loose whitespace-pre-line mb-6 font-normal">
                {destination.description ||
                  "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับสถานที่นี้ สามารถตรวจสอบข้อมูลเพิ่มเติม ณ จุดบริการหรือสอบถามผ่านช่องทางติดต่อ"}
              </div>

              {/* Characteristic highlight tags */}
              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Camera className="w-3.5 h-3.5 text-amber-600" /> จุดถ่ายรูปยอดนิยม
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Users className="w-3.5 h-3.5 text-teal-700" /> เหมาะสำหรับครอบครัวและกลุ่มเพื่อน
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Car className="w-3.5 h-3.5 text-stone-600" /> มีจุดจอดรถรองรับ
                </span>
              </div>
            </div>

            {/* 4. Location & Direction Guide Card */}
            {destination.location && (
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
                  {destination.location}
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
              {/* Price Row */}
              <div className="mb-5 pb-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    ค่าธรรมเนียมเข้าชม
                  </p>
                  {priceNode}
                </div>
                {isFree && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200/60">
                    Free
                  </span>
                )}
              </div>

              {/* Status Banner */}
              <div className="mb-6 p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-200/60 flex items-center justify-center text-stone-500 shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-800">เวลาทำการวันนี้</p>
                    <p className="text-xs text-stone-500 font-medium">
                      {openingStatus.isTodayOpen
                        ? openingStatus.todayHoursText
                        : "วันนี้ปิดทำการ"}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    openingStatus.isOpenNow
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : openingStatus.isTodayOpen
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {openingStatus.badgeLabel}
                </span>
              </div>

              {/* Primary CTA Button (Pine Teal + Amber Accent) */}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full h-12 items-center justify-center gap-2.5 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-amber-300" /> นำทางด้วย Google Maps
              </a>

              {/* Secondary CTA (Phone) */}
              {destination.phone && (
                <a
                  href={`tel:${destination.phone}`}
                  className="mt-3 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-stone-200/80 bg-white text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300"
                >
                  <Phone className="w-4 h-4 text-stone-500" /> {destination.phone}
                </a>
              )}

              {/* Travel Tip Card */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-950/80 leading-relaxed">
                    <strong className="font-semibold text-amber-950">
                      คำแนะนำการเดินทาง:{" "}
                    </strong>
                    ควรตรวจสอบสภาพอากาศและเวลาทำการก่อนออกเดินทาง เพื่อให้การท่องเที่ยวราบรื่นและได้ภาพบรรยากาศที่ดีที่สุด
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
            formHeading: "เขียนรีวิวสถานที่นี้",
            ratingLabel: "คุณให้คะแนนความประทับใจเท่าไหร่?",
            placeholder:
              "สถานที่สวยงามไหม? บรรยากาศเป็นอย่างไร? แชร์ให้คนอื่นรู้เลย...",
            emptyText:
              "เป็นคนแรกที่แชร์ประสบการณ์และความประทับใจของสถานที่นี้สิ!",
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
