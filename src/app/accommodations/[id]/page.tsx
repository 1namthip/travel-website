// src/app/accommodations/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { facebookUrl, lineUrl } from "@/lib/social";
import {
  MapPin,
  Phone,
  Star,
  MessageSquare,
  Share2,
  Heart,
  Tag,
  Wallet,
  ChevronLeft,
  Navigation,
  Copy,
  Check,
  Compass,
  Sparkles,
  Bed,
  Users,
  ShieldCheck,
} from "lucide-react";

interface AccommodationDetailData {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  contact_phone?: string;
  contact_line?: string;
  contact_facebook?: string;
  min_price?: number;
  max_price?: number;
  images?: any;
}

const getParsedImages = (data: any): string[] => {
  const defaultImg =
    "https://images.unsplash.com/photo-1566073771259-d3428f588a08?w=1200";
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

/** decodeURIComponent ที่ไม่ throw เมื่อเจอ % ที่ไม่สมบูรณ์ */
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 666.667 666.667"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <clipPath id="facebook-icon-clip">
        <path d="M0 700h700V0H0Z" />
      </clipPath>
    </defs>
    <g
      clipPath="url(#facebook-icon-clip)"
      transform="matrix(1.33333 0 0 -1.33333 -133.333 800)"
    >
      <path
        d="M0 0c0 138.071-111.929 250-250 250S-500 138.071-500 0c0-117.245 80.715-215.622 189.606-242.638v166.242h-51.552V0h51.552v32.919c0 85.092 38.508 124.532 122.048 124.532 15.838 0 43.167-3.105 54.347-6.211V81.986c-5.901.621-16.149.932-28.882.932-40.993 0-56.832-15.528-56.832-55.9V0h81.659l-14.028-76.396h-67.631v-171.773C-95.927-233.218 0-127.818 0 0"
        fill="#0866ff"
        fillRule="nonzero"
        stroke="none"
        transform="translate(600 350)"
      />
      <path
        d="m0 0 14.029 76.396H-67.63v27.019c0 40.372 15.838 55.899 56.831 55.899 12.733 0 22.981-.31 28.882-.931v69.253c-11.18 3.106-38.509 6.212-54.347 6.212-83.539 0-122.048-39.441-122.048-124.533V76.396h-51.552V0h51.552v-166.242a250.559 250.559 0 0 1 60.394-7.362c10.254 0 20.358.632 30.288 1.831V0Z"
        fill="#fff"
        fillRule="nonzero"
        stroke="none"
        transform="translate(447.918 273.604)"
      />
    </g>
  </svg>
);

