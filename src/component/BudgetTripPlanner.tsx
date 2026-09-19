"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MapPin, Utensils, BedDouble,
  ChevronRight, ChevronLeft, RefreshCcw,
  CheckCircle2, Luggage, X,
  AlertTriangle, Wallet, BadgeCheck,
  LogIn, Lock, Calendar, Moon, CalendarDays, Info,
  Route, ArrowDown, Eye, Phone, Clock, Bookmark,
  Layers, Check, Search, SlidersHorizontal
} from "lucide-react";
import toast from "react-hot-toast";
import { getPlaceOpeningStatus } from "@/lib/opening-hours";

// ─── Day Constants ────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { code: "mon", label: "จันทร์", short: "จ" },
  { code: "tue", label: "อังคาร", short: "อ" },
  { code: "wed", label: "พุธ", short: "พ" },
  { code: "thu", label: "พฤหัสบดี", short: "พฤ" },
  { code: "fri", label: "ศุกร์", short: "ศ" },
  { code: "sat", label: "เสาร์", short: "ส" },
  { code: "sun", label: "อาทิตย์", short: "อา" },
] as const;

const ALL_DAY_CODES = DAY_OPTIONS.map((d) => d.code);

// ─── Types ────────────────────────────────────────────────────────────────────

type TripMode = "total" | "custom";

interface TripItem {
  id: string | number;
  name: string;
  image_url?: string | string[];
  images?: string | string[];
  min_price: number;
  category?: string;
  open_days?: string[];
  opening_hours?: any;
  opening_hours_raw?: any;
  district?: string;
  location?: string;
  address?: string;
  description?: string;
  phone?: string;
}

interface RouteStop {
  id: string | number;
  type: "accommodation" | "destination" | "restaurant";
  name: string;
  category?: string;
  image_url: string;
  all_images: string[];
  description?: string;
  address?: string;
  location?: string;
  opening_hours?: any;
  opening_hours_raw?: any;
  open_days?: string[];
  price?: number;
  min_price?: number;
  max_price?: number;
  phone?: string;
  district?: string;
  distance_from_previous?: number;
  note?: string;
}

interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  sameDistrict: boolean;
}

