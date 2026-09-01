"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MapPin, Utensils, BedDouble,
  ChevronRight, ChevronLeft, RefreshCcw,
  CheckCircle2, Luggage, X,
  AlertTriangle, Wallet, BadgeCheck,
  LogIn, Lock
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripMode = "total" | "custom";

interface TripItem {
  id: string | number;
  name: string;
  image_url?: string | string[];
  images?: string | string[];
  min_price: number;
  category?: string;
}

interface SelectedItem {
  item: TripItem;
  type: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BudgetTripPlannerProps {
  isLoggedIn?: boolean;
}

// ─── Budget Validation ────────────────────────────────────────────────────────

function useBudgetValid(
  mode: TripMode,
  totalBudget: string,
  customBudgets: { accommodation: string; food: string; destination: string }
) {
  if (mode === "total") {
    const n = Number(totalBudget);
    return { valid: n > 0, hint: "กรุณาระบุงบประมาณรวม" };
  }
  const vals = Object.values(customBudgets).map(Number);
  const allFilled = vals.every((v) => v > 0);
  if (allFilled) return { valid: true, hint: "" };
  const missing: string[] = [];
  if (!Number(customBudgets.accommodation)) missing.push("ที่พัก");
  if (!Number(customBudgets.food)) missing.push("ร้านอาหาร");
  if (!Number(customBudgets.destination)) missing.push("ที่เที่ยว");
  return { valid: false, hint: `กรุณาระบุงบ: ${missing.join(", ")}` };
}

// ─── Login Prompt Modal ───────────────────────────────────────────────────────

function LoginPromptModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-90 flex items-center justify-center p-4"
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative z-10 bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-sky-600" />
        </div>

        <h3 className="text-xl font-bold text-neutral-900 mb-2">
          ล็อกอินเพื่อบันทึกทริป
        </h3>
        <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
          คุณสามารถค้นหาและเลือกรายการได้ฟรี
          แต่ต้องล็อกอินก่อนถึงจะบันทึกและเรียกดูทริปของตัวเองได้
        </p>

        {/* Perks */}
        <div className="bg-neutral-50 rounded-2xl p-4 mb-6 text-left space-y-2.5">
          {[
            "บันทึกทริปและดูย้อนหลังได้ตลอด",
            "จัดการรายการโปรดในที่เดียว",
            "แชร์ทริปให้เพื่อนได้",
          ].map((text) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-neutral-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              {text}
            </div>
          ))}
        </div>

        <button
          onClick={onLogin}
          className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-all mb-3"
        >
          <LogIn className="w-4.5 h-4.5" />
          ไปล็อกอิน
        </button>
        <button
          onClick={onClose}
          className="w-full text-neutral-500 text-sm py-2 hover:text-neutral-800 transition-colors"
        >
          ค้นหาต่อโดยไม่ล็อกอิน
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Budget Bar ───────────────────────────────────────────────────────────────

