"use client";

import { useState, useEffect, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import RestaurantsTable from "@/component/RestaurantsTable";
import RestaurantModal from "@/component/RestaurantModal";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Store, Filter, X, UtensilsCrossed } from "lucide-react";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ทั้งหมด");
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState<any>({
    id: "",
    name: "",
    description: "",
    image_url: [],
    location: "",
    category: "",
    phone: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/restaurants");
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filter === "ทั้งหมด" || r.category === filter;
      return matchSearch && matchCategory;
    });
  }, [restaurants, search, filter]);

  const categories = [
    "ทั้งหมด",
    "อาหารไทย",
    "อาหารญี่ปุ่น",
    "อาหารเกาหลี",
    "อาหารอีสาน",
    "คาเฟ่ / กาแฟ",
    "บุฟเฟ่ต์",
    "ของหวาน / เบเกอรี่",
  ];

  const handleOpenModal = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      location: "",
      category: "",
      image_url: [],
      phone: "",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-10 font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Premium Linear-style Dark Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181B",
            color: "#fff",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            border: "1px solid #27272A",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          },
        }}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Premium Header Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br
    from-blue-600
    via-blue-500
    to-indigo-700
    border border-white/10
    shadow-[0_8px_30px_rgba(37,99,235,0.35)]
    hover:shadow-[0_12px_40px_rgba(37,99,235,0.5)] text-white"
            >
              <Store size={22} strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                จัดการร้านอาหารและคาเฟ่
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                จัดการข้อมูลร้านอาหาร เมนูแนะนำ รีวิว และตำแหน่งบนแผนที่
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenModal}
            className="
    group relative overflow-hidden
    w-full sm:w-auto
    rounded-xl
    px-5 py-2.5
    text-sm font-semibold tracking-wide
    text-white
    bg-linear-to-br
    from-blue-600
    to-blue-500
    border border-white/10
    shadow-[0_8px_30px_rgba(37,99,235,0.35)]
    hover:shadow-[0_12px_40px_rgba(37,99,235,0.5)]
    hover:-translate-y-0.5
    transition-all duration-300
    active:translate-y-0
    active:scale-[0.98]
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-zinc-400/30
    flex items-center justify-center gap-2
  "
          >
            {/* Shine Effect */}
            <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            {/* Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/10 to-white/5" />

            <Plus
              size={16}
              strokeWidth={2.5}
              className="relative z-10 transition-transform duration-300 group-hover:rotate-90"
            />

            <span className="relative z-10">เพิ่มร้านอาหาร</span>
          </button>
        </motion.div>

        {/* ─── Command Center (Unified Search & Segmented Filter Card) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm mb-6 space-y-3"
        >
          {/* Search Row */}
          <div className="relative flex items-center">
            <Search
              className="absolute left-3 text-zinc-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหาจากชื่อร้าน หรือทำเลที่ตั้ง (เช่น ทองหล่อ, อารีย์, เชียงใหม่)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-zinc-50/80 hover:bg-zinc-100/60 focus:bg-white border border-zinc-200/80 focus:border-zinc-400 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 transition-all outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Pill Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1 pr-1.5 flex items-center gap-1 shrink-0 select-none">
              <Filter size={11} /> หมวดหมู่:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30 ${
                  filter === cat
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Main Table / Skeleton Arena ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="min-h-112"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton-table"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <RestaurantsTableSkeleton />
              </motion.div>
            ) : filteredRestaurants.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmptyRestaurantsState
                  search={search}
                  filter={filter}
                  onReset={() => {
                    setSearch("");
                    setFilter("ทั้งหมด");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="real-table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <RestaurantsTable
                  restaurants={filteredRestaurants}
                  onEdit={(r: any) => {
                    setForm(r);
                    setIsModalOpen(true);
                  }}
                  onDelete={fetchRestaurants}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─── Modal Integration ─── */}
        {isModalOpen && (
          <RestaurantModal
            form={form}
            setForm={setForm}
            onClose={() => setIsModalOpen(false)}
            refreshData={fetchRestaurants}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// 1:1 High-Fidelity Table Skeleton (Zero Cumulative Layout Shift)
// ============================================================================
function RestaurantsTableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden select-none">
      {/* Table Header Mimic */}
      <div className="bg-zinc-50/70 px-6 py-3.5 border-b border-zinc-200 flex items-center justify-between text-xs font-semibold text-zinc-400">
        <div className="w-32 h-3 bg-zinc-200 rounded animate-pulse" />
        <div className="w-20 h-3 bg-zinc-200 rounded animate-pulse hidden sm:block" />
      </div>

      {/* 5 Skeleton Rows */}
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="px-6 py-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {/* Thumbnail placeholder */}
              <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 animate-pulse" />
              {/* Title and Subtitle */}
              <div className="space-y-2 flex-1 max-w-xs">
                <div className="h-4 bg-zinc-100 rounded w-4/5 animate-pulse" />
                <div className="h-3 bg-zinc-50 rounded w-1/2 animate-pulse" />
              </div>
            </div>

            {/* Category Pill skeleton */}
            <div className="hidden md:block w-28 shrink-0">
              <div className="h-5 bg-zinc-100 rounded-full w-20 animate-pulse" />
            </div>

            {/* Location skeleton */}
            <div className="hidden sm:block w-32 shrink-0">
              <div className="h-4 bg-zinc-100 rounded w-24 animate-pulse" />
            </div>

            {/* Action buttons skeleton */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-md bg-zinc-100 animate-pulse" />
              <div className="w-8 h-8 rounded-md bg-zinc-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Premium SaaS Empty State
// ============================================================================
function EmptyRestaurantsState({
  search,
  filter,
  onReset,
}: {
  search: string;
  filter: string;
  onReset: () => void;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-16 text-center flex flex-col items-center justify-center border-dashed">
      <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center mb-4 text-zinc-400 shadow-sm">
        <UtensilsCrossed size={20} strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">
        ไม่พบข้อมูลร้านอาหาร
      </h3>
      <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
        {search
          ? `ไม่มีร้านอาหารที่ตรงกับคำค้นหา "${search}" ในหมวดหมู่ ${filter}`
          : `ยังไม่มีการบันทึกร้านอาหารในหมวดหมู่ "${filter}"`}
      </p>
      {(search || filter !== "ทั้งหมด") && (
        <button
          onClick={onReset}
          className="mt-5 text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 px-3.5 py-2 rounded-lg transition-all"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      )}
    </div>
  );
}
