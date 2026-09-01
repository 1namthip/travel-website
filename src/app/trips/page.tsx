"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Luggage,
  MapPin,
  Utensils,
  BedDouble,
  ChevronRight,
  RefreshCcw,
  Trash2,
  CalendarDays,
  Plus,
  X,
  Home,
  Loader2,
  Save
} from "lucide-react";
import Link from "next/link";
import {Navbar} from "@/component/User/Navbar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripItemDetail {
  id: string | number;
  name: string;
  min_price: number;
  image_url?: string | string[];
  images?: string | string[];
  category?: string;
}

interface TripItem {
  id: string;
  item_id: string | number;
  item_type: "destination" | "restaurant" | "accommodation";
  item_detail: TripItemDetail;
}

interface Trip {
  id: string;
  name: string;
  total_budget: string | number;
  created_at: string;
  trip_items: TripItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  destination: {
    label: "ที่เที่ยว",
    icon: <MapPin className="w-3.5 h-3.5" />,
    color: "bg-sky-50 text-sky-700 border-sky-100",
    dot: "bg-sky-500",
  },
  restaurant: {
    label: "ร้านอาหาร",
    icon: <Utensils className="w-3.5 h-3.5" />,
    color: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },
  accommodation: {
    label: "ที่พัก",
    icon: <BedDouble className="w-3.5 h-3.5" />,
    color: "bg-purple-50 text-purple-700 border-purple-100",
    dot: "bg-purple-400",
  },
};

// ─── Image Utility ────────────────────────────────────────────────────────────

