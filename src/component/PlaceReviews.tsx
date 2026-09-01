"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Trash2, MessageSquare, Lock } from "lucide-react";
import toast from "react-hot-toast";

export interface PlaceReview {
  id: number | string;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
}

interface PlaceReviewsCopy {
  /** หัวข้อฟอร์มเขียนรีวิว เช่น "เขียนรีวิวสถานที่นี้" */
  formHeading: string;
  /** label เหนือดาว เช่น "ให้คะแนนความประทับใจ" */
  ratingLabel: string;
  /** placeholder ของ textarea */
  placeholder: string;
  /** ข้อความเมื่อยังไม่มีรีวิว */
  emptyText: string;
}

interface PlaceReviewsProps {
  reviews: PlaceReview[];
  currentUserId?: string | null;
  isLoggedIn: boolean;
  signInHref: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onDelete: (id: number | string) => void;
  copy: PlaceReviewsCopy;
}

const INITIAL_VISIBLE = 6;

function formatMonthYear(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

export default function PlaceReviews({
  reviews,
  currentUserId,
  isLoggedIn,
  signInHref,
  onSubmit,
  onDelete,
  copy,
}: PlaceReviewsProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { avg, distribution } = useMemo(() => {
    if (reviews.length === 0) {
      return { avg: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const total = reviews.reduce((s, r) => s + r.rating, 0);
    const dist = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      const idx = Math.min(4, Math.max(0, Math.round(r.rating) - 1));
      dist[idx] += 1;
    }
    return { avg: total / reviews.length, distribution: dist };
  }, [reviews]);

  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("กรุณาให้คะแนนดาว");
      return;
    }
    if (!comment.trim()) {
      toast.error("กรุณากรอกความคิดเห็น");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setHover(0);
      setComment("");
      toast.success("ขอบคุณสำหรับรีวิวของคุณ!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งรีวิว",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="mt-16 pt-12 border-t border-neutral-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* ── ซ้าย: สรุป + รายการรีวิว ── */}
        <div className="lg:col-span-7">
          {/* Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 mb-10">
            <div className="flex items-end gap-2 shrink-0">
              <span className="text-5xl font-extrabold tracking-tight text-neutral-900 tabular-nums">
                {reviews.length > 0 ? avg.toFixed(1) : "—"}
              </span>
              <div className="pb-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(avg)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {reviews.length} รีวิว
                </p>
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="flex-1 max-w-xs space-y-1.5">
                {[5, 4, 3, 2, 1].map((score) => {
                  const c = distribution[score - 1];
                  const pct = reviews.length > 0 ? (c / reviews.length) * 100 : 0;
                  return (
                    <div key={score} className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-3 tabular-nums">
                        {score}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400 w-6 text-right tabular-nums">
                        {c}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review list */}
          {reviews.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 gap-5">
                {visibleReviews.map((review) => (
                  <motion.article
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group relative bg-white p-5 rounded-2xl border border-neutral-200"
                  >
                    {currentUserId === review.created_by && (
                      <button
                        onClick={() => onDelete(review.id)}
                        className="absolute top-4 right-4 p-1.5 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="ลบรีวิวของคุณ"
                        aria-label="ลบรีวิวของคุณ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      {review.user_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.user_avatar}
                          alt={review.user_name || "ผู้ใช้งาน"}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                          {(review.user_name || "ผู้ใช้งาน").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">
                          {review.user_name || "ผู้ใช้งานทั่วไป"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatMonthYear(review.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex mb-2.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-200"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                      {review.comment}
                    </p>
                  </motion.article>
                ))}
              </div>

              {reviews.length > INITIAL_VISIBLE && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                >
                  {showAll ? "แสดงน้อยลง" : `ดูรีวิวทั้งหมด ${reviews.length} รายการ`}
                </button>
              )}
            </>
          ) : (
            <p className="text-neutral-500">{copy.emptyText}</p>
          )}
        </div>

        {/* ── ขวา: ฟอร์มเขียนรีวิว / เชิญล็อกอิน ── */}
        <div className="lg:col-span-5">
          <div className="bg-neutral-50 p-6 sm:p-7 rounded-2xl border border-neutral-200 lg:sticky lg:top-20">
            {isLoggedIn ? (
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-bold text-neutral-900 mb-5 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-neutral-400" />
                  {copy.formHeading}
                </h3>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-neutral-700 mb-2.5">
                    {copy.ratingLabel}
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        className="p-0.5 focus:outline-none"
                        aria-label={`ให้ ${star} ดาว`}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            (hover || rating) >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    เล่าประสบการณ์ของคุณ
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={copy.placeholder}
                    rows={4}
                    required
                    className="w-full p-3.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 outline-none resize-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full h-11 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white transition-colors hover:bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {submitting ? "กำลังส่งรีวิว..." : "ส่งรีวิวของคุณ"}
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                  <Lock className="w-6 h-6 text-neutral-400" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                  เข้าสู่ระบบเพื่อรีวิว
                </h3>
                <p className="text-sm text-neutral-500 mb-5">
                  เข้าสู่ระบบก่อนเพื่อแชร์ประสบการณ์ของคุณ
                </p>
                <Link
                  href={signInHref}
                  className="inline-flex w-full h-11 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white transition-colors hover:bg-black"
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