export default function AccommodationDetail() {
  const params = useParams();
  const pathname = usePathname();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanId = id ? safeDecode(id.toString()).trim() : undefined;

  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [accommodation, setAccommodation] =
    useState<AccommodationDetailData | null>(null);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = !!cleanId && isFavorite("accommodation", cleanId);

  // id จริงของที่พัก (uuid) — ได้จากข้อมูลที่โหลดสำเร็จเท่านั้น ใช้เป็น key ของรีวิว
  const accId = accommodation?.id != null ? String(accommodation.id) : null;

  // ================= Auth session =================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, [supabase]);

  // ================= โหลดข้อมูลที่พัก + รีวิวของมัน =================
  useEffect(() => {
    if (!cleanId) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/accomodations/${encodeURIComponent(cleanId)}`,
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || "ไม่พบข้อมูลที่พัก หรือเกิดข้อผิดพลาด",
          );
        }

        const data: AccommodationDetailData = await res.json();
        if (!alive) return;
        setAccommodation(data);

        // ดึงรีวิวด้วย id จริง
        const revRes = await fetch(
          `/api/reviews?accommodation_id=${encodeURIComponent(String(data.id))}`,
        );
        if (alive && revRes.ok) {
          const list = await revRes.json();
          if (Array.isArray(list)) setReviews(list);
        }
      } catch (err: unknown) {
        if (alive) {
          setError(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cleanId]);

  // ================= ส่ง / ลบ รีวิว =================
  const reloadReviews = useCallback(async () => {
    if (!accId) return;
    try {
      const res = await fetch(
        `/api/reviews?accommodation_id=${encodeURIComponent(accId)}`,
      );
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) setReviews(list);
    } catch {
      // ignore review error
    }
  }, [accId]);

  const submitReview = async (rating: number, comment: string) => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำการรีวิว");
    if (!accId) throw new Error("ยังโหลดข้อมูลที่พักไม่เสร็จ");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accommodation_id: accId,
        rating,
        comment,
        created_by: user.id,
      }),
    });
    if (!res.ok) throw new Error("ไม่สามารถส่งรีวิวได้");
    await reloadReviews();
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
      title: accommodation?.name || "ที่พัก",
      text: `แนะนำที่พัก: ${accommodation?.name || ""}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled
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
    if (!accommodation?.address) return;
    try {
      await navigator.clipboard.writeText(accommodation.address);
      setCopiedAddress(true);
      toast.success("คัดลอกที่อยู่เรียบร้อยแล้ว");
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกที่อยู่ได้");
    }
  };

  if (loading) return <PlaceDetailSkeleton />;

  if (error || !accommodation) {
    return (
      <PlaceDetailError
        message={error || "ไม่พบข้อมูลที่พัก"}
        backHref="/accommodations"
        backLabel="กลับไปหน้าค้นหาที่พัก"
      />
    );
  }

  const images = getParsedImages(accommodation.images);
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  const minP = accommodation.min_price ?? 0;
  const maxP = accommodation.max_price ?? 0;
  const noPrice = maxP === 0;
  const mapsHref = mapsSearchUrl(accommodation.name);
  const lineHref = lineUrl(accommodation.contact_line);
  const facebookHref = facebookUrl(accommodation.contact_facebook);

  const priceText = noPrice
    ? "สอบถามราคา"
    : minP === maxP
      ? `฿${maxP.toLocaleString()}`
      : `฿${minP.toLocaleString()}–${maxP.toLocaleString()}`;

  const priceNode = noPrice ? (
    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-sm font-bold shadow-2xs">
      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
      <span>สอบถามราคาที่พัก</span>
    </div>
  ) : (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
        {priceText}
      </span>
      <span className="text-xs sm:text-sm text-stone-500 font-medium">/ คืน</span>
    </div>
  );

  const primaryCta = lineHref ? (
    <a
      href={lineHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-[#00B900] hover:bg-[#009900] active:scale-[0.98] px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all cursor-pointer"
    >
      <MessageSquare className="w-4 h-4 text-white" /> ติดต่อผ่าน LINE
    </a>
  ) : accommodation.contact_phone ? (
    <a
      href={`tel:${accommodation.contact_phone}`}
      className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all cursor-pointer"
    >
      <Phone className="w-4 h-4 text-amber-300" /> โทรสอบถาม
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
            href="/accommodations"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950 px-3 py-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">กลับไปหน้าค้นหาที่พัก</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200/80 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="แชร์ที่พักนี้"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("accommodation", cleanId)}
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
            href="/accommodations"
            className="hover:text-teal-800 transition-colors"
          >
            ที่พัก
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900 font-medium truncate max-w-[45vw]">
            {accommodation.name}
          </span>
        </nav>

        {/* ── Title & Duo-Tone Meta Badges ── */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight mb-3 sm:mb-4">
          {accommodation.name}
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
          {accommodation.category && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200/70 px-3.5 py-1 text-xs sm:text-sm font-semibold text-teal-800 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-teal-600" />
              {accommodation.category}
            </span>
          )}

          {/* Price pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold border border-amber-200/70 bg-amber-50 text-amber-900 shadow-2xs">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span>{priceText} {!noPrice && "/ คืน"}</span>
          </div>

          {/* Location Chip */}
          {accommodation.address && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white px-3.5 py-1 text-xs sm:text-sm font-medium text-stone-600 hover:border-teal-300 hover:text-teal-800 hover:bg-stone-50 transition-colors max-w-full shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{accommodation.address}</span>
            </a>
          )}
        </div>

        {/* ── Image Gallery Section ── */}
        <ImageGallery images={images} alt={accommodation.name} />

        {/* ── Content Grid: 2 Cols Left / 1 Col Right Sticky ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left Column: Details & Atmosphere */}
          <div className="lg:col-span-2">
            {/* 1. Quick Facts (Duo-Tone Cards 2x2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-8">
              {/* Card: Price */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-amber-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    ราคาห้องพักเริ่มต้น
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {noPrice ? "สอบถามราคา" : `${priceText} / คืน`}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    {noPrice ? "ติดต่อเพื่อรับเรทราคาวันนี้" : "ราคาอาจปรับตามเทศกาล"}
                  </p>
                </div>
              </div>

              {/* Card: Category */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-4.5 shadow-2xs hover:border-teal-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/15 flex items-center justify-center shrink-0">
                  <Bed className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    ประเภทที่พัก
                  </p>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    {accommodation.category || "รีสอร์ตและโรงแรม"}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium mt-1">
                    บรรยากาศสำหรับการพักผ่อน
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
                      ที่ตั้งที่พัก
                    </p>
                    {accommodation.address && (
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
                    {accommodation.address || "ตามพิกัดแผนที่"}
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
                    เบอร์โทรศัพท์จองห้องพัก
                  </p>
                  {accommodation.contact_phone ? (
                    <a
                      href={`tel:${accommodation.contact_phone}`}
                      className="text-sm font-bold text-stone-900 hover:text-teal-800 leading-snug inline-block underline decoration-stone-300 underline-offset-2"
                    >
                      {accommodation.contact_phone}
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-stone-900 leading-snug">
                      ไม่มีเบอร์โทรระบุ
                    </p>
                  )}
                  <p className="text-[11px] text-stone-400 font-medium mt-1">
                    {accommodation.contact_phone ? "กดเพื่อโทรสอบถามห้องว่าง" : "ติดต่อผ่านช่องทางออนไลน์"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Accommodation Story (Editorial Travel Style) */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 mb-8 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-1.5 h-5 bg-teal-700 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                  รายละเอียดที่พักและสิ่งอำนวยความสะดวก
                </h2>
              </div>
              <div className="text-[15px] sm:text-base text-stone-700 leading-relaxed sm:leading-loose whitespace-pre-line mb-6 font-normal">
                {accommodation.description ||
                  "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับที่พักนี้ คุณสามารถติดต่อสอบถามสิ่งอำนวยความสะดวกและประเภทห้องพักได้โดยตรงกับทางที่พัก"}
              </div>

              {/* Characteristic highlight tags */}
              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Bed className="w-3.5 h-3.5 text-amber-600" /> สะอาด บรรยากาศสงบ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> ปลอดภัย น่าเชื่อถือ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/80 text-stone-700 text-xs font-medium">
                  <Users className="w-3.5 h-3.5 text-stone-600" /> เหมาะสำหรับการพักผ่อนแบบครอบครัว
                </span>
              </div>
            </div>

            {/* 3. Location & Direction Guide Card */}
            {accommodation.address && (
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
                  {accommodation.address}
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
                  ราคาห้องพัก
                </p>
                {priceNode}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {lineHref && (
                  <a
                    href={lineHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full h-12 items-center justify-center gap-2.5 rounded-xl bg-[#00B900] text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-[#009900] active:scale-[0.98] cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-white" /> ติดต่อผ่าน LINE
                  </a>
                )}

                {accommodation.contact_phone && (
                  <a
                    href={`tel:${accommodation.contact_phone}`}
                    className="inline-flex w-full h-12 items-center justify-center gap-2.5 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition-all hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-amber-300" /> โทรจอง · {accommodation.contact_phone}
                  </a>
                )}

                {facebookHref && (
                  <a
                    href={facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-stone-200/80 bg-white text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300"
                  >
                    <FacebookIcon className="w-4 h-4 shrink-0" />
                    เข้าชมเพจ Facebook
                  </a>
                )}

                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-stone-200/80 bg-white text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300"
                >
                  <Navigation className="w-4 h-4 text-stone-500" /> นำทางด้วย Google Maps
                </a>
              </div>

              {/* Booking Tip Box */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                <div className="flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-950/80 leading-relaxed">
                    <strong className="font-semibold text-amber-950">
                      คำแนะนำการจอง:{" "}
                    </strong>
                    ควรโทรสอบถามหรือติดต่อสำรองห้องพักล่วงหน้า โดยเฉพาะในช่วงวันหยุดสุดสัปดาห์หรือช่วงไฮซีซั่น
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
            formHeading: "เขียนรีวิวที่พักนี้",
            ratingLabel: "คุณให้คะแนนความประทับใจของที่พักนี้เท่าไหร่?",
            placeholder:
              "ห้องพักสะอาดไหม? บรรยากาศและการบริการดีไหม? แชร์ความประทับใจให้คนอื่นรู้เลย...",
            emptyText:
              "เป็นคนแรกที่แชร์ประสบการณ์การเข้าพักและความประทับใจของที่นี่สิ!",
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
