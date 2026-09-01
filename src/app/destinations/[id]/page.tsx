// src/app/destinations/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Share,
  Heart,
  Navigation,
  ChevronLeft,
  Ticket,
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
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(
    destination.location || destination.name,
  )}`;

  const priceNode = isFree ? (
    <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
      เข้าชมฟรี
    </span>
  ) : (
    <span className="flex items-baseline gap-1">
      <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
        {minPrice === maxPrice
          ? `฿${minPrice.toLocaleString()}`
          : `฿${minPrice.toLocaleString()}–${maxPrice.toLocaleString()}`}
      </span>
      <span className="text-sm text-neutral-500 font-medium">/ ท่าน</span>
    </span>
  );

  const primaryCta = (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-bold text-white transition-colors hover:bg-black"
    >
      <Navigation className="w-4 h-4" /> นำทาง
    </a>
  );

  const facts: { icon: React.ElementType; label: string; value: string }[] = [];
  if (destination.hours)
    facts.push({ icon: Clock, label: "เวลาทำการ", value: destination.hours });
  if (destination.location)
    facts.push({ icon: MapPin, label: "ที่ตั้ง", value: destination.location });
  if (destination.phone)
    facts.push({ icon: Phone, label: "ติดต่อสอบถาม", value: destination.phone });
  facts.push({
    icon: Ticket,
    label: "ราคาเข้าชม",
    value: isFree
      ? "เข้าชมฟรี"
      : minPrice === maxPrice
        ? `฿${minPrice.toLocaleString()} / ท่าน`
        : `฿${minPrice.toLocaleString()}–${maxPrice.toLocaleString()} / ท่าน`,
  });

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-16">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">กลับไปหน้ารวมสถานที่</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-1">
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("destination", cleanId)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${saved ? "fill-rose-500 text-rose-500" : ""}`}
              />
              <span className="hidden sm:inline">
                {saved ? "บันทึกแล้ว" : "บันทึก"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs sm:text-sm text-neutral-500 mb-4 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-neutral-900 transition-colors">
            หน้าแรก
          </Link>
          <span className="text-neutral-300">›</span>
          <Link
            href="/destinations"
            className="hover:text-neutral-900 transition-colors"
          >
            สถานที่ท่องเที่ยว
          </Link>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-900 font-medium truncate max-w-[45vw]">
            {destination.name}
          </span>
        </nav>

        {/* Title + meta pills */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 tracking-tight leading-tight mb-3">
          {destination.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {avgRating && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {avgRating}
              <span className="font-normal text-white/70">
                · {reviews.length} รีวิว
              </span>
            </a>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {destination.category || "จุดหมายปลายทาง"}
          </span>
          {destination.location && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors max-w-full"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{destination.location}</span>
            </a>
          )}
        </div>

        <ImageGallery images={images} alt={destination.name} />

        {/* Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left */}
          <div className="lg:col-span-2">
            {/* Key facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4"
                >
                  <div className="p-2 bg-neutral-50 rounded-lg text-neutral-600 shrink-0">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-500 mb-0.5">
                      {f.label}
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 leading-snug">
                      {f.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <h2 className="text-xl font-bold text-neutral-900 mb-3">
              เกี่ยวกับสถานที่นี้
            </h2>
            <div className="text-[15px] text-neutral-600 leading-loose whitespace-pre-line mb-10">
              {destination.description || "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับสถานที่นี้"}
            </div>

            {/* Location card */}
            {destination.location && (
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" /> ที่ตั้ง
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                  {destination.location}
                </p>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-neutral-900 hover:underline"
                >
                  เปิดใน Google Maps →
                </a>
              </div>
            )}
          </div>

          {/* Right — sticky action card */}
          <div className="lg:col-span-1">
            <div className="hidden lg:block sticky top-20 rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6">
              <div className="mb-5">{priceNode}</div>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-bold text-white transition-colors hover:bg-black"
              >
                <Navigation className="w-4 h-4" /> นำทางด้วย Google Maps
              </a>
              {destination.phone && (
                <a
                  href={`tel:${destination.phone}`}
                  className="mt-3 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <Phone className="w-4 h-4" /> {destination.phone}
                </a>
              )}
              <p className="mt-4 text-center text-xs text-neutral-400">
                ตรวจสอบเวลาทำการก่อนเดินทางทุกครั้ง
              </p>
            </div>
          </div>
        </div>

        {/* Reviews */}
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
            placeholder: "สถานที่สวยงามไหม? บรรยากาศเป็นอย่างไร? แชร์ให้คนอื่นรู้เลย...",
            emptyText: "เป็นคนแรกที่แชร์ประสบการณ์และความประทับใจของสถานที่นี้สิ!",
          }}
        />
      </main>

      {/* Mobile sticky bar */}
      <DetailStickyBar
        price={<div className="text-sm">{priceNode}</div>}
        cta={primaryCta}
      />
    </div>
  );
}
