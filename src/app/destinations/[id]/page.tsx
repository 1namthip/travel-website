// src/app/destinations/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Phone, Clock, Star, MessageSquare, 
  Trash2, Share, Heart, Info, CheckCircle2,
  Navigation,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import ImageGallery from "@/component/ImageGallery";

interface Review {
  id: number | string;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
}

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
  const defaultImg = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200";
  const sourceToParse = data || fallbackData;
  
  if (!sourceToParse) return [defaultImg];
  
  try {
    if (typeof sourceToParse === 'string' && sourceToParse.startsWith('[')) {
      const parsed = JSON.parse(sourceToParse);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultImg];
    }
    if (Array.isArray(sourceToParse) && sourceToParse.length > 0) {
      return sourceToParse;
    }
    if (typeof sourceToParse === 'string') {
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [destination, setDestination] = useState<DestinationDetailData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [ratingInput, setRatingInput] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ================= 1. ดึงข้อมูล Auth & สถานที่ =================
  useEffect(() => {
    // ดึง Session ปัจจุบัน
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
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
        body: JSON.stringify({ destination_id: cleanId, rating: ratingInput, comment: commentInput }),
      });
      if (!res.ok) throw new Error("ไม่สามารถส่งรีวิวได้");
      
      setRatingInput(0);
      setCommentInput("");
      toast.success("ขอบคุณสำหรับรีวิวของคุณ!");

      const updatedReviews = await fetchReviews();
      if (updatedReviews) setReviews(updatedReviews);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งรีวิว");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: number | string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?")) return;
    try {
      const res = await fetch(`/api/reviews?id=${reviewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบรีวิวไม่สำเร็จ");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("ลบรีวิวเรียบร้อยแล้ว");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบรีวิว");
    }
  };

  // 🌟 Premium Skeleton Loading
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
          </div>
          <div className="lg:col-span-1">
            <div className="w-full h-64 bg-neutral-200 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 Error State
  if (error || !destination) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-10 rounded-4xl shadow-sm border border-neutral-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🥲
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-neutral-500 mb-8 leading-relaxed">{error || "ไม่พบข้อมูลสถานที่"}</p>
          <Link href="/destinations" className="inline-flex items-center justify-center w-full px-8 py-3.5 bg-neutral-900 text-white font-semibold rounded-full hover:bg-black transition-colors shadow-lg shadow-neutral-900/20 active:scale-95">
            กลับไปหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : "0.0";
  
  const images = getParsedImages(destination.images, destination.image_url);
  const minPrice = destination.min_price || 0;
  const maxPrice = destination.max_price || 0;

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* 🌟 Top Navigation */}
      <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-neutral-100/80 transition-all">
        <div className="max-w-300 mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/destinations" className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition font-medium group">
            <div className="p-2 rounded-full bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="hidden sm:block">กลับไปหน้ารวมสถานที่</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-neutral-50 rounded-full font-medium text-sm text-neutral-700 transition">
              <Share className="w-4 h-4" /> <span className="hidden sm:block">แชร์</span>
            </button>
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-neutral-50 rounded-full font-medium text-sm text-neutral-700 transition"
            >
              <Heart className={`w-4 h-4 transition-colors ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} /> 
              <span className="hidden sm:block">บันทึก</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-300 mx-auto px-4 sm:px-6 py-8">
        
        {/* 🌟 Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 mb-4 tracking-tight leading-tight">
            {destination.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-neutral-700">
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-neutral-900 text-neutral-900" />
                <span className="font-bold">{avgRating}</span>
                <span className="underline cursor-pointer hover:text-neutral-500">· {reviews.length} รีวิว</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 before:content-['·'] before:mr-2 before:text-neutral-300">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                {destination.category || "จุดหมายปลายทาง"}
              </span>
            </div>
            {destination.location && (
              <div className="flex items-center gap-1 underline cursor-pointer hover:text-neutral-500 before:content-['·'] before:mr-2 before:text-neutral-300 before:no-underline">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-50 sm:max-w-none">{destination.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 Premium Image Gallery Grid */}
        <ImageGallery images={images} alt={destination.name} />

        {/* 🌟 Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* ฝั่งซ้าย: รายละเอียดสถานที่ */}
          <div className="lg:col-span-8 flex flex-col">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4 pb-4 border-b border-neutral-200 flex items-center gap-2">
              <Info className="w-6 h-6 text-neutral-400" />
              เกี่ยวกับสถานที่นี้
            </h2>
            <div className="prose prose-neutral max-w-none text-neutral-600 leading-loose mb-10 whitespace-pre-line text-[1.05rem]">
              {destination.description || "สัมผัสประสบการณ์การท่องเที่ยวที่น่าประทับใจไปกับสถานที่แห่งนี้ (ยังไม่มีข้อมูลรายละเอียดเพิ่มเติม)"}
            </div>
            
            {/* Mockup Features */}
            <h2 className="text-2xl font-bold text-neutral-900 mb-6 pb-4 border-b border-neutral-200">
              ไฮไลท์ที่น่าสนใจ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 mb-10">
              {['จุดถ่ายรูปสวยงาม', 'เหมาะสำหรับครอบครัว', 'มีที่จอดรถให้บริการ', 'บรรยากาศดีตลอดปี'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-neutral-700">
                  <CheckCircle2 className="w-5 h-5 text-neutral-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ฝั่งขวา: Sticky Info & Ticket Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-white p-6 rounded-3xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="mb-6">
                {maxPrice === 0 ? (
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">เข้าชมฟรี</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                      {minPrice === maxPrice
                        ? `฿${minPrice.toLocaleString()}`
                        : `฿${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`}
                    </span>
                    <span className="text-neutral-500 font-medium">/ ท่าน</span>
                  </div>
                )}
              </div>

              <div className="space-y-5 mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-neutral-50 rounded-xl text-neutral-700 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 mb-0.5">เวลาทำการ</p>
                    <p className="font-semibold text-neutral-900">{destination.hours || "ไม่ได้ระบุเวลาเปิด-ปิด"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-neutral-50 rounded-xl text-neutral-700 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 mb-0.5">พิกัดสถานที่</p>
                    <p className="font-semibold text-neutral-900 leading-relaxed">{destination.location || "ไม่ได้ระบุ"}</p>
                  </div>
                </div>
                
                {destination.phone && (
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-neutral-50 rounded-xl text-neutral-700 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-0.5">ติดต่อสอบถาม</p>
                      <p className="font-semibold text-neutral-900">{destination.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(destination.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition active:scale-[0.98] shadow-lg shadow-neutral-900/10"
              >
                <Navigation className="w-5 h-5" /> นำทางด้วย Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* ================= 🌟 Premium Review Section ================= */}
        <section className="mt-16 pt-16 border-t border-neutral-200">
          
          <div className="flex items-center gap-3 mb-10">
            <Star className="w-8 h-8 fill-neutral-900 text-neutral-900" />
            <h2 className="text-3xl font-extrabold text-neutral-900">
              {reviews.length > 0 ? `${avgRating} · ${reviews.length} รีวิว` : "รีวิวจากนักท่องเที่ยว"}
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
                        {review.user_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.user_avatar}
                            alt={review.user_name || "นักท่องเที่ยว"}
                            className="w-12 h-12 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                            {(review.user_name || "นักท่องเที่ยวไม่ระบุนาม").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-neutral-900">{review.user_name || "นักท่องเที่ยวไม่ระบุนาม"}</div>
                          <div className="text-sm text-neutral-500">
                            {new Date(review.created_at).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-neutral-900 text-neutral-900" : "text-neutral-200"}`} />
                        ))}
                      </div>

                      <p className="text-neutral-700 leading-relaxed">{review.comment}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-left py-8">
                  <p className="text-neutral-500 text-lg">เป็นคนแรกที่แชร์ประสบการณ์และความประทับใจของสถานที่นี้สิ!</p>
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
                      เขียนรีวิวสถานที่นี้
                    </h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 mb-3">คุณให้คะแนนความประทับใจเท่าไหร่?</label>
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
                            <Star className={`w-9 h-9 ${(hoverRating || ratingInput) >= star ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">เล่าประสบการณ์การท่องเที่ยวของคุณ</label>
                      <textarea 
                        value={commentInput} 
                        onChange={(e) => setCommentInput(e.target.value)} 
                        placeholder="สถานที่สวยงามไหม? บรรยากาศเป็นอย่างไรบ้าง? แชร์ให้คนอื่นรู้เลย..." 
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
                      {isSubmitting ? "กำลังส่งรีวิว..." : "ส่งรีวิวของคุณ"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-2xl">🔒</div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">เข้าสู่ระบบเพื่อรีวิว</h3>
                    <p className="text-neutral-500 mb-6 text-sm">คุณจำเป็นต้องเข้าสู่ระบบเพื่อแชร์ประสบการณ์การเดินทางของคุณ</p>
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