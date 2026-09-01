// src/app/accommodations/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
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
import {
  MapPin,
  Phone,
  Star,
  MessageSquare,
  Share,
  Heart,
  Tag,
  Wallet,
  ChevronLeft,
  Navigation,
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
  const cleanId = id?.toString().trim();

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

  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = !!cleanId && isFavorite("accommodation", cleanId);

  // ================= 1. ดึงข้อมูล Auth & ที่พัก =================
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchSession();

    if (!cleanId) return;

    const fetchAccommodationDetail = async () => {
      try {
        setLoading(true);
        const { data, error: supaError } = await createSupabaseClient()
          .from("accommodations")
          .select("*")
          .eq("id", cleanId)
          .single();

        if (supaError) throw new Error("ไม่พบข้อมูลที่พัก หรือเกิดข้อผิดพลาด");
        setAccommodation(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodationDetail();
  }, [cleanId, supabase.auth]);

  // ================= 2. ดึงข้อมูลรีวิว =================
  const fetchReviews = useCallback(async () => {
    if (!cleanId) return null;
    try {
      const { data, error: supaError } = await createSupabaseClient()
        .from("reviews")
        .select("*")
        .eq("accommodation_id", cleanId)
        .order("created_at", { ascending: false });

      if (supaError) throw supaError;
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
        accommodation_id: cleanId,
        rating,
        comment,
        // API route อาจจะดึงจาก Token อยู่แล้ว แต่ส่งไปด้วยเพื่อความชัวร์หากใช้โครงสร้างเก่า
        created_by: user.id,
      }),
    });
    if (!res.ok) throw new Error("ไม่สามารถส่งรีวิวได้");
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
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(
    accommodation.address || accommodation.name,
  )}`;
  const lineHref = accommodation.contact_line
    ? `https://line.me/ti/p/${accommodation.contact_line}`
    : null;

  const priceText = noPrice
    ? "สอบถามราคา"
    : minP === maxP
      ? `฿${maxP.toLocaleString()}`
      : `฿${minP.toLocaleString()}–${maxP.toLocaleString()}`;

  const priceNode = (
    <span className="flex items-baseline gap-1">
      <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
        {priceText}
      </span>
      {!noPrice && (
        <span className="text-sm text-neutral-500 font-medium">/ คืน</span>
      )}
    </span>
  );

  const primaryCta = lineHref ? (
    <a
      href={lineHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00B900] px-5 text-sm font-bold text-white transition-colors hover:bg-[#009900]"
    >
      <MessageSquare className="w-4 h-4" /> ติดต่อผ่าน LINE
    </a>
  ) : accommodation.contact_phone ? (
    <a
      href={`tel:${accommodation.contact_phone}`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
    >
      <Phone className="w-4 h-4" /> โทรสอบถาม
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
  facts.push({ icon: Wallet, label: "ราคา", value: noPrice ? "สอบถามราคา" : `${priceText} / คืน` });
  if (accommodation.address)
    facts.push({ icon: MapPin, label: "ที่อยู่", value: accommodation.address });
  if (accommodation.category)
    facts.push({ icon: Tag, label: "ประเภทที่พัก", value: accommodation.category });
  if (accommodation.contact_phone)
    facts.push({ icon: Phone, label: "โทรศัพท์", value: accommodation.contact_phone });

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-16">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/accommodations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">กลับไปหน้าที่พัก</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
          <div className="flex items-center gap-1">
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">แชร์</span>
            </button>
            <button
              onClick={() => cleanId && toggleFavorite("accommodation", cleanId)}
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
            href="/accommodations"
            className="hover:text-neutral-900 transition-colors"
          >
            ที่พัก
          </Link>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-900 font-medium truncate max-w-[45vw]">
            {accommodation.name}
          </span>
        </nav>

        {/* Title + meta pills */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 tracking-tight leading-tight mb-3">
          {accommodation.name}
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
          {accommodation.category && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
              {accommodation.category}
            </span>
          )}
          {accommodation.address && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors max-w-full"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{accommodation.address}</span>
            </a>
          )}
        </div>

        <ImageGallery images={images} alt={accommodation.name} />

        {/* Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left */}
          <div className="lg:col-span-2">
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

            <h2 className="text-xl font-bold text-neutral-900 mb-3">
              รายละเอียดที่พัก
            </h2>
            <div className="text-[15px] text-neutral-600 leading-loose whitespace-pre-line mb-10">
              {accommodation.description || "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับที่พักนี้"}
            </div>

            {accommodation.address && (
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" /> ที่ตั้ง
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                  {accommodation.address}
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

              <div className="space-y-3">
                {lineHref && (
                  <a
                    href={lineHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#00B900] text-sm font-bold text-white transition-colors hover:bg-[#009900]"
                  >
                    <MessageSquare className="w-4 h-4" /> ติดต่อผ่าน LINE
                  </a>
                )}
                {accommodation.contact_phone && (
                  <a
                    href={`tel:${accommodation.contact_phone}`}
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                  >
                    <Phone className="w-4 h-4" /> โทร {accommodation.contact_phone}
                  </a>
                )}
                {accommodation.contact_facebook && (
                  <a
                    href={accommodation.contact_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <FacebookIcon className="w-4 h-4 shrink-0" />
                    เข้าชมเพจ Facebook
                  </a>
                )}
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <Navigation className="w-4 h-4" /> นำทางด้วย Google Maps
                </a>
              </div>

              <p className="mt-4 text-center text-xs text-neutral-400">
                แจ้งว่าติดต่อมาจากเว็บไซต์ของเรา
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
            formHeading: "เขียนรีวิวของคุณ",
            ratingLabel: "ให้คะแนนที่พักนี้",
            placeholder: "ที่พักสะอาดไหม? ทำเลที่ตั้งดีหรือเปล่า? แชร์ให้ทุกคนรู้สิ...",
            emptyText: "เป็นคนแรกที่แชร์ประสบการณ์การเข้าพักของคุณที่นี่!",
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
