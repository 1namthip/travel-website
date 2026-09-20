"use client";

import { useState, useEffect, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import RestaurantsTable from "@/component/RestaurantsTable";
import RestaurantModal from "@/component/RestaurantModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  X,
  UtensilsCrossed,
  LayoutGrid,
  List,
  Coffee,
  Soup,
  Cake,
  RotateCcw,
} from "lucide-react";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ทั้งหมด");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

  // ─── KPI Metrics ───
  const metrics = useMemo(() => {
    const total = restaurants.length;
    const local = restaurants.filter(
      (r) => r.category === "อาหารไทย" || r.category === "อาหารอีสาน"
    ).length;
    const cafe = restaurants.filter(
      (r) => r.category === "คาเฟ่ / กาแฟ"
    ).length;
    const dessert = restaurants.filter(
      (r) =>
        r.category === "ของหวาน / เบเกอรี่" || r.category === "บุฟเฟ่ต์"
    ).length;

    return { total, local, cafe, dessert };
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q);
      const matchCategory = filter === "ทั้งหมด" || r.category === filter;
      return matchSearch && matchCategory;
    });
  }, [restaurants, search, filter]);

  const handleOpenModal = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      location: "",
      category: "อาหารไทย",
      image_url: [],
      phone: "",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-8 sm:py-10 font-sans text-stone-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Dark Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1c1917",
            color: "#fff",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: 500,
            border: "1px solid #292524",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          },
        }}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── 1. Header Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between border-b border-stone-200/80 pb-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-0.5 text-xs font-semibold text-teal-800 mb-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
              จัดการร้านอาหารและคาเฟ่ • Dining & Cafes
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              จัดการร้านอาหารและคาเฟ่
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              จัดการข้อมูลร้านอาหาร เมนูแนะนำ ข้อมูลติดต่อ และรูปภาพประกอบ
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition-all hover:bg-teal-800 shadow-md shadow-teal-900/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 sm:w-auto cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.2} />
            เพิ่มร้านอาหาร
          </button>
        </motion.div>

        {/* ─── 2. KPI Summary Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
              <UtensilsCrossed size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                ร้านทั้งหมดในระบบ
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {isLoading ? "—" : metrics.total} ร้าน
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
              <Soup size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                อาหารไทย & อีสาน
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {isLoading ? "—" : metrics.local} ร้าน
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
              <Coffee size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                คาเฟ่ & เครื่องดื่ม
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {isLoading ? "—" : metrics.cafe} ร้าน
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 border border-stone-200/60">
              <Cake size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                ของหวาน & บุฟเฟ่ต์
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {isLoading ? "—" : metrics.dessert} ร้าน
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. Toolbar: Search + View Switcher + Filter ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs mb-6 space-y-3"
        >
          {/* Search Row + View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 flex items-center">
              <Search
                className="absolute left-3.5 text-stone-400 pointer-events-none"
                size={16}
              />
              <input
                type="text"
                placeholder="ค้นหาจากชื่อร้าน หรือทำเลที่ตั้ง (เช่น ปากช่อง, เขาใหญ่, ในเมือง)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-9 bg-stone-50/70 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
                  aria-label="ล้างการค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-xs text-stone-400 sm:hidden">มุมมอง:</span>
              <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="แสดงแบบการ์ด 3 คอลัมน์"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-teal-700 shadow-xs font-semibold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="แสดงแบบแถวรายการ"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-teal-700 shadow-xs font-semibold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Category filter strip */}
          <div className="flex items-center justify-between overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-stone-100">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-stone-400 pr-1 flex items-center gap-1 shrink-0 select-none">
                <Filter size={11} /> หมวดหมู่:
              </span>
              {categories.map((cat) => {
                const count =
                  cat === "ทั้งหมด"
                    ? restaurants.length
                    : restaurants.filter((r) => r.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 cursor-pointer flex items-center gap-1.5 ${
                      filter === cat
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-stone-50"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] tabular-nums font-normal ${
                        filter === cat ? "text-teal-200" : "text-stone-400"
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}

              {(search || filter !== "ทั้งหมด") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilter("ทั้งหมด");
                  }}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="text-xs text-stone-400 pl-4 shrink-0 hidden md:block">
              พบ {filteredRestaurants.length} ร้าน
            </div>
          </div>
        </motion.div>

        {/* ─── 4. Main Restaurant Content ─── */}
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
                <RestaurantsTableSkeleton viewMode={viewMode} />
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
                  viewMode={viewMode}
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
// Skeleton Loader
// ============================================================================
function RestaurantsTableSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs animate-pulse"
          >
            <div className="aspect-16/10 bg-stone-100 w-full" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-stone-100 rounded w-1/3" />
              <div className="h-5 bg-stone-200 rounded w-3/4" />
              <div className="h-3.5 bg-stone-100 rounded w-full" />
              <div className="pt-3 border-t border-stone-100 flex justify-between">
                <div className="h-4 bg-stone-100 rounded w-20" />
                <div className="h-4 bg-stone-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-4.5 animate-pulse"
        >
          <div className="w-full sm:w-44 aspect-16/10 rounded-xl bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-3.5 bg-stone-100 rounded w-24" />
            <div className="h-5 bg-stone-200 rounded w-1/2" />
            <div className="h-3 bg-stone-100 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
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
    <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-16 text-center flex flex-col items-center justify-center shadow-xs">
      <div className="w-12 h-12 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center mb-3 text-stone-400">
        <UtensilsCrossed size={22} />
      </div>
      <h3 className="text-base font-semibold text-stone-900">
        ไม่พบรายการร้านอาหาร
      </h3>
      <p className="text-stone-500 text-xs mt-1 max-w-sm">
        {search
          ? `ไม่พบข้อมูลที่ตรงกับคำค้นหา "${search}"`
          : `ไม่มีร้านอาหารในหมวดหมู่ "${filter}"`}
      </p>
      <button
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
      >
        ล้างการค้นหาและตัวกรองทั้งหมด
      </button>
    </div>
  );
}
