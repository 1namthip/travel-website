// src/app/accommodations/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import ImageGallery from "@/component/ImageGallery";
import {
  MapPin,
  Phone,
  Star,
  MessageSquare,
  Trash2,
  Share,
  Heart,
  CheckCircle2,
  ChevronLeft,
  Navigation,
} from "lucide-react";

interface Review {
  id: number | string;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
}

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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [accommodation, setAccommodation] = useState<AccommodationDetailData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [ratingInput, setRatingInput] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ================= 1. ดึงข้อมูล Auth & ที่พัก =================
  useEffect(() => {
    // ดึง Session ปัจจุบัน
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

  // ================= 3. ฟังก์ชันเพิ่ม/ลบ รีวิว =================
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำการรีวิว");
      return;
    }
    if (ratingInput === 0) {
      toast.error("กรุณาให้คะแนนดาว");
      return;
    }
    if (!commentInput.trim()) {
      toast.error("กรุณากรอกความคิดเห็น");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accommodation_id: cleanId,
          rating: ratingInput,
          comment: commentInput,
          // API route อาจจะดึงจาก Token อยู่แล้ว แต่ส่งไปด้วยเพื่อความชัวร์หากใช้โครงสร้างเก่า
          created_by: user.id, 
        }),
      });
      if (!res.ok) throw new Error("ไม่สามารถส่งรีวิวได้");
      
      setRatingInput(0);
      setCommentInput("");
      toast.success("ขอบคุณสำหรับรีวิวของคุณ!");

      const newData = await fetchReviews();
      if (newData) setReviews(newData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งรีวิว");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: number | string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?")) return;
    try {
      const res = await fetch(`/api/reviews?id=${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบรีวิวไม่สำเร็จ");
      
      setReviews(reviews.filter((r) => r.id !== reviewId));
      toast.success("ลบรีวิวเรียบร้อยแล้ว");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบรีวิว");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white max-w-300 mx-auto px-4 sm:px-6 py-8">
        <div className="h-6 w-32 bg-neutral-200 rounded-md animate-pulse mb-6"></div>
        <div className="h-10 w-3/4 bg-neutral-200 rounded-lg animate-pulse mb-4"></div>
        <div className="flex gap-4 mb-8">
          <div className="h-5 w-24 bg-neutral-200 rounded-md animate-pulse"></div>
          <div className="h-5 w-32 bg-neutral-200 rounded-md animate-pulse"></div>
        </div>
        <div className="w-full h-[50vh] bg-neutral-200 rounded-2xl animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-full bg-neutral-200 rounded-md animate-pulse"></div>
            <div className="h-6 w-5/6 bg-neutral-200 rounded-md animate-pulse"></div>
            <div className="h-6 w-4/6 bg-neutral-200 rounded-md animate-pulse"></div>
          </div>
          <div className="lg:col-span-1">
            <div className="w-full h-64 bg-neutral-200 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !accommodation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-10 rounded-4xl shadow-sm border border-neutral-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🥲
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-neutral-500 mb-8 leading-relaxed">
            {error || "ไม่พบข้อมูล"}
          </p>
          <Link
            href="/accommodations"
            className="inline-flex items-center justify-center w-full px-8 py-3.5 bg-neutral-900 text-white font-semibold rounded-full hover:bg-black transition-colors shadow-lg shadow-neutral-900/20 active:scale-95"
          >
            กลับไปหน้าค้นหา
          </Link>
        </div>
      </div>
    );
  }

  const images = getParsedImages(accommodation.images);
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 🌟 Top Navigation */}
      <nav className="bg-white/90 sticky top-0 z-50 border-b border-neutral-100/80 backdrop-blur-md transition-all">
        <div className="max-w-300 mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/accommodations"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition font-medium group"
          >
            <div className="p-2 rounded-full bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="hidden sm:block">กลับไปหน้าที่พัก</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-neutral-50 rounded-full font-medium text-sm text-neutral-700 transition">
              <Share className="w-4 h-4" /> <span className="hidden sm:block">แชร์</span>
            </button>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-neutral-50 rounded-full font-medium text-sm text-neutral-700 transition"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${isSaved ? "fill-rose-500 text-rose-500" : ""}`}
              />{" "}
              <span className="hidden sm:block">บันทึก</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-300 mx-auto px-4 sm:px-6 py-8">
        {/* 🌟 Title & Meta (สไตล์ Airbnb) */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4 tracking-tight leading-tight">
            {accommodation.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-neutral-700">
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-neutral-900 text-neutral-900" />
                <span className="font-bold">{avgRating}</span>
                <span className="underline cursor-pointer hover:text-neutral-500">
                  · {reviews.length} รีวิว
                </span>
              </div>
            )}
            {accommodation.category && (
              <div className="flex items-center gap-1.5 before:content-['·'] before:mr-2 before:text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{accommodation.category}</span>
              </div>
            )}
            {accommodation.address && (
              <div className="flex items-center gap-1 underline cursor-pointer hover:text-neutral-500 before:content-['·'] before:mr-2 before:text-neutral-300 before:no-underline">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-50 sm:max-w-none">{accommodation.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 Image Gallery Grid (Premium Style) */}
        <ImageGallery images={images} alt={accommodation.name} />

        {/* 🌟 Content & Sidebar Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* ฝั่งซ้าย: ข้อมูลรายละเอียด */}
          <div className="lg:col-span-8 flex flex-col">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4 pb-4 border-b border-neutral-200">
              รายละเอียดที่พัก
            </h2>
            <div className="prose prose-neutral max-w-none text-neutral-600 leading-loose mb-10 whitespace-pre-line text-[1.05rem]">
              {accommodation.description ||
                "ยังไม่มีข้อมูลอธิบายเพิ่มเติมสำหรับที่พักนี้"}
            </div>

            <h2 className="text-2xl font-bold text-neutral-900 mb-6 pb-4 border-b border-neutral-200">
              สิ่งอำนวยความสะดวก & บริการ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 mb-10">
              {/* Mockup Amenities */}
              {[
                "Wi-Fi ฟรีความเร็วสูง",
                "ที่จอดรถส่วนตัว",
                "เครื่องปรับอากาศ",
                "ระบบรักษาความปลอดภัย 24 ชม.",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-neutral-700"
                >
                  <CheckCircle2 className="w-5 h-5 text-neutral-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ฝั่งขวา: Sticky Booking/Contact Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-white p-6 rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
              <div className="mb-6">
                {(accommodation.max_price ?? 0) === 0 ? (
                  <span className="text-2xl font-extrabold text-neutral-900">
                    สอบถามราคา
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-neutral-900">
                      {accommodation.min_price === accommodation.max_price
                        ? `฿${accommodation.max_price?.toLocaleString()}`
                        : `฿${accommodation.min_price?.toLocaleString()} - ${accommodation.max_price?.toLocaleString()}`}
                    </span>
                    <span className="text-neutral-500 font-medium">/ คืน</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {accommodation.contact_line && (
                  <a
                    href={`https://line.me/ti/p/${accommodation.contact_line}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#00B900] text-white font-bold rounded-xl hover:bg-[#009900] transition active:scale-[0.98] shadow-sm"
                  >
                    <MessageSquare className="w-5 h-5" /> ติดต่อผ่าน LINE
                  </a>
                )}
                {accommodation.contact_phone && (
                  <a
                    href={`tel:${accommodation.contact_phone}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition active:scale-[0.98] shadow-sm"
                  >
                    <Phone className="w-5 h-5" /> โทร{" "}
                    {accommodation.contact_phone}
                  </a>
                )}
                {accommodation.contact_facebook && (
                  <a
                    href={accommodation.contact_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition active:scale-[0.98]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 666.667 666.667"
                      className="w-5 h-5 shrink-0"
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
                    <span>เข้าชมเพจ Facebook</span>
                  </a>
                )}

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(accommodation.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition active:scale-[0.98]"
                >
                  <Navigation className="w-5 h-5" /> นำทางด้วย Google Maps
                </a>
              </div>
              <div className="text-center text-sm text-neutral-400">
                แจ้งว่าติดต่อมาจากเว็บไซต์ของเรา
              </div>
            </div>
          </div>
        </div>

        {/* ================= 🌟 Premium Review Section ================= */}
        <section className="mt-16 pt-16 border-t border-neutral-200">
          {/* Header Reviews */}
          <div className="flex items-center gap-3 mb-10">
            <Star className="w-8 h-8 fill-neutral-900 text-neutral-900" />
            <h2 className="text-3xl font-extrabold text-neutral-900">
              {reviews.length > 0
                ? `${avgRating} · ${reviews.length} รีวิว`
                : "ยังไม่มีรีวิว"}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* ฝั่งซ้าย: List Reviews */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              {reviews.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  {reviews.map((review) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={review.id}
                      className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] group relative"
                    >
                      {user?.id === review.created_by && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="absolute top-6 right-6 p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                          title="ลบรีวิวของคุณ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                          U
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900">
                            ผู้ใช้งานทั่วไป
                          </div>
                          <div className="text-sm text-neutral-500">
                            {new Date(review.created_at).toLocaleDateString(
                              "th-TH",
                              { month: "long", year: "numeric" },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`}
                          />
                        ))}
                      </div>

                      <p className="text-neutral-700 leading-relaxed">
                        {review.comment}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-left py-8">
                  <p className="text-neutral-500 text-lg">
                    เป็นคนแรกที่แชร์ประสบการณ์การเข้าพักของคุณที่นี่!
                  </p>
                </div>
              )}
            </div>

            {/* ฝั่งขวา: Write Review Form */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="bg-neutral-50 p-8 rounded-3xl border border-neutral-100 sticky top-28">
                {user ? (
                  <form onSubmit={handleSubmitReview}>
                    <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-neutral-400" />
                      เขียนรีวิวของคุณ
                    </h3>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        ให้คะแนนที่พักนี้
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingInput(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-9 h-9 ${(hoverRating || ratingInput) >= star ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        ประสบการณ์ของคุณเป็นอย่างไร?
                      </label>
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="ที่พักสะอาดไหม? ทำเลที่ตั้งดีหรือเปล่า? แชร์ให้ทุกคนรู้สิ..."
                        className="w-full p-4 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none resize-none bg-white transition text-neutral-800"
                        rows={4}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full justify-center items-center gap-2 px-6 py-3.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition active:scale-[0.98] disabled:bg-neutral-300 disabled:cursor-not-allowed shadow-lg shadow-neutral-900/20"
                    >
                      {isSubmitting ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-2xl">
                      🔒
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">
                      เข้าสู่ระบบเพื่อรีวิว
                    </h3>
                    <p className="text-neutral-500 mb-6 text-sm">
                      คุณจำเป็นต้องเข้าสู่ระบบก่อน เพื่อความโปร่งใสของข้อมูล
                    </p>
                    <Link
                      href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
                      className="inline-block px-6 py-3.5 bg-neutral-900 text-white font-bold rounded-full w-full hover:bg-black transition shadow-md"
                    >
                      เข้าสู่ระบบ / สมัครสมาชิก
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}