function getImageUrl(item: TripItemDetail | null | undefined): string {
  // 1. ดักไว้เลยว่าถ้าไม่มี item ให้ส่งรูปเปล่าๆ กลับไป
  if (!item)
    return "https://ui-avatars.com/api/?name=Trip&background=f5f5f5&color=888&size=200";

  const extractFirst = (val: string | string[] | undefined): string | null => {
    if (!val) return null;
    if (Array.isArray(val)) return val[0] ?? null;
    if (val.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? (parsed[0] ?? null) : null;
      } catch {
        return val;
      }
    }
    return val;
  };

  return (
    extractFirst(item.image_url) ||
    extractFirst(item.images) ||
    // 2. เผื่อกรณีที่ item มีอยู่จริงแต่ item.name หายไป
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "Trip")}&background=f5f5f5&color=888&size=200`
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function totalSpend(items: TripItem[]): number {
  return items.reduce((sum, i) => sum + (i.item_detail?.min_price || 0), 0);
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

export function EditTripModal({
  trip,
  onClose,
  onSaved,
}: {
  trip: Trip;
  onClose: () => void;
  onSaved: (updated: Trip) => void;
}) {
  const [name, setName] = useState(trip.name);
  const [items, setItems] = useState<TripItem[]>(trip.trip_items || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          items: items.map((i) => ({ id: i.item_id, type: i.item_type })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await res.json();
      onSaved({ ...trip, name, trip_items: items });
      onClose();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
    } finally {
      setIsSaving(false);
    }
  };

  const spend = useMemo(() => totalSpend(items), [items]);

  // จัดกลุ่ม Items ตามประเภท (Destination, Restaurant, Accommodation)
  const groupedItems = useMemo(() => {
    const groups = ["destination", "restaurant", "accommodation"] as const;
    return groups
      .map((key) => {
        const catItems = items.filter((i) => i.item_type === key);
        return {
          key,
          items: catItems,
          config: TYPE_CONFIG[key] || TYPE_CONFIG.destination,
        };
      })
      .filter((group) => group.items.length > 0); // กรองเอาเฉพาะหมวดหมู่ที่มีไอเท็ม
  }, [items]);

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
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        className="relative z-10 bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-neutral-100"
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-neutral-100">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            แก้ไขทริป
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Trip Name Input */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2.5">
              ชื่อทริป
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ตั้งชื่อทริปของคุณ..."
              className="w-full px-5 py-4 bg-neutral-50/50 border border-neutral-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all outline-none text-neutral-900 font-semibold placeholder:text-neutral-400 text-lg"
            />
          </div>

          {/* Grouped Items Sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-neutral-700">รายการในทริปทั้งหมด ({items.length})</h3>
            </div>
            
            {items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200 mt-4"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-center mb-4 text-neutral-300">
                  <Luggage className="w-8 h-8" />
                </div>
                <p className="text-base font-bold text-neutral-700">ไม่มีรายการแล้ว</p>
                <p className="text-sm text-neutral-400 mt-1">คุณสามารถเพิ่มสถานที่ใหม่ได้ในหน้าค้นหา</p>
              </motion.div>
            ) : (
              <div className="space-y-8 mt-6">
                <AnimatePresence initial={false}>
                  {groupedItems.map((group) => (
                    <motion.div
                      key={group.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Section Header */}
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full border ${group.config.color}`}>
                          {group.config.icon}
                        </span>
                        <h4 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                          {group.config.label}
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                            {group.items.length}
                          </span>
                        </h4>
                      </div>

                      {/* Grid Cards for this category */}
                      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                        <AnimatePresence initial={false}>
                          {group.items.map((tripItem) => {
                            const detail = tripItem.item_detail;

                            return (
                              <motion.div
                                layout
                                key={tripItem.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="group relative flex flex-col bg-white border border-neutral-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-neutral-200 transition-all duration-300"
                              >
                                {/* Image Section */}
                                <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-100 shrink-0">
                                  <img
                                    src={getImageUrl(detail)}
                                    alt={detail.name}
                                    className="w-full h-full object-cover transition-[filter] duration-300 group-hover:brightness-95"
                                  />
                                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  
                                  {/* Floating Delete Button */}
                                  <button
                                    onClick={() => removeItem(tripItem.id)}
                                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-black/5 flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="ลบรายการ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Content Section */}
                                <div className="p-3.5 flex flex-col flex-1">
                                  <p className="text-sm font-bold text-neutral-800 leading-snug line-clamp-2 mb-2 group-hover:text-black transition-colors">
                                    {detail.name}
                                  </p>
                                  <div className="mt-auto flex items-end justify-between pt-1">
                                    <p className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider">
                                      ราคาเริ่มต้น
                                    </p>
                                    <p className="text-neutral-900 font-bold text-sm">
                                      ฿{detail.min_price.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="p-4 sm:px-6 sm:py-5 bg-white border-t border-neutral-100 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          
          <div className="min-w-0 flex-1 hidden sm:block">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">ยอดรวมโดยประมาณ</span>
            <div className="text-xl font-black text-neutral-900 tracking-tight">
              ฿{spend.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto ">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex-2 sm:flex-none px-8 py-3 rounded-2xl text-sm font-bold text-white bg-neutral-900 hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 text-emerald-400" />
                  บันทึกทริป
                </>
              )}
            </button>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

export function TripCard({
  trip,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
}) {
  const items = trip.trip_items || [];
  const spend = totalSpend(items);

  const previewImages = items
    .filter((i) => i && i.item_detail)
    .slice(0, 4)
    .map((i) => getImageUrl(i.item_detail));

  const countByType = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.item_type] = (acc[i.item_type] || 0) + 1;
    return acc;
  }, {});

  // ── Helper: Render Grid รูปภาพที่เนี้ยบที่สุดตามจำนวนรูป ──
  const renderImages = () => {
    const total = previewImages.length;
    const imgClass = "w-full h-full object-cover transition-[filter] duration-300 group-hover:brightness-95";

    if (total === 0) {
      return (
        <div className="w-full h-full bg-neutral-100/80 flex flex-col items-center justify-center gap-1.5 text-neutral-400">
          <Luggage className="w-10 h-10 stroke-[1.5]" />
          <span className="text-xs font-medium">ยังไม่มีสถานที่</span>
        </div>
      );
    }
    if (total === 1) {
      return <img src={previewImages[0]} alt="" className={imgClass} />;
    }
    if (total === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 h-full w-full">
          <img src={previewImages[0]} alt="" className={imgClass} />
          <img src={previewImages[1]} alt="" className={imgClass} />
        </div>
      );
    }
    if (total === 3) {
      // เลย์เอาต์ 3 รูปแบบ "Asymmetric" (ซ้ายใหญ่ 1, ขวาซ้อน 2) สวยกว่าแบ่ง 3 คอลัมน์เท่ากัน
      return (
        <div className="grid grid-cols-3 gap-0.5 h-full w-full">
          <div className="col-span-2 h-full overflow-hidden">
            <img src={previewImages[0]} alt="" className={imgClass} />
          </div>
          <div className="grid grid-rows-2 gap-0.5 h-full overflow-hidden">
            <img src={previewImages[1]} alt="" className={imgClass} />
            <img src={previewImages[2]} alt="" className={imgClass} />
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full w-full">
        {previewImages.map((src, idx) => (
          <div key={idx} className="h-full w-full overflow-hidden">
            <img src={src} alt="" className={imgClass} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 25 }}
      className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden group hover:shadow-md hover:border-neutral-300 transition-all duration-300 flex flex-col"
    >
      {/* ── 1. Image Strip (Hero Section) ── */}
      <div 
        onClick={() => onEdit(trip)}
        className="relative h-44 w-full bg-neutral-100 overflow-hidden cursor-pointer shrink-0"
      >
        {renderImages()}

        {/* Subtle Inner Shadow กันรูปสีขาวกลืนกับขอบการ์ด */}
        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-t-3xl pointer-events-none" />

        {/* Top-Right: Delete Button (แก้ปัญหา Hover บนมือถือ) */}
        <div className="absolute top-3 right-3 z-10 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation(); // ป้องกันไม่ให้ทะลุไปทริกเกอร์ onEdit ของรูปภาพ
              if (confirm(`คุณต้องการลบทริป "${trip.name}" ใช่หรือไม่?`)) {
                onDelete(trip.id);
              }
            }}
            title="ลบทริปนี้"
            className="w-8 h-8 bg-neutral-900/70 hover:bg-rose-600 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom-Right: Extra Items Badge */}
        {items.length > 4 && (
          <div className="absolute bottom-2.5 right-2.5 bg-neutral-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ring-1 ring-white/20">
            +{items.length - 4} รายการ
          </div>
        )}
      </div>

      {/* ── 2. Card Body ── */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Title & Spend */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 
              onClick={() => onEdit(trip)}
              className="text-base font-extrabold text-neutral-900 leading-snug line-clamp-1 cursor-pointer hover:text-neutral-600 transition-colors"
            >
              {trip.name}
            </h3>
            <div className="text-right shrink-0">
              <span className="text-sm font-black text-neutral-900">
                ฿{spend.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Meta Row: Date */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium mb-4">
            <CalendarDays className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>สร้างเมื่อ {formatDate(trip.created_at)}</span>
          </div>

          {/* Type Breakdown Badges */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
              const count = countByType[type];
              if (!count) return null;
              const conf = TYPE_CONFIG[type];
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${conf.color}`}
                >
                  {conf.icon}
                  <span>{conf.label} ({count})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* ── 3. Action Footer ── */}
        <div className="pt-5 mt-4 border-t border-neutral-100">
          <button
            onClick={() => onEdit(trip)}
            className="w-full py-2.5 px-4 rounded-2xl bg-neutral-50 hover:bg-neutral-900 text-neutral-700 hover:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group/btn border border-neutral-200 hover:border-transparent"
          >
            <span>จัดการทริปนี้</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover/btn:text-white transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-24 h-24 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
        <Luggage className="w-12 h-12 text-neutral-300" />
      </div>
      <h3 className="text-xl font-bold text-neutral-800 mb-2">
        ยังไม่มีทริปที่บันทึก
      </h3>
      <p className="text-neutral-400 text-sm mb-8 max-w-xs">
        เริ่มจัดทริปแรกของคุณแล้วกดบันทึกไว้ที่นี่ได้เลย
      </p>
      <Link
        href="/trips/plan"
        className="bg-black text-white px-7 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-neutral-800 transition-all"
      >
        <Plus className="w-4 h-4" />
        จัดทริปใหม่
      </Link>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch Trips ─────────────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trips");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      console.log("ข้อมูลที่ได้จาก API:", data);
      setTrips(data.trips || []);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── After Edit Saved ─────────────────────────────────────────────────────

  const handleSaved = (updated: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
  <>
    <Navbar />

    {/* 🌟 Hero Banner Section */}
    <div className="relative w-full min-h-100 md:min-h-125 bg-neutral-900 flex flex-col items-center justify-center overflow-hidden pt-20 pb-12 group">
      <div
        className="absolute inset-0 bg-cover bg-center blur-xs scale-105"
        style={{ backgroundImage: "url('/images/banner-trip.png')" }}
      ></div>

      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative z-10 text-center px-4 md:px-8 w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-md">
          ทริปเที่ยว
          <span className="text-amber-400 sm:ml-3 block sm:inline mt-2 sm:mt-0 drop-shadow-md">
            ของฉัน
          </span>
        </h1>

        <p className="text-neutral-200 text-lg md:text-xl max-w-2xl mx-auto font-medium drop-shadow-md">
          รวมทุกทริปที่คุณวางแผนไว้ในที่เดียว แก้ไข จัดการ และติดตามค่าใช้จ่ายได้ง่ายๆ
        </p>
      </div>
    </div>

    {/* 🌟 Breadcrumbs Navigation */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-4">
      <nav aria-label="Breadcrumb" className="flex">
        <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-500 font-medium">
          <li>
            <Link
              href="/"
              className="hover:text-amber-600 transition-colors flex items-center gap-1.5 focus:outline-none focus:text-amber-600"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>หน้าแรก</span>
            </Link>
          </li>

          <li>
            <ChevronRight
              className="h-4 w-4 text-neutral-400 shrink-0"
              aria-hidden="true"
            />
          </li>

          <li aria-current="page">
            <span className="text-neutral-900 font-semibold">ทริปของฉัน</span>
          </li>
        </ol>
      </nav>
    </div>

    {/* 🌟 Main Content */}
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-2">
      {/* Action bar */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-3">
            <Luggage className="w-7 h-7" />
            ทริปที่บันทึกไว้
          </h2>
          {!isLoading && trips.length > 0 && (
            <p className="text-neutral-400 mt-2 text-sm">
              {trips.length} ทริปที่บันทึกไว้
            </p>
          )}
        </div>

        <Link
          href="/trips/plan"
          className="bg-black text-white px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-neutral-800 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">จัดทริปใหม่</span>
          <span className="sm:hidden">ใหม่</span>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-neutral-100 overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-neutral-100" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-neutral-100 rounded-lg w-3/4" />
                <div className="h-3 bg-neutral-100 rounded-lg w-1/2" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-neutral-100 rounded-full" />
                  <div className="h-6 w-20 bg-neutral-100 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTrips}
            className="text-sm font-medium text-neutral-600 flex items-center gap-2 mx-auto hover:text-neutral-900 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            โหลดใหม่
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {trips.length === 0 ? (
              <EmptyState key="empty" />
            ) : (
              trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={setEditingTrip}
                  onDelete={handleDelete}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit Drawer */}
      <AnimatePresence>
        {editingTrip && (
          <EditTripModal
            key={editingTrip.id}
            trip={editingTrip}
            onClose={() => setEditingTrip(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </main>
  </>
);
}