function BudgetBar({
  spent,
  total,
  count,
}: {
  spent: number;
  total: number;
  count: number;
}) {
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const over = spent > total && total > 0;
  const remaining = total - spent;

  const barColor = over
    ? "bg-red-500"
    : pct > 80
    ? "bg-amber-400"
    : "bg-emerald-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-4 z-30 mb-8"
    >
      <div
        className={`rounded-2xl px-5 py-4 shadow-xl border backdrop-blur-md ${
          over
            ? "bg-red-50/95 border-red-200"
            : "bg-white/95 border-neutral-200/60"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className={`w-4 h-4 ${over ? "text-red-500" : "text-neutral-500"}`} />
            <span className="text-sm font-semibold text-neutral-700">
              งบประมาณของคุณ
            </span>
          </div>
          {count > 0 && (
            <span className="text-xs font-medium text-neutral-500">
              เลือกแล้ว{" "}
              <span className="font-bold text-neutral-900">{count}</span> รายการ
            </span>
          )}
        </div>

        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2.5">
          <motion.div
            className={`h-full rounded-full ${barColor} transition-colors duration-300`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className={over ? "text-red-600 font-bold" : "text-neutral-500"}>
            ใช้ไป{" "}
            <span className="font-bold text-sm">฿{spent.toLocaleString()}</span>
          </span>
          {total > 0 && (
            <span
              className={`font-semibold ${
                over
                  ? "text-red-600"
                  : remaining < total * 0.2
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {over
                ? `เกินงบ ฿${(spent - total).toLocaleString()}`
                : `เหลือ ฿${remaining.toLocaleString()}`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sticky Trip Action Bar ───────────────────────────────────────────────────
// Appears once the traveller has picked at least one item. Keeps the
// "review & save my trip" action persistent and thumb-reachable instead of
// buried in the budget bar.

function TripActionBar({
  count,
  spent,
  budget,
  onOpenSummary,
}: {
  count: number;
  spent: number;
  budget: number;
  onOpenSummary: () => void;
}) {
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-amber-600 text-white text-xs font-bold">
              {count}
            </span>
            <span className="text-sm font-medium text-neutral-600">
              รายการในทริป
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 truncate">
            <span className="text-lg font-bold tracking-tight text-neutral-900 tabular-nums">
              ฿{spent.toLocaleString()}
            </span>
            {budget > 0 && (
              <span
                className={`text-xs font-semibold shrink-0 ${
                  over ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {over
                  ? `เกินงบ ฿${Math.abs(remaining).toLocaleString()}`
                  : `เหลือ ฿${remaining.toLocaleString()}`}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenSummary}
          className="shrink-0 inline-flex items-center justify-center gap-2 h-12 px-5 sm:px-8 rounded-xl bg-amber-600 text-sm font-bold text-white transition-colors hover:bg-amber-700"
        >
          <Luggage className="w-4.5 h-4.5" />
          <span>ดูสรุป &amp; บันทึกทริป</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Over-budget Modal ────────────────────────────────────────────────────────

function OverBudgetModal({
  item,
  currentSpent,
  budget,
  onClose,
}: {
  item: TripItem | null;
  currentSpent: number;
  budget: number;
  onClose: () => void;
}) {
  if (!item) return null;
  const over = currentSpent + item.min_price - budget;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-90 flex items-center justify-center p-4"
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative z-10 bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">
          งบประมาณไม่เพียงพอ
        </h3>
        <p className="text-neutral-500 text-sm mb-5 leading-relaxed">
          การเพิ่ม{" "}
          <span className="font-semibold text-neutral-800">{item.name}</span>{" "}
          จะทำให้งบเกินไป{" "}
          <span className="text-red-600 font-bold">฿{over.toLocaleString()}</span>
        </p>

        <div className="bg-neutral-50 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">งบรวม</span>
            <span className="font-semibold">฿{budget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">ใช้ไปแล้ว</span>
            <span className="font-semibold text-amber-600">
              ฿{currentSpent.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-neutral-200" />
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">เหลือ</span>
            <span className="font-semibold text-neutral-700">
              ฿{(budget - currentSpent).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">ราคารายการนี้</span>
            <span className="font-bold text-red-600">
              +฿{item.min_price.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-semibold hover:bg-amber-700 transition-all"
        >
          เข้าใจแล้ว
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Trip Summary Modal ───────────────────────────────────────────────────────

// Config for each category section
const CATEGORY_CONFIG = {
  destination: {
    label: "สถานที่ท่องเที่ยว",
    icon: MapPin,
    accent: "text-sky-600",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    headerBg: "bg-sky-50/60",
    bar: "bg-sky-500",
  },
  restaurant: {
    label: "ร้านอาหาร",
    icon: Utensils,
    accent: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    headerBg: "bg-amber-50/60",
    bar: "bg-amber-500",
  },
  accommodation: {
    label: "ที่พัก",
    icon: BedDouble,
    accent: "text-purple-500",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    headerBg: "bg-purple-50/60",
    bar: "bg-purple-400",
  },
} as const;

// A single item card inside the modal
function SummaryItemCard({
  item,
  type,
  onRemove,
  getImageUrl,
}: {
  item: TripItem;
  type: string;
  onRemove: () => void;
  getImageUrl: (item: TripItem) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="group relative bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-200 hover:shadow-sm transition-all"
    >
      {/* Image strip */}
      <div className="relative h-28 w-full overflow-hidden bg-neutral-100">
        <img
          src={getImageUrl(item)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:brightness-95"
        />
        {/* linear overlay for text legibility */}
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
        {/* price chip on image */}
        <div className="absolute bottom-2 right-2 bg-white/90 px-2.5 py-1 rounded-full text-xs font-bold text-neutral-900 shadow-sm">
          ฿{item.min_price.toLocaleString()}
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <h4 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2 pr-7">
          {item.name}
        </h4>
        {item.category && (
          <p className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-wider">
            {item.category}
          </p>
        )}
      </div>

      {/* Remove button — top-right corner */}
      <button
        onClick={onRemove}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm"
        aria-label="ลบรายการนี้"
      >
        <X className="w-3.5 h-3.5 text-neutral-500 hover:text-red-500 transition-colors" />
      </button>
    </motion.div>
  );
}

// One grouped section per category
function CategorySection({
  categoryKey,
  items,
  onRemove,
  getImageUrl,
}: {
  categoryKey: string;
  items: SelectedItem[];
  onRemove: (id: string | number, type: string) => void;
  getImageUrl: (item: TripItem) => string;
}) {
  const cfg = CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG];
  if (!cfg || items.length === 0) return null;
  const Icon = cfg.icon;
  const subtotal = items.reduce((s, { item }) => s + item.min_price, 0);

  return (
    <div className="mb-6 last:mb-0">
      {/* Section header */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 ${cfg.headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cfg.accent}`} />
          <span className="text-sm font-semibold text-neutral-800">{cfg.label}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
            {items.length}
          </span>
        </div>
        <span className="text-sm font-bold text-neutral-700">
          ฿{subtotal.toLocaleString()}
        </span>
      </div>

      {/* Cards grid — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {items.map(({ item, type }) => (
            <SummaryItemCard
              key={`${type}-${item.id}`}
              item={item}
              type={type}
              onRemove={() => onRemove(item.id, type)}
              getImageUrl={getImageUrl}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function TripSummaryModal({
  items,
  totalBudget,
  isLoggedIn,
  onClose,
  onSave,
  onLoginRequired,
  isLoading,
  onRemove,
  getImageUrl,
}: {
  items: SelectedItem[];
  totalBudget: number;
  isLoggedIn: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoginRequired: () => void;
  isLoading: boolean;
  onRemove: (id: string | number, type: string) => void;
  getImageUrl: (item: TripItem) => string;
}) {
  const totalPrice = items.reduce((s, { item }) => s + item.min_price, 0);
  const remaining = totalBudget - totalPrice;
  const isOver = remaining < 0;

  // 1. Group items with Meta for Stacked Progress Bar
  const grouped = (["destination", "restaurant", "accommodation"] as const).map(
    (key) => {
      const catItems = items.filter((i) => i.type === key);
      const spend = catItems.reduce((s, { item }) => s + item.min_price, 0);
      return { key, items: catItems, spend };
    }
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 2. Map color theme for each category (Fintech style)
  const CAT_THEME: Record<string, { label: string; dot: string; barBg: string; pillBg: string; text: string }> = {
    destination: { label: "ที่เที่ยว", dot: "bg-sky-500", barBg: "bg-sky-500", pillBg: "bg-sky-50/80 border-sky-100", text: "text-sky-950" },
    restaurant: { label: "ร้านอาหาร", dot: "bg-amber-500", barBg: "bg-amber-500", pillBg: "bg-amber-50/80 border-amber-100", text: "text-amber-950" },
    accommodation: { label: "ที่พัก", dot: "bg-purple-500", barBg: "bg-purple-500", pillBg: "bg-purple-50/80 border-purple-100", text: "text-purple-950" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-80 flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        className="relative z-10 bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-neutral-100"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
        </div>

        {/* ── 1. Top Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
              สรุปทริปของคุณ
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {items.length} รายการ
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2. Fintech Budget Card (The Hero) ───────────────────── */}
        {totalBudget > 0 && (
          <div className="px-6 mb-2 shrink-0">
            <div className={`p-4 rounded-2xl border transition-all ${
              isOver 
                ? "bg-rose-50/40 border-rose-200" 
                : "bg-neutral-50/80 border-neutral-200/70"
            }`}>
              
              {/* Spent vs Remaining text */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-neutral-500">ใช้งบไปแล้ว</span>
                    <span className="text-[11px] text-neutral-400">/ ฿{totalBudget.toLocaleString()}</span>
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 ${isOver ? "text-rose-600" : "text-neutral-900"}`}>
                    ฿{totalPrice.toLocaleString()}
                  </div>
                </div>

                {/* Status Pill */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  isOver 
                    ? "bg-rose-100 text-rose-700 border border-rose-200" 
                    : remaining < totalBudget * 0.15 
                    ? "bg-amber-100 text-amber-800" 
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOver ? "bg-rose-600 animate-pulse" : "bg-emerald-600"}`} />
                  {isOver ? `เกินงบ ฿${Math.abs(remaining).toLocaleString()}` : `คงเหลือ ฿${remaining.toLocaleString()}`}
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-2.5 w-full bg-neutral-200/60 rounded-full overflow-hidden flex p-0.5 gap-0.5 mb-3">
                {grouped.map(({ key, spend }) => {
                  if (spend === 0) return null;
                  // Use max(totalPrice, totalBudget) so overflow doesn't break CSS width
                  const pct = (spend / Math.max(totalPrice, totalBudget)) * 100;
                  return (
                    <motion.div
                      key={key}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${CAT_THEME[key].barBg}`}
                    />
                  );
                })}
              </div>

              {/* Compact Breakdown Pills (Replaced the 3 big chunky boxes) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-200/50">
                {grouped.map(({ key, spend }) => {
                  if (spend === 0) return null;
                  const theme = CAT_THEME[key];
                  return (
                    <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${theme.pillBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      <span className="text-neutral-600">{theme.label}:</span>
                      <span className={`font-bold ${theme.text}`}>฿{spend.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* ── 3. Smart Login Notice ───────────────────────────────── */}
        {!isLoggedIn && (
          <div className="px-6 mb-2 shrink-0">
            <div className="bg-neutral-900 text-white rounded-xl p-3 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-neutral-200 truncate">เข้าสู่ระบบเพื่อบันทึกทริปนี้เก็บไว้ดูภายหลัง</span>
              </div>
              <button 
                onClick={onLoginRequired}
                className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-neutral-100 shrink-0 transition-all"
              >
                ล็อกอิน
              </button>
            </div>
          </div>
        )}

        {/* ── 4. Scrollable Body (Your Cards) ────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pt-1 pb-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
                <Luggage className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-neutral-700">ยังไม่มีรายการในทริป</p>
              <p className="text-xs text-neutral-400 mt-0.5 max-w-50">เลือกสถานที่ท่องเที่ยวหรือที่พักที่สนใจเพิ่มเข้ามาได้เลย</p>
            </div>
          ) : (
            grouped.filter(g => g.items.length > 0).map(({ key, items: catItems }) => (
              <CategorySection
                key={key}
                categoryKey={key}
                items={catItems}
                onRemove={onRemove}
                getImageUrl={getImageUrl}
              />
            ))
          )}
        </div>

        {/* ── 5. Sticky Action Footer (Cleaned redundancy) ────────── */}
        <div className="p-4 sm:px-6 sm:py-4 bg-white/90 backdrop-blur-md border-t border-neutral-100 shrink-0 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">ยอดรวมสุทธิ</span>
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                ฿{totalPrice.toLocaleString()}
              </span>
              {totalBudget > 0 && isOver && (
                <span className="text-xs font-bold text-rose-600 shrink-0">(เกินงบ)</span>
              )}
            </div>
          </div>

          <div className="shrink-0 w-[55%] sm:w-55">
            {isLoggedIn ? (
              <button
                onClick={onSave}
                disabled={items.length === 0 || isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="truncate">บันทึกทริปนี้</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onLoginRequired}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate text-sm">ล็อกอินเพื่อบันทึก</span>
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-90 flex items-center justify-center p-4"
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative z-10 bg-white rounded-2xl p-8 shadow-xl max-w-xs w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 20 }}
          className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5"
        >
          <BadgeCheck className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">
          บันทึกทริปแล้ว! 🎉
        </h3>
        <p className="text-neutral-500 text-sm mb-6">
          ทริปของคุณถูกบันทึกเรียบร้อยแล้ว
        </p>
        <button
          onClick={onClose}
          className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all"
        >
          เยี่ยม!
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetTripPlanner({
  isLoggedIn = false,
}: BudgetTripPlannerProps) {
  const [mode, setMode] = useState<TripMode>("total");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [customBudgets, setCustomBudgets] = useState({
    accommodation: "",
    food: "",
    destination: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const router = useRouter();
  // Modals
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [overBudgetItem, setOverBudgetItem] = useState<TripItem | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ─── Budget validation ─────────────────────────────────────────────────────
  const { valid: budgetValid, hint: budgetHint } = useBudgetValid(
    mode,
    totalBudget,
    customBudgets
  );

  // ─── Computed ──────────────────────────────────────────────────────────────
  const effectiveBudget = (() => {
    if (mode === "total") return Number(totalBudget) || 0;
    return (
      Number(customBudgets.accommodation) +
      Number(customBudgets.food) +
      Number(customBudgets.destination)
    );
  })();

  const totalSpent = selectedItems.reduce(
    (s, { item }) => s + (item.min_price || 0),
    0
  );

  // ─── API ───────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!budgetValid) return;
    setIsLoading(true);
    setSelectedItems([]);
    setIsSummaryOpen(false);

    try {
      const payload = {
        mode,
        ...(mode === "total"
          ? { totalBudget: Number(totalBudget) }
          : {
              customBudgets: {
                accommodation: Number(customBudgets.accommodation),
                food: Number(customBudgets.food),
                destination: Number(customBudgets.destination),
              },
            }),
      };

      const res = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTripData(data.trip);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    if (selectedItems.length === 0) return;
    setIsLoading(true);
    try {
      const itemsToSave = selectedItems.map(({ item, type }) => ({
        id: item.id,
        type,
      }));
      await fetch("/api/trips/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "ทริปโคราชของฉัน",
          totalBudget: effectiveBudget || "Custom",
          items: itemsToSave,
        }),
      });
      setIsSummaryOpen(false);
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelection = useCallback(
    (item: TripItem, type: string) => {
      const isSelected = selectedItems.some(
        (i) => i.item.id === item.id && i.type === type
      );

      if (isSelected) {
        setSelectedItems((prev) =>
          prev.filter((i) => !(i.item.id === item.id && i.type === type))
        );
        return;
      }

      if (effectiveBudget > 0 && totalSpent + item.min_price > effectiveBudget) {
        setOverBudgetItem(item);
        return;
      }

      setSelectedItems((prev) => [...prev, { item, type }]);
    },
    [selectedItems, effectiveBudget, totalSpent]
  );

  const removeItem = (id: string | number, type: string) => {
    setSelectedItems((prev) =>
      prev.filter((i) => !(i.item.id === id && i.type === type))
    );
  };

  // ─── Utility ───────────────────────────────────────────────────────────────
  const getImageUrl = (item: TripItem): string => {
    const extractFirst = (val: string | string[] | undefined): string | null => {
      if (!val) return null;
      if (Array.isArray(val)) return val[0] ?? null;
      if (val.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed[0] ?? null : null;
        } catch {
          return val;
        }
      }
      return val;
    };
    return (
      extractFirst(item.image_url) ||
      extractFirst(item.images) ||
      "https://via.placeholder.com/400x300?text=No+Image"
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="planner"
      className={`w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 relative scroll-mt-24 ${
        selectedItems.length > 0 ? "pb-36" : "pb-16"
      }`}
    >

      {/* ── Header & Input ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-100 mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-black" />
          จัดทริปตามงบประมาณ
        </h2>

        {/* Mode Toggle */}
        <div className="flex bg-neutral-100/80 p-1 rounded-2xl mb-8 w-full max-w-sm relative">
          <button
            onClick={() => setMode("total")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl z-10 transition-colors ${
              mode === "total"
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            ระบุงบรวม
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl z-10 transition-colors ${
              mode === "custom"
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            ระบุแยกหมวด
          </button>
          <motion.div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-neutral-200/50"
            animate={{ left: mode === "total" ? "4px" : "calc(50% + 0px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>

        {/* Inputs */}
        <AnimatePresence mode="wait">
          {mode === "total" ? (
            <motion.div
              key="total"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-sm"
            >
              <label className="block text-sm font-medium text-neutral-600 mb-2">
                งบประมาณรวมทั้งทริป (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
                  ฿
                </span>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="เช่น 3000"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-neutral-400 transition-all outline-none"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                { key: "accommodation", label: "ที่พัก", icon: <BedDouble className="w-4 h-4" /> },
                { key: "food", label: "ร้านอาหาร", icon: <Utensils className="w-4 h-4" /> },
                { key: "destination", label: "ที่เที่ยว", icon: <MapPin className="w-4 h-4" /> },
              ].map(({ key, label, icon }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                    {icon} {label}
                    {/* Red dot if empty */}
                    {!Number(customBudgets[key as keyof typeof customBudgets]) && (
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full ml-auto" />
                    )}
                  </label>
                  <input
                    type="number"
                    value={customBudgets[key as keyof typeof customBudgets]}
                    onChange={(e) =>
                      setCustomBudgets({ ...customBudgets, [key]: e.target.value })
                    }
                    placeholder="฿"
                    className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none ${
                      !Number(customBudgets[key as keyof typeof customBudgets])
                        ? "border-neutral-200"
                        : "border-neutral-300 focus:border-amber-500"
                    }`}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button — disabled when budget not filled */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !budgetValid}
            title={!budgetValid ? budgetHint : undefined}
            className={`bg-amber-600 text-white px-8 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              budgetValid && !isLoading
                ? "hover:bg-amber-700"
                : "opacity-40 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                เริ่มจัดทริป <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Inline hint when budget not filled */}
          <AnimatePresence>
            {!budgetValid && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="text-xs text-neutral-400"
              >
                {budgetHint}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {tripData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <BudgetBar
              spent={totalSpent}
              total={effectiveBudget}
              count={selectedItems.length}
            />

            <div className="space-y-12">
              <TripRow
                title="สถานที่ท่องเที่ยวแนะนำ"
                icon={<MapPin className="w-5 h-5 text-sky-600" />}
                items={tripData.destinations}
                type="destination"
                selectedItems={selectedItems}
                onToggle={toggleSelection}
                getImageUrl={getImageUrl}
                budget={effectiveBudget}
                spent={totalSpent}
              />
              <TripRow
                title="ร้านอาหารในงบ"
                icon={<Utensils className="w-5 h-5 text-orange-500" />}
                items={tripData.restaurants}
                type="restaurant"
                selectedItems={selectedItems}
                onToggle={toggleSelection}
                getImageUrl={getImageUrl}
                budget={effectiveBudget}
                spent={totalSpent}
              />
              <TripRow
                title="ที่พักน่านอน"
                icon={<BedDouble className="w-5 h-5 text-purple-500" />}
                items={tripData.accommodations}
                type="accommodation"
                selectedItems={selectedItems}
                onToggle={toggleSelection}
                getImageUrl={getImageUrl}
                budget={effectiveBudget}
                spent={totalSpent}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky action bar (appears once items are picked) ──── */}
      <AnimatePresence>
        {tripData && !isLoading && selectedItems.length > 0 && !isSummaryOpen && (
          <TripActionBar
            count={selectedItems.length}
            spent={totalSpent}
            budget={effectiveBudget}
            onOpenSummary={() => setIsSummaryOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isSummaryOpen && (
          <TripSummaryModal
            items={selectedItems}
            totalBudget={effectiveBudget}
            isLoggedIn={isLoggedIn}
            onClose={() => setIsSummaryOpen(false)}
            onSave={handleSaveTrip}
            onLoginRequired={() => {
              setIsSummaryOpen(false);
              setShowLoginPrompt(true);
            }}
            isLoading={isLoading}
            onRemove={removeItem}
            getImageUrl={getImageUrl}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overBudgetItem && (
          <OverBudgetModal
            item={overBudgetItem}
            currentSpent={totalSpent}
            budget={effectiveBudget}
            onClose={() => setOverBudgetItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginPrompt && (
          <LoginPromptModal
            onClose={() => setShowLoginPrompt(false)}
            onLogin={() => {
              setShowLoginPrompt(false);
              router.push("/sign-in");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── TripRow Component ────────────────────────────────────────────────────────

function TripRow({
  title, icon, items, type, selectedItems,
  onToggle, getImageUrl, budget, spent,
}: {
  title: string;
  icon: React.ReactNode;
  items: TripItem[];
  type: string;
  selectedItems: SelectedItem[];
  onToggle: (item: TripItem, type: string) => void;
  getImageUrl: (item: TripItem) => string;
  budget: number;
  spent: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [items]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4 px-2">
        {icon}
        <h3 className="text-xl font-semibold text-neutral-900 tracking-tight">
          {title}
        </h3>
      </div>

      <div className="relative">
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("left")}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/95 backdrop-blur shadow-lg border border-neutral-100 rounded-full hidden sm:flex items-center justify-center text-neutral-700 hover:text-black transition-all"
            >
              <ChevronLeft className="w-6 h-6 -ml-1" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll("right")}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/95 backdrop-blur shadow-lg border border-neutral-100 rounded-full hidden sm:flex items-center justify-center text-neutral-700 hover:text-black transition-all"
            >
              <ChevronRight className="w-6 h-6 ml-1" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto snap-x snap-mandatory pb-8 pt-2 px-2 -mx-2 gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <motion.div
            className="flex gap-5"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            animate="show"
          >
            {items.map((item) => {
              const isSelected = selectedItems.some(
                (i) => i.item.id === item.id && i.type === type
              );
              const wouldExceed =
                !isSelected && budget > 0 && spent + item.min_price > budget;

              return (
                <motion.div
                  key={item.id}
                  onClick={() => onToggle(item, type)}
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    show: {
                      opacity: 1,
                      x: 0,
                      transition: { type: "spring", stiffness: 300, damping: 24 },
                    },
                  }}
                  whileHover={{ y: wouldExceed ? 0 : -4, transition: { duration: 0.2 } }}
                  className={`snap-start shrink-0 w-70 bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-amber-500"
                      : wouldExceed
                      ? "border border-neutral-100 opacity-50 cursor-not-allowed"
                      : "border border-neutral-100 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="relative h-40 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={getImageUrl(item)}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:brightness-95"
                    />
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        isSelected ? "bg-black/10 opacity-100" : "opacity-0"
                      }`}
                    />

                    {wouldExceed && (
                      <div className="absolute inset-0 bg-neutral-900/30 flex items-center justify-center">
                        <span className="bg-white/90 text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          เกินงบ
                        </span>
                      </div>
                    )}

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute top-3 left-3 z-10 bg-white rounded-full p-0.5 shadow-md"
                        >
                          <CheckCircle2 className="w-6 h-6 text-amber-600 fill-amber-50" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {item.min_price != null && (
                      <div
                        className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          wouldExceed
                            ? "bg-red-50/90 text-red-600"
                            : "bg-white/90 text-neutral-900"
                        }`}
                      >
                        ฿{item.min_price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {item.category && (
                      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
                        {item.category}
                      </p>
                    )}
                    <h4 className="text-base font-semibold text-neutral-900 leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}