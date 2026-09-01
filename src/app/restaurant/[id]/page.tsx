// src/app/restaurant/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Share,
  Heart,
  Utensils,
  ChevronLeft,
  Navigation,
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

interface RestaurantDetailData {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  phone?: string;
  hours?: string;
  image_url?: [];
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
        console.error("🐛 [Catch Block] เกิด Error ขึ้นระหว่างกระบวนการ:", err);
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
        const errData = await res.json();
        console.error("❌ โหลดรีวิวไม่สำเร็จ:", errData);
        return null;
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
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
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(
    restaurant.location || restaurant.name,
  )}`;

  const priceNode = (
    <span className="text-sm font-semibold text-neutral-600">
      {restaurant.category || "ร้านอาหาร"}
    </span>
  );

  const primaryCta = restaurant.phone ? (
    <a
      href={`tel:${restaurant.phone}`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
    >
      <Phone className="w-4 h-4" /> โทรจองโต๊ะ
    </a>
  ) : (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
    >
      <Navigation className="w-4 h-4" /> นำทาง
    </a>
  );

  const facts: { icon: React.ElementType; label: string; value: string }[] = [];
  if (restaurant.hours)
    facts.push({ icon: Clock, label: "เวลาเปิด-ปิด", value: restaurant.hours });
  if (restaurant.location)
    facts.push({ icon: MapPin, label: "ที่ตั้ง", value: restaurant.location });
  if (restaurant.phone)
    facts.push({ icon: Phone, label: "โทรศัพท์", value: restaurant.phone });
  if (restaurant.category)
    facts.push({
      icon: Utensils,
      label: "ประเภทร้าน",
      value: restaurant.category,
    });

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-16">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/restaurant"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">กลับไปหน้ารวมร้านอาหาร</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-1">
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("restaurant", cleanId)}
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
            href="/restaurant"
            className="hover:text-neutral-900 transition-colors"
          >
            ร้านอาหาร
          </Link>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-900 font-medium truncate max-w-[45vw]">
            {restaurant.name}
          </span>
        </nav>

        {/* Title + meta pills */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 tracking-tight leading-tight mb-3">
          {restaurant.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {avgRating && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-3 py-1 text-sm font-semibold text-neutral-900"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {avgRating}
              <span className="font-normal text-neutral-400">
                · {reviews.length} รีวิว
              </span>
            </a>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {restaurant.category || "ทั่วไป"}
          </span>
          {restaurant.location && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors max-w-full"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{restaurant.location}</span>
            </a>
          )}
        </div>

        <ImageGallery images={images} alt={restaurant.name} />

        {/* Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left */}
          <div className="lg:col-span-2">
            {facts.length > 0 && (
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
            )}

            <h2 className="text-xl font-bold text-neutral-900 mb-3">
              เรื่องราวของร้าน
            </h2>
            <div className="text-[15px] text-neutral-600 leading-loose whitespace-pre-line mb-10">
              {restaurant.description || "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับร้านนี้"}
            </div>

            {restaurant.location && (
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" /> ที่ตั้ง
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                  {restaurant.location}
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
              <h3 className="text-lg font-bold text-neutral-900 mb-4">
                ติดต่อ &amp; ไปยังร้าน
              </h3>
              {restaurant.phone ? (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                >
                  <Phone className="w-4 h-4" /> โทรจองโต๊ะ · {restaurant.phone}
                </a>
              ) : (
                <div className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-neutral-100 text-sm font-bold text-neutral-400">
                  <Phone className="w-4 h-4" /> ไม่มีเบอร์โทรศัพท์
                </div>
              )}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Navigation className="w-4 h-4" /> นำทางด้วย Google Maps
              </a>
              <p className="mt-4 text-center text-xs text-neutral-400">
                แจ้งว่าเห็นร้านจากเว็บไซต์ของเรา
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
            formHeading: "เขียนรีวิวร้านอาหารนี้",
            ratingLabel: "คุณให้คะแนนร้านนี้เท่าไหร่?",
            placeholder: "รสชาติอาหารเป็นอย่างไร? บรรยากาศและการบริการดีไหม? แชร์ให้ทุกคนรู้เลย...",
            emptyText: "เป็นคนแรกที่แชร์ความอร่อยและความประทับใจของร้านนี้สิ!",
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
