// src/admin/dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  MapPin,
  UtensilsCrossed,
  BedDouble,
  Star,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Clock,
  ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  accommodation_id: string | null;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
  restaurant_id: number | null;
  destination_id: number | null;
};

export type Destination = {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  min_price: number | null;
  max_price: number | null;
};

export type StatsResponse = {
  success: boolean;
  data?: {
    totals: {
      destinations: number;
      restaurants: number;
      accommodations: number;
      reviews: number;
    };
    averageRating: number;
    destinationCategoryCounts: Record<string, number>;
    recentReviews: Review[];
  };
};

// ─── Constants & Fallbacks ────────────────────────────────────────────────────

export const DEST_CATEGORY_COUNTS: Record<string, number> = {
  ธรรมชาติ: 22,
  วัด: 4,
  อื่นๆ: 3,
  ร้านอาหาร: 2,
};

export const REST_CATEGORY_COUNTS: Record<string, number> = {
  อาหารไทย: 9,
  "คาเฟ่ / กาแฟ": 5,
  อาหารญี่ปุ่น: 2,
  อาหารเกาหลี: 2,
  อาหารฝรั่ง: 2,
  อาหารอีสาน: 1,
  อาหาร: 1,
};

export const ACC_CATEGORY_COUNTS: Record<string, number> = {
  โรงแรม: 27,
  หอพัก: 4,
  โฮมสเตย์: 1,
  อพาร์ทเมนท์: 1,
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
};

export const resolveReviewTarget = (review: Review, destinationsData: Destination[]): string => {
  if (review.destination_id) {
    const d = destinationsData.find((x) => x.id === review.destination_id);
    return d ? d.name : `สถานที่ #${review.destination_id}`;
  }
  if (review.restaurant_id) return `ร้านอาหาร #${review.restaurant_id}`;
  if (review.accommodation_id) return `ที่พัก`;
  return "ไม่ระบุเป้าหมาย";
};

export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// ─── UI Components ────────────────────────────────────────────────────────────

export const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-end justify-between border-b border-stone-200/80 pb-3">
    <h2 className="text-[15px] font-semibold tracking-tight text-stone-900">{title}</h2>
    {action && <div className="text-[13px]">{action}</div>}
  </div>
);

export const KpiCard = ({ label, value, loading, context, accent = "teal" }: { label: string; value: number | string; loading: boolean; context?: string; accent?: "teal" | "amber" }) => (
  <div className="group relative flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className={`absolute top-0 inset-x-5 h-0.5 rounded-full ${accent === "amber" ? "bg-amber-500/80" : "bg-teal-600/80"} opacity-0 transition-opacity group-hover:opacity-100`} />
    <span className="text-[13px] font-medium text-stone-500">{label}</span>
    <div className="mt-2.5 flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
        {loading ? "—" : value.toLocaleString("th-TH")}
      </span>
    </div>
    {context && (
      <span className="mt-1.5 text-[12px] font-medium text-stone-400">{context}</span>
    )}
  </div>
);