interface DailyRoute {
  dayCode?: string;
  dayLabel?: string;
  dayNumber?: number;
  primaryDistrict: string;
  stops: RouteStop[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  isRealistic: boolean;
  feasibility: string;
}

interface TripPlan {
  id: string;
  name: string;
  theme: string;
  coverImage: string;
  description: string;
  totalCost: number;
  totalDistanceKm: number;
  days: number;
  dailyRoutes: DailyRoute[];
  items: Array<{ id: string | number; type: "destination" | "restaurant" | "accommodation" }>;
}

interface TripResults {
  accommodations: TripItem[];
  restaurants: TripItem[];
  destinations: TripItem[];
}

interface SelectedItem {
  item: TripItem;
  type: string;
}

// ─── Image URL Utility ────────────────────────────────────────────────────────

const getImageUrl = (item: TripItem | RouteStop | any): string => {
  if (!item) return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
  const extractFirst = (val: any): string | null => {
    if (!val) return null;
    if (Array.isArray(val)) return val[0] ?? null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed[0] ?? null : null;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    return null;
  };

  return (
    extractFirst(item.image_url) ||
    extractFirst(item.images) ||
    extractFirst(item.all_images) ||
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
  );
};

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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-neutral-500" />
        </button>

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

// ─── Floating Trip Dock ───────────────────────────────────────────────────────

function TripDock({
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
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;
  const near = !over && budget > 0 && remaining < budget * 0.2;

  const barColor = over
    ? "bg-rose-500"
    : near
    ? "bg-amber-400"
    : "bg-emerald-500";

  return (
    <motion.div
      initial={{ y: 140, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 140, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed z-40 inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[368px] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="rounded-2xl border border-neutral-200/70 bg-white/90 backdrop-blur-xl shadow-2xl shadow-neutral-900/10 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Wallet className="w-3.5 h-3.5" />
            งบประมาณ
          </span>
          {budget > 0 && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                over
                  ? "bg-rose-50 text-rose-600"
                  : near
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {over
                ? `เกินงบ ฿${Math.abs(remaining).toLocaleString()}`
                : `เหลือ ฿${remaining.toLocaleString()}`}
            </span>
          )}
        </div>

        {budget > 0 && (
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mb-2.5">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        )}

        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs text-neutral-500">
            <span className="font-bold text-neutral-900">{count}</span> รายการในทริป
          </span>
          <span className="text-base font-bold tracking-tight text-neutral-900 tabular-nums">
            ฿{spent.toLocaleString()}
          </span>
        </div>

        <button
          onClick={onOpenSummary}
          className="group w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-600 text-sm font-bold text-white transition-colors hover:bg-amber-700"
        >
          <Luggage className="w-4 h-4" />
          ดูสรุปทริปที่เลือกเอง
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Over-budget Modal ────────────────────────────────────────────────────────

function OverBudgetModal({
  entry,
  currentSpent,
  budget,
  nights,
  onClose,
}: {
  entry: { item: TripItem; type: string } | null;
  currentSpent: number;
  budget: number;
  nights: number;
  onClose: () => void;
}) {
  if (!entry) return null;
  const { item, type } = entry;
  const cost = type === "accommodation" ? item.min_price * nights : item.min_price;
  const over = currentSpent + cost - budget;

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
            <span className="text-neutral-500">
              ราคารายการนี้{type === "accommodation" ? ` (× ${nights} คืน)` : ""}
            </span>
            <span className="font-bold text-red-600">
              +฿{cost.toLocaleString()}
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

// ─── Trip Summary Modal (Custom Picked Items) ──────────────────────────────────

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

function SummaryItemCard({
  item,
  type,
  nights,
  onRemove,
}: {
  item: TripItem;
  type: string;
  nights: number;
  onRemove: () => void;
}) {
  const isStay = type === "accommodation";
  const cost = isStay ? item.min_price * nights : item.min_price;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="group relative bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-200 hover:shadow-sm transition-all"
    >
      <div className="relative h-28 w-full overflow-hidden bg-neutral-100">
        <img
          src={getImageUrl(item)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:brightness-95"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-2 right-2 bg-white/90 px-2.5 py-1 rounded-full text-xs font-bold text-neutral-900 shadow-sm">
          ฿{cost.toLocaleString()}
          {isStay && <span className="font-normal text-neutral-500"> ({nights} คืน)</span>}
        </div>
      </div>

      <div className="px-3.5 py-3">
        <h4 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2 pr-7">
          {item.name}
        </h4>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {item.category && (
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">
              {item.category}
            </p>
          )}
          {item.district && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-800 bg-amber-50/90 px-1.5 py-0.5 rounded-md border border-amber-200/50">
              <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
              {item.district}
            </span>
          )}
        </div>
      </div>

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

function CategorySection({
  categoryKey,
  items,
  nights,
  onRemove,
}: {
  categoryKey: string;
  items: SelectedItem[];
  nights: number;
  onRemove: (id: string | number, type: string) => void;
}) {
  const cfg = CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG];
  if (!cfg || items.length === 0) return null;
  const Icon = cfg.icon;
  const subtotal = items.reduce(
    (s, { item }) => s + (categoryKey === "accommodation" ? item.min_price * nights : item.min_price),
    0
  );

  return (
    <div className="mb-6 last:mb-0">
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

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {items.map(({ item, type }) => (
            <SummaryItemCard
              key={`${type}-${item.id}`}
              item={item}
              type={type}
              nights={nights}
              onRemove={() => onRemove(item.id, type)}
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
  nights,
  isLoggedIn,
  onClose,
  onSave,
  onLoginRequired,
  isLoading,
  onRemove,
}: {
  items: SelectedItem[];
  totalBudget: number;
  nights: number;
  isLoggedIn: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoginRequired: () => void;
  isLoading: boolean;
  onRemove: (id: string | number, type: string) => void;
}) {
  const costOf = (item: TripItem, type: string) =>
    type === "accommodation" ? item.min_price * nights : item.min_price;
  const totalPrice = items.reduce((s, { item, type }) => s + costOf(item, type), 0);
  const remaining = totalBudget - totalPrice;
  const isOver = remaining < 0;

  const grouped = (["destination", "restaurant", "accommodation"] as const).map(
    (key) => {
      const catItems = items.filter((i) => i.type === key);
      const spend = catItems.reduce((s, { item, type }) => s + costOf(item, type), 0);
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
      <motion.div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

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
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
              สรุปทริปของคุณ
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {items.length} รายการ
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 flex items-center gap-1">
                <Moon className="w-3 h-3" />
                พัก {nights} คืน
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

        {totalBudget > 0 && (
          <div className="px-6 mb-2 shrink-0">
            <div className={`p-4 rounded-2xl border transition-all ${
              isOver 
                ? "bg-rose-50/40 border-rose-200" 
                : "bg-neutral-50/80 border-neutral-200/70"
            }`}>
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

              <div className="h-2.5 w-full bg-neutral-200/60 rounded-full overflow-hidden flex p-0.5 gap-0.5 mb-3">
                {grouped.map(({ key, spend }) => {
                  if (spend === 0) return null;
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
                nights={nights}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

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

          <div className="shrink-0 w-[55%] sm:w-56">
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
          ทริปของคุณถูกบันทึกเรียบร้อยแล้ว สามารถเปิดดูได้ในหน้าทริปของฉัน
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

// ─── Place Detail Modal ───────────────────────────────────────────────────────

function PlaceDetailModal({
  place,
  onClose,
}: {
  place: RouteStop | TripItem | any;
  onClose: () => void;
}) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    setActiveImgIdx(0);
  }, [place]);

  if (!place) return null;

  const images: string[] =
    place.all_images && Array.isArray(place.all_images) && place.all_images.length > 0
      ? place.all_images
      : [getImageUrl(place)];

  const type = place.type || (place.category?.includes("พัก") ? "accommodation" : place.category?.includes("อาหาร") ? "restaurant" : "destination");

  const typeConfig = {
    accommodation: {
      label: "โรงแรม / ที่พัก",
      icon: BedDouble,
      badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
      accent: "text-purple-600",
    },
    restaurant: {
      label: "ร้านอาหาร / คาเฟ่",
      icon: Utensils,
      badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      accent: "text-amber-600",
    },
    destination: {
      label: "สถานที่ท่องเที่ยว",
      icon: MapPin,
      badgeBg: "bg-sky-100 text-sky-800 border-sky-200",
      accent: "text-sky-600",
    },
  }[type as "accommodation" | "restaurant" | "destination"] || {
    label: "สถานที่",
    icon: MapPin,
    badgeBg: "bg-neutral-100 text-neutral-800 border-neutral-200",
    accent: "text-neutral-600",
  };

  const TypeIcon = typeConfig.icon;

  const openStatus = getPlaceOpeningStatus({
    opening_hours: place.opening_hours_raw || place.opening_hours,
    open_days: place.open_days,
    hours: typeof place.opening_hours === "string" ? place.opening_hours : undefined,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6"
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-neutral-100"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center transition-colors shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
          <div className="relative h-64 sm:h-80 w-full bg-neutral-900 overflow-hidden">
            <img
              src={images[activeImgIdx] || getImageUrl(place)}
              alt={place.name}
              className="w-full h-full object-cover transition-all duration-300"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/20" />

            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-white/95 text-neutral-800 shadow-sm">
                <TypeIcon className={`w-3.5 h-3.5 ${typeConfig.accent}`} />
                {typeConfig.label}
              </span>
              {place.district && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md border border-white/20">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  อ.{place.district}
                </span>
              )}
              {openStatus.hasData && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${openStatus.badgeClasses}`}>
                  <span className={`w-2 h-2 rounded-full ${openStatus.isOpenNow ? "bg-emerald-500 animate-pulse" : openStatus.dotColor}`} />
                  {openStatus.badgeLabel}
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug drop-shadow-md">
                {place.name}
              </h2>
              {place.category && (
                <p className="text-xs text-neutral-200 mt-1 uppercase tracking-wider font-medium">
                  {place.category}
                </p>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 p-3 bg-neutral-50 overflow-x-auto border-b border-neutral-100">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  className={`relative w-16 h-14 rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                    activeImgIdx === idx ? "border-amber-500 scale-95" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 block mb-0.5">ราคา / ค่าใช้จ่าย</span>
                <span className="text-base font-extrabold text-neutral-900">
                  {place.min_price != null && place.min_price > 0
                    ? `฿${place.min_price.toLocaleString()}${type === "accommodation" ? "/คืน" : ""}`
                    : "เข้าชมฟรี / ตามสั่ง"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100">
                <span className="text-[11px] font-semibold text-sky-600 block mb-0.5">ระยะทางจากจุดก่อนหน้า</span>
                <span className="text-base font-extrabold text-sky-900">
                  {place.distance_from_previous && place.distance_from_previous > 0
                    ? `~${place.distance_from_previous} กม.`
                    : "จุดเริ่มต้น"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-amber-700 block mb-0.5">หมวดหมู่</span>
                <span className="text-sm font-bold text-amber-950 truncate block">
                  {place.category || typeConfig.label}
                </span>
              </div>
            </div>

            {place.description && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  รายละเอียดสถานที่
                </h4>
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100/80 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {place.description}
                </div>
              </div>
            )}

            {(place.address || place.location) && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-sm text-neutral-700">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs mb-0.5">ที่ตั้ง / ที่อยู่</span>
                  <span className="text-xs text-neutral-600">{place.address || place.location}</span>
                </div>
              </div>
            )}

            {place.phone && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-sm text-neutral-700">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs mb-0.5">เบอร์ติดต่อ</span>
                  <a href={`tel:${place.phone}`} className="text-xs text-emerald-700 font-bold hover:underline">
                    {place.phone}
                  </a>
                </div>
              </div>
            )}

            {/* ── Section: วันและเวลาเปิดให้บริการ (7 วัน) ── */}
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/70">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      วันและเวลาเปิดให้บริการ
                    </h4>
                    <p className="text-xs text-neutral-500">
                      {openStatus.openDaysSummary}
                    </p>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${openStatus.badgeClasses}`}>
                  <span className={`w-2 h-2 rounded-full ${openStatus.isOpenNow ? "bg-emerald-500 animate-pulse" : openStatus.dotColor}`} />
                  {openStatus.badgeLabel}
                </div>
              </div>

              {/* ตารางเวลา 7 วัน */}
              <div className="rounded-xl overflow-hidden border border-neutral-200/80 divide-y divide-neutral-100 bg-white">
                {openStatus.schedule.map((day) => (
                  <div
                    key={day.key}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                      day.isToday
                        ? "bg-amber-50/80 font-semibold border-l-4 border-l-amber-500 pl-2.5"
                        : "hover:bg-neutral-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={day.isToday ? "text-amber-950 font-bold" : "text-neutral-700"}>
                        {day.fullLabel}
                      </span>
                      {day.isToday && (
                        <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          วันนี้
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {day.isOpen ? (
                        <>
                          <span className="text-neutral-600 font-medium">
                            {day.timeDisplay}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <Check className="w-3 h-3 text-emerald-500" />
                            เปิด
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-md border border-neutral-200">
                          <X className="w-3 h-3 text-neutral-400" />
                          ปิดทำการ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Daily Route Timeline Component ──────────────────────────────────────────

function DailyRouteTimeline({
  dailyRoute,
  onSelectPlace,
}: {
  dailyRoute: DailyRoute;
  onSelectPlace: (place: RouteStop) => void;
}) {
  const stops = dailyRoute.stops || [];

  return (
    <div className="space-y-3">
      {stops.map((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1 && stops.length > 1;
        const distFromPrev = stop.distance_from_previous;

        const typeBadge = {
          accommodation: {
            label: isLast ? "กลับที่พัก" : "ที่พัก / โรงแรม",
            icon: BedDouble,
            color: "text-purple-700 bg-purple-50 border-purple-200/80",
          },
          destination: {
            label: "สถานที่ท่องเที่ยว",
            icon: MapPin,
            color: "text-sky-700 bg-sky-50 border-sky-200/80",
          },
          restaurant: {
            label: "ร้านอาหาร / คาเฟ่",
            icon: Utensils,
            color: "text-amber-700 bg-amber-50 border-amber-200/80",
          },
        }[stop.type] || {
          label: "สถานที่",
          icon: MapPin,
          color: "text-neutral-700 bg-neutral-50 border-neutral-200/80",
        };

        const Icon = typeBadge.icon;

        return (
          <div key={`${stop.id}-${idx}`} className="relative">
            {!isFirst && (
              <div className="flex items-center gap-2 py-1.5 pl-6 sm:pl-10">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 shadow-2xs">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
                {distFromPrev != null && distFromPrev > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50/90 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                    ระยะทาง ~{distFromPrev} กม.
                  </span>
                )}
              </div>
            )}

            <motion.div
              whileHover={{ scale: 1.008, y: -2 }}
              whileTap={{ scale: 0.995 }}
              onClick={() => onSelectPlace(stop)}
              className="group relative bg-white rounded-2xl border border-neutral-200/80 p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center"
            >
              <div className="relative w-full sm:w-44 h-40 sm:h-28 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                <img
                  src={stop.image_url}
                  alt={stop.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur text-white text-xs font-black flex items-center justify-center">
                  {idx + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.color}`}>
                    <Icon className="w-3 h-3" />
                    {typeBadge.label}
                  </span>
                  {stop.district && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                      <MapPin className="w-2.5 h-2.5 text-neutral-400" />
                      อ.{stop.district}
                    </span>
                  )}
                  {stop.opening_hours && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                      {stop.opening_hours}
                    </span>
                  )}
                  {stop.min_price != null && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ml-auto border border-emerald-100">
                      {stop.min_price > 0 ? `฿${stop.min_price.toLocaleString()}${stop.type === "accommodation" ? "/คืน" : ""}` : "ฟรี"}
                    </span>
                  )}
                </div>

                <h4 className="text-base font-bold text-neutral-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                  {stop.name}
                </h4>

                {stop.description && (
                  <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5 leading-relaxed">
                    {stop.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
                  <span className="text-[11px] text-neutral-400">
                    {isFirst ? "จุดเริ่มต้นการเดินทาง" : `ระยะทาง ~${distFromPrev || 0} กม.`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:text-amber-700 group-hover:underline">
                    ดูรายละเอียด
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TripRow Component (Custom Item Carousels from Old File) ──────────────────

function TripRow({
  title, icon, items, type, selectedItems,
  onToggle, onViewDetail, budget, spent, nights,
}: {
  title: string;
  icon: React.ReactNode;
  items: TripItem[];
  type: "destination" | "restaurant" | "accommodation";
  selectedItems: SelectedItem[];
  onToggle: (item: TripItem, type: "destination" | "restaurant" | "accommodation") => void;
  onViewDetail: (item: TripItem, type: "destination" | "restaurant" | "accommodation") => void;
  budget: number;
  spent: number;
  nights: number;
}) {
  const isStay = type === "accommodation";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("default");

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "th")),
    [items]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const priceCeiling = maxPrice === "" ? null : Number(maxPrice);
    const result = items.filter((item) =>
      (!query || `${item.name} ${item.category || ""}`.toLocaleLowerCase().includes(query)) &&
      (!category || item.category === category) &&
      (priceCeiling === null || item.min_price * (isStay ? nights : 1) <= priceCeiling)
    );
    if (sort === "price-asc") result.sort((a, b) => a.min_price - b.min_price);
    if (sort === "price-desc") result.sort((a, b) => b.min_price - a.min_price);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "th"));
    return result;
  }, [items, search, category, maxPrice, sort, isStay, nights]);

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
  }, [filteredItems]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2 px-2">
        {icon}
        <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
          {title}
        </h3>
        <span className="text-sm text-neutral-500 font-medium">({filteredItems.length} ตัวเลือก)</span>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4 px-2">
        <label className="relative flex-2 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อสถานที่หรือประเภท"
            aria-label={`ค้นหา${title}`}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={`กรองประเภท${title}`}
          className="flex-1 min-w-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all"
        >
          <option value="">ทุกประเภท</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <input
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder={isStay ? `ราคาสูงสุด (${nights} คืน)` : "ราคาสูงสุด (บาท)"}
          aria-label={`กรองราคาสูงสุด${title}`}
          className="flex-1 min-w-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={`เรียงลำดับ${title}`}
          className="flex-1 min-w-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all"
        >
          <option value="default">ลำดับแนะนำ</option>
          <option value="price-asc">ราคาต่ำไปสูง</option>
          <option value="price-desc">ราคาสูงไปต่ำ</option>
          <option value="name">ชื่อ ก-ฮ</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <p className="mx-2 rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          ไม่พบรายการตามเงื่อนไข ลองเปลี่ยนคำค้นหรือปรับตัวกรอง
        </p>
      ) : (
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
              {filteredItems.map((item) => {
                const isSelected = selectedItems.some(
                  (i) => i.item.id === item.id && i.type === type
                );
                const cost = isStay ? item.min_price * nights : item.min_price;
                const wouldExceed =
                  !isSelected && budget > 0 && spent + cost > budget;
                const itemOpenStatus = getPlaceOpeningStatus({
                  opening_hours: item.opening_hours_raw || item.opening_hours,
                  open_days: item.open_days,
                });

                return (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      show: {
                        opacity: 1,
                        x: 0,
                        transition: { type: "spring", stiffness: 300, damping: 24 },
                      },
                    }}
                    whileHover={{ y: wouldExceed ? 0 : -4, transition: { duration: 0.2 } }}
                    className={`snap-start shrink-0 w-72 bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 relative ${
                      isSelected
                        ? "ring-2 ring-amber-500 shadow-md"
                        : wouldExceed
                        ? "border border-neutral-100 opacity-60 cursor-not-allowed grayscale-30"
                        : "border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1"
                    }`}
                  >
                    <div 
                      onClick={() => onToggle(item, type)}
                      className="relative h-40 w-full overflow-hidden bg-neutral-100"
                    >
                      <img
                        src={getImageUrl(item)}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:brightness-95"
                      />
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          isSelected ? "bg-black/10 opacity-100" : "opacity-0 group-hover:bg-black/5"
                        }`}
                      />

                      {wouldExceed && (
                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
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
                          className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm text-right ${
                            wouldExceed
                              ? "bg-red-50/90 text-red-600"
                              : "bg-white/90 text-neutral-900"
                          }`}
                        >
                          {isStay ? (
                            <>
                              ฿{item.min_price.toLocaleString()}/คืน
                              <div className="text-[10px] font-medium opacity-70">
                                รวม {nights} คืน ฿{cost.toLocaleString()}
                              </div>
                            </>
                          ) : (
                            <>฿{item.min_price.toLocaleString()}</>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        {item.category && (
                          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                            {item.category}
                          </p>
                        )}
                        {item.district && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            อ.{item.district}
                          </span>
                        )}
                      </div>
                      <h4 
                        onClick={() => onToggle(item, type)}
                        className="text-sm font-bold text-neutral-900 leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors"
                      >
                        {item.name}
                      </h4>

                      {itemOpenStatus.hasData && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] border ${itemOpenStatus.badgeClasses}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${itemOpenStatus.isOpenNow ? "bg-emerald-500 animate-pulse" : itemOpenStatus.dotColor}`} />
                            {itemOpenStatus.badgeLabel}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(item, type);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-amber-600 font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          ดูข้อมูล
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(item, type);
                          }}
                          className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                            isSelected
                              ? "bg-amber-100 text-amber-800"
                              : "bg-neutral-100 hover:bg-amber-500 hover:text-white text-neutral-700"
                          }`}
                        >
                          {isSelected ? "เลือกแล้ว" : "+ เพิ่มในทริป"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetTripPlanner({
  isLoggedIn = false,
}: BudgetTripPlannerProps) {
  const router = useRouter();

  // Inputs
  const [mode, setMode] = useState<TripMode>("total");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [days, setDays] = useState<string>("");
  const [travelDays, setTravelDays] = useState<string[]>([]);
  const [customBudgets, setCustomBudgets] = useState({
    accommodation: "",
    food: "",
    destination: "",
  });

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"plans" | "custom">("plans");

  // Results
  const [tripData, setTripData] = useState<TripResults | null>(null);
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<any>(null);

  // Modals
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [overBudgetItem, setOverBudgetItem] = useState<{ item: TripItem; type: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ─── Open Modal Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const openHandler = () => setIsPlannerOpen(true);
    window.addEventListener("open-trip-planner", openHandler);
    if (window.location.hash === "#planner") setIsPlannerOpen(true);
    return () => window.removeEventListener("open-trip-planner", openHandler);
  }, []);

  useEffect(() => {
    if (!isPlannerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPlannerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlannerOpen]);

  // ─── Budget Validation ─────────────────────────────────────────────────────
  const { valid: budgetValid, hint: budgetHint } = useBudgetValid(
    mode,
    totalBudget,
    customBudgets
  );
  const daysValid = Number(days) > 0;
  // travelDays เป็น optional สำหรับ caller เก่า แต่แนะนำให้เลือก
  const formValid = budgetValid && daysValid;
  const formHint = !daysValid
    ? "กรุณาระบุจำนวนวันเดินทาง"
    : budgetHint;

  // ─── Computed ──────────────────────────────────────────────────────────────
  const effectiveBudget = (() => {
    if (mode === "total") return Number(totalBudget) || 0;
    return (
      Number(customBudgets.accommodation) +
      Number(customBudgets.food) +
      Number(customBudgets.destination)
    );
  })();

  const nights = Math.max((Number(days) || 1) - 1, 1);

  const getItemCost = useCallback(
    (item: TripItem, type: string) =>
      type === "accommodation" ? item.min_price * nights : item.min_price,
    [nights]
  );

  const totalSpent = selectedItems.reduce(
    (s, { item, type }) => s + getItemCost(item, type),
    0
  );

  // Filter plans with Hard Constraint (totalCost <= effectiveBudget)
  const displayPlans = plans.filter((p) => p.totalCost <= effectiveBudget);
  const currentPlan = displayPlans.find((p) => p.id === selectedPlanId) || displayPlans[0] || null;

  // ─── API Generate ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!formValid) return;
    setIsLoading(true);
    setHasSearched(true);
    setSelectedItems([]);
    setIsSummaryOpen(false);
    setPlans([]);
    setSelectedPlanId(null);

    try {
      const payload = {
        mode,
        days: Number(days),
        travelDays: travelDays.length > 0 ? travelDays : undefined,
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || errorData?.details || `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${res.status})`
        );
      }
      const data = await res.json();

      // รองรับทั้ง trip (ไฟล์เดิม) และ plans (ไฟล์ใหม่)
      if (data.trip) {
        setTripData(data.trip);
      }

      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
        setSelectedPlanId(data.plans[0].id);
        setActiveTab("plans"); // แสดงแผนสำเร็จรูปเป็นหน้าแรก
      } else {
        setPlans([]);
        setSelectedPlanId(null);
        setActiveTab("custom"); // ถ้าไม่มี plan สำเร็จรูป ให้สลับไปโหมดเลือกเอง
      }
    } catch (error: any) {
      console.error("handleGenerate error:", error);
      toast.error(error?.message || "เกิดข้อผิดพลาดในการจัดทริป กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Save Handlers ─────────────────────────────────────────────────────────

  // 1. บันทึกแผนสำเร็จรูป (Smart Plan)
  const handleSaveSelectedPlan = async () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    if (!currentPlan) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/trips/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentPlan.name,
          totalBudget: currentPlan.totalCost,
          items: currentPlan.items,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "ไม่สามารถบันทึกทริปได้");
      }

      setShowSuccess(true);
      toast.success("บันทึกทริปสำเร็จ!");
    } catch (error: any) {
      console.error("Save selected plan error:", error);
      toast.error(error?.message || "เกิดข้อผิดพลาดในการบันทึกทริป");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. บันทึกทริปที่เลือกสถานที่เอง (Custom Items)
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
      const daysNum = Number(days);
      const tripName = daysNum > 0
        ? `ทริปโคราชของฉัน (${daysNum} วัน ${nights} คืน)`
        : "ทริปโคราชของฉัน";
      await fetch("/api/trips/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tripName,
          totalBudget: effectiveBudget || "Custom",
          items: itemsToSave,
        }),
      });
      setIsSummaryOpen(false);
      setShowSuccess(true);
      toast.success("บันทึกทริปสำเร็จ!");
    } catch (error: any) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกทริป");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Custom Item Selection ─────────────────────────────────────────────────
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

      const cost = getItemCost(item, type);
      if (effectiveBudget > 0 && totalSpent + cost > effectiveBudget) {
        setOverBudgetItem({ item, type });
        return;
      }

      setSelectedItems((prev) => [...prev, { item, type }]);
    },
    [selectedItems, effectiveBudget, totalSpent, getItemCost]
  );

  const removeItem = (id: string | number, type: string) => {
    setSelectedItems((prev) =>
      prev.filter((i) => !(i.item.id === id && i.type === type))
    );
  };

  return (
    <AnimatePresence>
      {isPlannerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-start sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setIsPlannerOpen(false)}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="จัดทริปตามงบประมาณ"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative z-10 bg-neutral-50 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl shadow-2xl overflow-y-auto"
          >
            {/* Close */}
            <button
              onClick={() => setIsPlannerOpen(false)}
              aria-label="ปิดหน้าต่างจัดทริป"
              className="fixed sm:absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div
              id="planner"
              className={`w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 relative scroll-mt-24 ${
                selectedItems.length > 0 && activeTab === "custom" ? "pb-44 sm:pb-32" : "pb-16"
              }`}
            >
              {/* ── 1. Header & Input Form ──────────────────────────────── */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-100 mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  จัดทริปตามงบประมาณโคราช
                </h2>

                {/* Days Input */}
                <div className="max-w-sm mb-6">
                  <label className="text-sm font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> จำนวนวันเดินทาง
                    {!daysValid && <span className="w-1.5 h-1.5 bg-red-400 rounded-full ml-auto" />}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      placeholder="เช่น 2"
                      className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none ${
                        !daysValid ? "border-neutral-200" : "border-neutral-300 focus:border-amber-500"
                      }`}
                    />
                    {daysValid && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5" /> พัก {nights} คืน
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1.5">
                    ระบบจะคำนวณค่าที่พักตามจำนวนคืนจริง ({nights} คืน)
                  </p>
                </div>

                {/* Travel Day Selection — เลือกวันเดินทางจริง */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-600 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" /> วันเดินทางในสัปดาห์ (ระบุเพื่อกรองวันเปิดให้บริการจริง)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTravelDays((prev) =>
                          prev.length === ALL_DAY_CODES.length ? [] : [...ALL_DAY_CODES]
                        );
                      }}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                    >
                      {travelDays.length === ALL_DAY_CODES.length ? "ยกเลิกทั้งหมด" : "เลือกทุกวัน"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DAY_OPTIONS.map(({ code, label, short }) => {
                      const isSelected = travelDays.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setTravelDays((prev) =>
                              isSelected
                                ? prev.filter((d) => d !== code)
                                : [...prev, code]
                            );
                          }}
                          className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                            isSelected
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="hidden sm:inline">{label}</span>
                          <span className="sm:hidden">{short}</span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {travelDays.length > 0
                      ? `เลือกแล้ว: ${travelDays.map(d => DAY_OPTIONS.find(o => o.code === d)?.label).join(", ")} (ระบบจะคัดเฉพาะสถานที่ที่เปิดในวันเหล่านี้)`
                      : "หากไม่ระบุ ระบบจะแนะนำสถานที่ที่เปิดตลอดช่วงสัปดาห์"}
                  </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-neutral-100/80 p-1 rounded-2xl mb-6 w-full max-w-sm relative">
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

                {/* Budget Inputs */}
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

                {/* Generate Action Button */}
                <div className="mt-8 flex items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !formValid}
                    title={!formValid ? formHint : undefined}
                    className={`bg-amber-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                      formValid && !isLoading
                        ? "hover:bg-amber-700 hover:shadow-lg"
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

                  <AnimatePresence>
                    {!formValid && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="text-xs text-neutral-400"
                      >
                        {formHint}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── 2. Results Navigation Tabs (Hybrid Best of Both) ──── */}
              {hasSearched && !isLoading && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-white p-2 rounded-2xl border border-neutral-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab("plans")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === "plans"
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      แผนทริปแนะนำ ({displayPlans.length} สไตล์)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("custom")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === "custom"
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                      เลือกสถานที่เอง {selectedItems.length > 0 ? `(${selectedItems.length} รายการ)` : ""}
                    </button>
                  </div>

                  <div className="text-xs text-neutral-500 px-3 flex items-center gap-2">
                    <span>งบประมาณ: <strong className="text-neutral-900">฿{effectiveBudget.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>{days} วัน {nights} คืน</span>
                  </div>
                </div>
              )}

              {/* ── 3. Tab 1: Smart Plans View (New File) ─────────────── */}
              {activeTab === "plans" && (
                <div>
                  {/* Empty State: เมื่อไม่มีแผนทริปที่อยู่ในงบ */}
                  {hasSearched && !isLoading && displayPlans.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 text-center shadow-sm max-w-2xl mx-auto mb-8"
                    >
                      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 mb-2">
                        ไม่พบแผนการเดินทางที่อยู่ภายในงบประมาณ ฿{effectiveBudget.toLocaleString()} บาท
                      </h3>
                      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
                        งบประมาณอาจยังไม่เพียงพอกับค่าที่พัก ({nights} คืน) และค่าอาหารสำหรับ {days} วันที่เลือก
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("custom")}
                        className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors shadow"
                      >
                        สลับไปเลือกสถานที่เองตามงบประมาณ
                      </button>
                    </motion.div>
                  )}

                  {/* Plans Comparison + Selected Plan Timeline */}
                  {!isLoading && displayPlans.length > 0 && currentPlan && (
                    <div className="space-y-8">
                      {/* Plans Comparison Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {displayPlans.map((plan, idx) => {
                          const isSelected = (selectedPlanId || displayPlans[0]?.id) === plan.id;

                          return (
                            <motion.div
                              key={plan.id}
                              whileHover={{ y: -4 }}
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`relative bg-white rounded-3xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col shadow-xs hover:shadow-xl ${
                                isSelected
                                  ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10"
                                  : "border-neutral-200/80 hover:border-amber-300"
                              }`}
                            >
                              <div className="relative h-44 w-full bg-neutral-900 overflow-hidden">
                                <img
                                  src={plan.coverImage}
                                  alt={plan.name}
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
                                  }}
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />

                                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                                    แผนที่ {idx + 1}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur border border-white/20">
                                    {plan.theme}
                                  </span>
                                </div>

                                {isSelected && (
                                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    เลือกแผนนี้แล้ว
                                  </div>
                                )}

                                <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                                  <h4 className="font-extrabold text-base leading-snug line-clamp-1 drop-shadow-sm">
                                    {plan.name}
                                  </h4>
                                  <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="font-black text-amber-300 text-sm">
                                      ค่าใช้จ่ายรวม ฿{plan.totalCost.toLocaleString()}
                                    </span>
                                    <span className="text-neutral-200 text-[11px] font-medium">
                                      ~{plan.totalDistanceKm} กม. • {plan.days} วัน
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <p className="text-xs text-neutral-600 line-clamp-2 mb-4 leading-relaxed">
                                  {plan.description}
                                </p>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanId(plan.id);
                                  }}
                                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                    isSelected
                                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      ✓ เลือกทริปนี้
                                    </>
                                  ) : (
                                    "เลือกทริปนี้"
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Selected Plan Details & Daily Route Timelines */}
                      <div className="bg-neutral-50/80 rounded-3xl p-4 sm:p-8 border border-neutral-200/70 space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-200/80">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                                {currentPlan.theme}
                              </span>
                              <span className="text-xs font-semibold text-neutral-500">
                                {currentPlan.days} วันเดินทาง • {nights} คืน • รวม ~{currentPlan.totalDistanceKm} กม.
                              </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                              {currentPlan.name}
                            </h2>
                            <p className="text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
                              {currentPlan.description}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-medium text-neutral-400 block">ค่าใช้จ่ายรวม</span>
                              <span className="text-2xl font-black text-neutral-900 tracking-tight">
                                ฿{currentPlan.totalCost.toLocaleString()}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveSelectedPlan}
                              disabled={isSaving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                            >
                              {isSaving ? (
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Luggage className="w-4.5 h-4.5" />
                                  บันทึกทริปนี้
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Daily Route Sections */}
                        <div className="space-y-8">
                          {currentPlan.dailyRoutes.map((dr, dayIdx) => (
                            <div
                              key={dayIdx}
                              className="bg-white p-5 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                                    {dr.dayNumber || dayIdx + 1}
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
                                      วันที่ {dr.dayNumber || dayIdx + 1} — {dr.dayLabel}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full mt-0.5 border border-sky-100">
                                      <MapPin className="w-3 h-3 text-sky-500" />
                                      โซน {dr.primaryDistrict}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                    ระยะทางรวม ~{dr.totalDistanceKm} กม.
                                  </span>
                                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {dr.feasibility}
                                  </span>
                                </div>
                              </div>

                              <DailyRouteTimeline
                                dailyRoute={dr}
                                onSelectPlace={(place) => setSelectedPlaceForModal(place)}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Bottom Save Reminder */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900">
                                คุณได้เลือก: {currentPlan.name}
                              </h4>
                              <p className="text-xs text-neutral-500">
                                บันทึกทริปนี้เข้าโปรไฟล์เพื่อเก็บไว้ดูและแชร์ต่อได้ทันที
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveSelectedPlan}
                            disabled={isSaving}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 shrink-0"
                          >
                            {isSaving ? (
                              <RefreshCcw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Luggage className="w-4 h-4" />
                                บันทึกทริปนี้
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. Tab 2: Custom Selection Mode (Old File's Carousels) ── */}
              {activeTab === "custom" && tripData && !isLoading && (
                <div className="space-y-12">
                  <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <SlidersHorizontal className="w-5 h-5 text-amber-700 shrink-0" />
                      <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                        คุณกำลังอยู่ในโหมดเลือกจัดทริปเอง: สามารถค้นหา กรองประเภท และคลิกเลือกรายการที่ชอบลงในทริปได้ตามงบประมาณ
                      </p>
                    </div>
                    {selectedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsSummaryOpen(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 shadow-xs transition-colors"
                      >
                        ดูสรุป ({selectedItems.length})
                      </button>
                    )}
                  </div>

                  <TripRow
                    title="สถานที่ท่องเที่ยวแนะนำ"
                    icon={<MapPin className="w-5 h-5 text-sky-600" />}
                    items={tripData.destinations || []}
                    type="destination"
                    selectedItems={selectedItems}
                    onToggle={toggleSelection}
                    onViewDetail={(item, type) => setSelectedPlaceForModal({ ...item, type })}
                    budget={effectiveBudget}
                    spent={totalSpent}
                    nights={nights}
                  />

                  <TripRow
                    title="ร้านอาหารในงบ"
                    icon={<Utensils className="w-5 h-5 text-orange-500" />}
                    items={tripData.restaurants || []}
                    type="restaurant"
                    selectedItems={selectedItems}
                    onToggle={toggleSelection}
                    onViewDetail={(item, type) => setSelectedPlaceForModal({ ...item, type })}
                    budget={effectiveBudget}
                    spent={totalSpent}
                    nights={nights}
                  />

                  <TripRow
                    title="ที่พักน่านอน"
                    icon={<BedDouble className="w-5 h-5 text-purple-500" />}
                    items={tripData.accommodations || []}
                    type="accommodation"
                    selectedItems={selectedItems}
                    onToggle={toggleSelection}
                    onViewDetail={(item, type) => setSelectedPlaceForModal({ ...item, type })}
                    budget={effectiveBudget}
                    spent={totalSpent}
                    nights={nights}
                  />
                </div>
              )}

              {/* ── 5. Floating Trip Dock (Custom Selection Mode) ─────── */}
              <AnimatePresence>
                {activeTab === "custom" && tripData && !isLoading && selectedItems.length > 0 && !isSummaryOpen && (
                  <TripDock
                    count={selectedItems.length}
                    spent={totalSpent}
                    budget={effectiveBudget}
                    onOpenSummary={() => setIsSummaryOpen(true)}
                  />
                )}
              </AnimatePresence>

              {/* ── 6. Modals ─────────────────────────────────────────── */}
              <AnimatePresence>
                {isSummaryOpen && (
                  <TripSummaryModal
                    items={selectedItems}
                    totalBudget={effectiveBudget}
                    nights={nights}
                    isLoggedIn={isLoggedIn}
                    onClose={() => setIsSummaryOpen(false)}
                    onSave={handleSaveTrip}
                    onLoginRequired={() => {
                      setIsSummaryOpen(false);
                      setShowLoginPrompt(true);
                    }}
                    isLoading={isLoading}
                    onRemove={removeItem}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {overBudgetItem && (
                  <OverBudgetModal
                    entry={overBudgetItem}
                    currentSpent={totalSpent}
                    budget={effectiveBudget}
                    nights={nights}
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

              <AnimatePresence>
                {selectedPlaceForModal && (
                  <PlaceDetailModal
                    place={selectedPlaceForModal}
                    onClose={() => setSelectedPlaceForModal(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