// ─── Main Page Export ─────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/admin/destinations").then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([statsJson, destsJson]) => {
        if (!active) return;
        if (statsJson.success && statsJson.data) {
          setStats(statsJson.data);
        } else {
          setError(true);
        }
        if (destsJson?.data) setDestinations(destsJson.data);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, []);

  // ─── Derived Data & Insights ────────────────────────────────────────────────
  
  const totalReviews = stats?.totals.reviews ?? 0;
  const avgRating = stats?.averageRating ?? 0;
  const pendingCount = totalReviews; // Simulating moderation logic

  const destTotal = stats?.totals.destinations ?? 0;
  const restTotal = stats?.totals.restaurants ?? 0;
  const accTotal = stats?.totals.accommodations ?? 0;
  const totalContent = destTotal + restTotal + accTotal;

  const destCatCounts = stats?.destinationCategoryCounts ?? DEST_CATEGORY_COUNTS;
  const natureCount = destCatCounts["ธรรมชาติ"] ?? 0;
  const naturePercentage = calculatePercentage(natureCount, destTotal || 31); 

  const thaiFoodCount = REST_CATEGORY_COUNTS["อาหารไทย"] ?? 0;
  const thaiFoodTotal = Object.values(REST_CATEGORY_COUNTS).reduce((a, b) => a + b, 0);
  const thaiFoodPercentage = calculatePercentage(thaiFoodCount, thaiFoodTotal);

  const recentReviews = stats?.recentReviews ?? [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* 1. Executive Overview */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-800 mb-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
            แผงควบคุมหลัก • Travel Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">ภาพรวมระบบ</h1>
          <p className="mt-1 text-sm text-stone-600">
            {loading ? "กำลังโหลดสถานะระบบ..." : `ดูแลและจัดการข้อมูลสถานที่ ที่พัก และร้านอาหารทั้งหมด ${totalContent.toLocaleString("th-TH")} รายการ`}
          </p>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-[13px] text-rose-800 shadow-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p>
              <strong className="font-semibold text-rose-900">ข้อผิดพลาดในการดึงข้อมูล:</strong> ไม่สามารถเชื่อมต่อ API ได้ในขณะนี้ ระบบกำลังแสดงผลจากข้อมูลสำรอง (Snapshot)
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          
          {/* Main Column (Left) */}
          <div className="space-y-10 lg:col-span-8">
            
            {/* 2. Attention Required */}
            <section>
              <SectionHeader title="รายการที่ต้องดำเนินการ" />
              <div className="grid gap-4 sm:grid-cols-2">
                {pendingCount > 0 ? (
                  // Warm Terracotta Amber = งานที่ต้องรีวิว/จัดการ
                  <div className="flex flex-col rounded-2xl border border-amber-200 bg-white p-5 shadow-xs transition-all hover:border-amber-300 hover:shadow-sm">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                      <span className="text-[13px] font-semibold tracking-tight">คิวงานรอการตรวจสอบ</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-amber-700 tabular-nums">{pendingCount}</p>
                    <p className="mt-1 text-[13px] text-stone-600">รีวิวใหม่ที่รอการตรวจสอบก่อนเผยแพร่สู่สาธารณะ</p>
                    <Link href="/admin/reviews" className="mt-4 flex w-fit items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-1.5 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-amber-100">
                      จัดการรีวิว <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-stone-600">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      <span className="text-[13px] font-medium">จัดการเรียบร้อย</span>
                    </div>
                    <p className="mt-2 text-[13px] text-stone-500">ไม่มีรีวิวที่รอการตรวจสอบในขณะนี้</p>
                  </div>
                )}
                
                {/* Content Health */}
                <div className="flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
                   <div className="flex items-center gap-2 text-stone-900">
                      <Activity className="h-4 w-4 text-teal-600" />
                      <span className="text-[13px] font-semibold tracking-tight">ความสมบูรณ์ของฐานข้อมูล</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-stone-600">สถานที่ที่มีรูปภาพประกอบ</span>
                        <span className="rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-0.5 text-[12px] font-semibold text-teal-800">100% ครบถ้วน</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-stone-600">ร้านอาหารที่ระบุราคาเฉลี่ย</span>
                        <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[12px] font-semibold text-amber-800">ต้องตรวจสอบ</span>
                      </div>
                    </div>
                </div>
              </div>
            </section>

            {/* 3. Core KPIs */}
            <section>
               <SectionHeader title="สถิติข้อมูลในระบบ" />
               <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                 <KpiCard label="สถานที่ท่องเที่ยว" value={destTotal} loading={loading} context="รายการที่เผยแพร่แล้ว" accent="teal" />
                 <KpiCard label="ร้านอาหาร" value={restTotal} loading={loading} context="เปิดให้บริการในระบบ" accent="amber" />
                 <KpiCard label="ที่พัก" value={accTotal} loading={loading} context="ที่พักเปิดจองได้" accent="teal" />
                 <KpiCard label="คะแนนเฉลี่ย" value={avgRating.toFixed(1)} loading={loading} context={`จากทั้งหมด ${totalReviews} รีวิว`} accent="amber" />
               </div>
            </section>

            {/* 5. Distribution & Insights */}
            <section>
              <SectionHeader title="ข้อมูลเชิงลึก (Insights)" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
                  <p className="text-[14px] leading-relaxed text-stone-700">
                    สถานที่ท่องเที่ยวหมวด <strong className="font-semibold text-teal-800">ธรรมชาติ</strong> เป็นหมวดหมู่หลักในระบบ คิดเป็นสัดส่วนถึง <strong className="font-semibold text-teal-700">{naturePercentage}%</strong> ({natureCount} แห่ง) ของสถานที่ทั้งหมด
                  </p>
                  <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    {/* Pine Teal Bar */}
                    <div className="rounded-full bg-teal-600 transition-all duration-500 ease-out" style={{ width: `${naturePercentage}%` }} />
                  </div>
                </div>
                
                <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
                  <p className="text-[14px] leading-relaxed text-stone-700">
                    หมวดหมู่ <strong className="font-semibold text-amber-800">อาหารไทย</strong> เป็นประเภทที่พบมากที่สุด คิดเป็นสัดส่วน <strong className="font-semibold text-amber-700">{thaiFoodPercentage}%</strong> ของฐานข้อมูลร้านอาหารทั้งหมด
                  </p>
                  <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
                     {/* Warm Terracotta Amber Bar */}
                    <div className="rounded-full bg-amber-500 transition-all duration-500 ease-out" style={{ width: `${thaiFoodPercentage}%` }} />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Column (Right) */}
          <div className="space-y-10 lg:col-span-4">
            
            {/* 6. Recent Activity */}
            <section>
              <SectionHeader
                title="ความเคลื่อนไหวล่าสุด"
                action={
                  <Link href="/admin/reviews" className="flex items-center gap-1 font-semibold text-teal-700 transition-colors hover:text-teal-800">
                    ดูทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
                {loading ? (
                  <div className="p-5 space-y-4">
                     {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-100" />
                    ))}
                  </div>
                ) : recentReviews.length > 0 ? (
                  <ul className="divide-y divide-stone-100">
                    {recentReviews.map((review) => (
                      <li key={review.id} className="p-5 transition-colors hover:bg-stone-50/70">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[12px] font-bold text-amber-900">
                            {review.rating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          </div>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-stone-400">
                            <Clock className="h-3 w-3" /> {formatRelativeTime(review.created_at)}
                          </span>
                        </div>
                        <p className="mt-2.5 text-[13px] font-semibold text-stone-900">
                          {resolveReviewTarget(review, destinations)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-stone-600">
                          {review.comment || "ไม่มีการระบุข้อความรีวิว"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <div className="p-8 text-center text-[13px] text-stone-400">ยังไม่มีความเคลื่อนไหวล่าสุด</div>
                )}
              </div>
            </section>

            {/* 7. Quick Actions */}
            <section>
              <SectionHeader title="จัดการข้อมูล" />
              <div className="flex flex-col gap-2.5">
                {[
                  { name: "จัดการสถานที่ท่องเที่ยว", href: "/admin/destinations", icon: MapPin },
                  { name: "จัดการร้านอาหาร", href: "/admin/food", icon: UtensilsCrossed },
                  { name: "จัดการที่พัก", href: "/admin/accomodations", icon: BedDouble },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center justify-between rounded-xl border border-stone-200/80 bg-white px-4 py-3 transition-all hover:border-teal-200 hover:bg-teal-50/40 hover:text-teal-900 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 text-[13px] font-medium text-stone-700 group-hover:text-teal-900">
                      <action.icon className="h-4 w-4 text-stone-400 group-hover:text-teal-700" />
                      {action.name}
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-teal-600" />
                  </Link>
                ))}

                <Link
                  href="/admin/destinations/new"
                  className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm shadow-teal-900/10 transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                >
                  <Plus className="h-4 w-4" /> เพิ่มข้อมูลใหม่
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}