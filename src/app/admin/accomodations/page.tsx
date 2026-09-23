// src/admin/accommodations.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { AddAccommodationModal } from "../../../component/AddAccommodationModal";
import ConfirmDialog from "../../../component/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Phone,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle,
  Inbox,
  Filter,
  Plus,
  X,
  LayoutGrid,
  List,
  BedDouble,
  CheckCircle2,
  FileEdit,
  DollarSign,
  RotateCcw,
  Check,
} from "lucide-react";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  price_range: string;
  min_price: number | null;
  max_price: number | null;
  category: string;
  contact_phone: string;
  contact_line: string;
  contact_facebook: string;
  images: string[] | null;
  created_by: string;
  created_at: string;
  status?: "published" | "draft" | "pending";
}

const CATEGORIES = [
  "ทั้งหมด",
  "โรงแรม",
  "รีสอร์ท",
  "หอพัก",
  "โฮมสเตย์",
  "คอนโด",
  "อื่นๆ",
];

export default function AdminAccommodationsPage() {
  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Modal & Dialog States ─────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ─── Bulk Actions State ────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<{
    type: "status" | "delete";
    ids: string[];
    newStatus?: "published" | "draft";
    title: string;
    message: string;
  } | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // ─── Search, Filter, View & Pagination States ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | "published" | "draft">("all");
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const itemsPerPage = viewMode === "grid" ? 9 : 6;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoaded(true);
    };
    fetchSession();
  }, [supabase.auth]);

  useEffect(() => {
    if (!authLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAccommodations();
  }, [user, authLoaded]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, activeStatus, activeCategory, accommodations.length, viewMode]);

  const fetchAccommodations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("accommodations")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map((item) => ({
        ...item,
        images:
          typeof item.images === "string"
            ? JSON.parse(item.images)
            : item.images || [],
      }));

      setAccommodations(formattedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล",
      );
      toast.error("ไม่สามารถโหลดข้อมูลที่พักได้");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (accommodation: Accommodation) => {
    setEditingAccommodation(accommodation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccommodation(null);
  };

  const handleSuccess = () => {
    fetchAccommodations();
    handleCloseModal();
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;

    try {
      setDeletingId(id);
      setError(null);

      const { error: deleteError } = await supabase
        .from("accommodations")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setAccommodations((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteConfirm(null);
      toast.success("ลบข้อมูลที่พักสำเร็จ");

      if (displayedAccommodations.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ");
      toast.error("ไม่สามารถลบข้อมูลได้");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Bulk Logic Handlers ───
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        displayedAccommodations.forEach((acc) => next.delete(acc.id));
      } else {
        displayedAccommodations.forEach((acc) => next.add(acc.id));
      }
      return next;
    });
  };

  const handleBulkActionConfirm = async () => {
    if (!bulkDialog) return;
    try {
      setIsBulkProcessing(true);
      const { type, ids, newStatus } = bulkDialog;

      if (type === "status" && newStatus) {
        const { error: updateError } = await supabase
          .from("accommodations")
          .update({ status: newStatus })
          .in("id", ids);

        if (updateError) throw updateError;
        toast.success(`เปลี่ยนสถานะที่พักจำนวน ${ids.length} รายการแล้ว`);
      } else if (type === "delete") {
        const { error: deleteError } = await supabase
          .from("accommodations")
          .delete()
          .in("id", ids);

        if (deleteError) throw deleteError;
        toast.success(`ลบข้อมูลที่พักจำนวน ${ids.length} รายการเรียบร้อยแล้ว`);
      }

      setSelectedIds(new Set());
      setBulkDialog(null);
      fetchAccommodations();
    } catch (err) {
      toast.error("การทำรายการจัดการแบบกลุ่มล้มเหลว");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // ─── KPI Metrics ───
  const metrics = useMemo(() => {
    const total = accommodations.length;
    const published = accommodations.filter(
      (a) => a.status === "published" || !a.status
    ).length;
    const drafts = accommodations.filter((a) => a.status === "draft").length;
    const withPrice = accommodations.filter(
      (a) => a.min_price || a.max_price || a.price_range
    ).length;

    return { total, published, drafts, withPrice };
  }, [accommodations]);

  const filteredAccommodations = useMemo(() => {
    return accommodations.filter((acc) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        (acc.address && acc.address.toLowerCase().includes(q)) ||
        (acc.description && acc.description.toLowerCase().includes(q));

      const matchesStatus =
        activeStatus === "all" ? true : acc.status === activeStatus;

      const matchesCategory =
        activeCategory === "ทั้งหมด" ? true : acc.category === activeCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [accommodations, searchQuery, activeStatus, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredAccommodations.length / itemsPerPage));
  const displayedAccommodations = useMemo(() => {
    return filteredAccommodations.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage,
    );
  }, [filteredAccommodations, page, itemsPerPage]);

  const allOnPageSelected = useMemo(() => {
    return (
      displayedAccommodations.length > 0 &&
      displayedAccommodations.every((acc) => selectedIds.has(acc.id))
    );
  }, [displayedAccommodations, selectedIds]);

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    activeStatus !== "all" ||
    activeCategory !== "ทั้งหมด";

  const resetFilters = () => {
    setSearchQuery("");
    setActiveStatus("all");
    setActiveCategory("ทั้งหมด");
  };

  if (authLoaded && !user) {
    return (
      <main className="max-w-6xl mx-auto py-20 px-4 flex justify-center font-sans text-stone-900">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-sm w-full shadow-sm flex flex-col items-center justify-center">
          <AlertCircle size={32} className="text-stone-400 mb-3" />
          <h2 className="text-sm font-semibold text-stone-900 mb-1">
            จำเป็นต้องเข้าสู่ระบบ
          </h2>
          <p className="text-stone-500 text-xs max-w-xs mx-auto leading-relaxed">
            กรุณาเข้าสู่ระบบด้วยบัญชีแอดมินก่อนตรวจสอบและจัดการข้อมูลระบบหลังบ้าน
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 font-sans text-stone-900 selection:bg-teal-100 selection:text-teal-900">
      <main className="max-w-6xl mx-auto pt-8 sm:pt-10 px-4 sm:px-6 lg:px-8">
        {/* ─── 1. HEADER ─── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between border-b border-stone-200/80 pb-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-0.5 text-xs font-semibold text-teal-800 mb-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
              จัดการห้องพัก & ที่พัก • Stays & Accommodations
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              จัดการห้องพัก & ที่พัก
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              จัดการข้อมูลห้องพัก โรงแรม รีสอร์ท และโฮมสเตย์สำหรับนักเดินทาง
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition-all hover:bg-teal-800 shadow-md shadow-teal-900/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 sm:w-auto cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.2} />
            เพิ่มที่พักใหม่
          </button>
        </motion.div>

        {/* ─── 2. KPI Summary Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
              <BedDouble size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                ที่พักทั้งหมด
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {loading ? "—" : metrics.total} แห่ง
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                เผยแพร่แล้ว
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {loading ? "—" : metrics.published} แห่ง
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
              <FileEdit size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                แบบร่าง
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {loading ? "—" : metrics.drafts} แห่ง
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-400 truncate">
                มีข้อมูลราคา
              </div>
              <div className="text-xl font-bold text-stone-900 tabular-nums mt-0.5">
                {loading ? "—" : metrics.withPrice} แห่ง
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. TOOLBAR: Search + View Switcher + Filter ─── */}
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs mb-6 space-y-3">
          {/* Top Row: Search + Status Filter + View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 w-full group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-stone-100/90 group-focus-within:bg-teal-50 flex items-center justify-center transition-colors pointer-events-none">
                <Search
                  className="w-4 h-4 text-stone-400 group-focus-within:text-teal-700 transition-colors"
                  strokeWidth={2.2}
                />
              </div>
              <input
                type="text"
                placeholder="ค้นหาจากชื่อที่พัก หรือทำเลที่ตั้ง (เช่น ปากช่อง, เขาใหญ่, ในเมือง)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-11 pr-9 bg-stone-50/70 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 p-0.5 transition-colors cursor-pointer"
                  aria-label="ล้างการค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status selector */}
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value as any)}
              className="h-10 px-3 text-xs bg-stone-50/70 border border-stone-200 rounded-xl text-stone-700 font-medium outline-none focus:border-teal-600 focus:bg-white cursor-pointer"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="published">🟢 เผยแพร่แล้ว</option>
              <option value="draft">🟡 แบบร่าง</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/60 shrink-0 self-end sm:self-center">
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

          {/* Category filter strip */}
          <div className="flex items-center justify-between overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-stone-100">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-stone-400 pr-1 flex items-center gap-1 shrink-0 select-none">
                <Filter size={11} /> ประเภท:
              </span>
              {CATEGORIES.map((cat) => {
                const count =
                  cat === "ทั้งหมด"
                    ? accommodations.length
                    : accommodations.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 select-none cursor-pointer flex items-center gap-1.5 ${
                      activeCategory === cat
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-stone-50"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] tabular-nums font-normal ${
                        activeCategory === cat ? "text-teal-200" : "text-stone-400"
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}

              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Select All Sub-control */}
            {!loading && filteredAccommodations.length > 0 && (
              <div className="flex items-center gap-3 pl-4 text-xs text-stone-500 shrink-0">
                <span className="text-stone-400 hidden sm:inline">
                  พบ {filteredAccommodations.length} แห่ง
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-teal-700 accent-teal-700 cursor-pointer"
                    id="select-all"
                  />
                  <label
                    htmlFor="select-all"
                    className="cursor-pointer hover:text-stone-700 select-none font-medium"
                  >
                    เลือกทั้งหมดในหน้านี้
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── 4. CORE ACCOMMODATION CONTENT ─── */}
        <div className="min-h-100">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    : "space-y-3"
                }
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs animate-pulse p-4"
                  >
                    <div className="aspect-16/10 bg-stone-100 rounded-xl w-full mb-3" />
                    <div className="space-y-2">
                      <div className="h-4 bg-stone-200 rounded w-2/3" />
                      <div className="h-3.5 bg-stone-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : filteredAccommodations.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-dashed border-stone-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-xs"
              >
                <div className="w-12 h-12 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center mb-3 text-stone-400">
                  <Inbox size={22} />
                </div>
                <h3 className="text-base font-semibold text-stone-900">
                  ไม่พบรายการห้องพัก
                </h3>
                <p className="text-stone-500 text-xs mt-1 max-w-sm">
                  {searchQuery
                    ? `ไม่พบข้อมูลที่ตรงกับคำค้นหา "${searchQuery}"`
                    : "ยังไม่มีข้อมูลที่ตรงกับตัวกรองที่เลือกในขณะนี้"}
                </p>
                {isAnyFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ล้างการค้นหาและตัวกรองทั้งหมด
                  </button>
                )}
              </motion.div>
            ) : viewMode === "grid" ? (
              /* ─── GRID VIEW (3 Columns) ─── */
              <motion.div
                key="grid-view"
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {displayedAccommodations.map((acc) => {
                  const isSelected = selectedIds.has(acc.id);
                  const hasImages = acc.images && acc.images.length > 0;
                  const firstImg = hasImages ? acc.images![0] : null;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      key={acc.id}
                      className={`group bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all border flex flex-col justify-between ${
                        isSelected
                          ? "border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/20"
                          : "border-stone-200/80 hover:border-teal-300"
                      }`}
                    >
                      <div>
                        {/* Thumbnail Area */}
                        <div
                          onClick={() => handleEdit(acc)}
                          className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
                        >
                          {firstImg ? (
                            <>
                              <img
                                src={firstImg}
                                alt={acc.name}
                                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                                loading="lazy"
                              />
                              {acc.images!.length > 1 && (
                                <div className="absolute bottom-2.5 right-2.5 bg-stone-950/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs select-none">
                                  +{acc.images!.length - 1} รูป
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                              <ImageIcon size={32} strokeWidth={1.5} />
                              <span className="text-[11px] text-stone-400 mt-1">
                                ไม่มีรูปภาพ
                              </span>
                            </div>
                          )}

                          {/* Top-left: Category Badge */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className="bg-teal-900/85 backdrop-blur-xs text-teal-50 border border-teal-700/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-2xs">
                              {acc.category || "ที่พัก"}
                            </span>
                          </div>

                          {/* Top-right: Select checkbox */}
                          <div
                            className="absolute top-2.5 right-2.5 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectOne(acc.id);
                            }}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-teal-700 text-white shadow-sm"
                                  : "bg-white/85 text-transparent border border-stone-300 hover:bg-white"
                              }`}
                            >
                              <Check size={14} strokeWidth={3} className={isSelected ? "block" : "hidden"} />
                            </div>
                          </div>
                        </div>

                        {/* Body Details */}
                        <div className="p-4 space-y-2.5">
                          {/* Status & Location line */}
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span
                              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                                acc.status === "published" || !acc.status
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                  : "bg-amber-50 text-amber-800 border border-amber-200/60"
                              }`}
                            >
                              {acc.status === "draft" ? "🟡 แบบร่าง" : "🟢 เผยแพร่แล้ว"}
                            </span>

                            {acc.address && (
                              <span className="flex items-center gap-1 text-[11px] text-stone-500 truncate max-w-40">
                                <MapPin size={11} className="shrink-0 text-stone-400" />
                                <span className="truncate">{acc.address}</span>
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3
                            onClick={() => handleEdit(acc)}
                            className="text-base font-bold text-stone-900 tracking-tight leading-snug truncate group-hover:text-teal-700 transition-colors cursor-pointer"
                            title={acc.name}
                          >
                            {acc.name}
                          </h3>

                          {/* Description */}
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed min-h-8">
                            {acc.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                          </p>

                          {/* Price & Contact Row */}
                          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                            <div className="text-xs text-stone-500 font-medium truncate pr-2">
                              {acc.contact_phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} className="text-teal-700 shrink-0" />
                                  <span>{acc.contact_phone}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-stone-400 italic">
                                  ไม่มีเบอร์ติดต่อ
                                </span>
                              )}
                            </div>

                            <div className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                              {acc.price_range
                                ? `${acc.price_range} บ.`
                                : acc.min_price
                                  ? `฿${acc.min_price}`
                                  : "สอบถามราคา"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="p-3 bg-stone-50/70 border-t border-stone-100 flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(acc)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 size={13} className="text-teal-700" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(acc.id, acc.name)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                          title="ลบที่พัก"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">ลบ</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              /* ─── LIST VIEW (Horizontal Rows) ─── */
              <motion.div key="list-view" layout className="space-y-3">
                {displayedAccommodations.map((acc) => {
                  const isSelected = selectedIds.has(acc.id);
                  const hasImages = acc.images && acc.images.length > 0;
                  const firstImg = hasImages ? acc.images![0] : null;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      key={acc.id}
                      className={`group bg-white rounded-2xl p-4 shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-4.5 border ${
                        isSelected
                          ? "border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/30"
                          : "border-stone-200/80 hover:border-teal-300 hover:shadow-md"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div
                        onClick={() => handleEdit(acc)}
                        className="relative w-full sm:w-44 aspect-16/10 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 flex items-center justify-center cursor-pointer"
                      >
                        {firstImg ? (
                          <>
                            <img
                              src={firstImg}
                              alt={acc.name}
                              className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                              loading="lazy"
                            />
                            {acc.images!.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-stone-950/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                                +{acc.images!.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <ImageIcon size={24} className="text-stone-300" />
                        )}

                        <div className="absolute top-2 left-2">
                          <span className="bg-teal-900/85 backdrop-blur-xs text-teal-50 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                            {acc.category || "ที่พัก"}
                          </span>
                        </div>
                      </div>

                      {/* Content Details Block */}
                      <div
                        onClick={() => handleEdit(acc)}
                        className="flex-1 flex flex-col justify-between min-w-0 py-0.5 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium truncate mb-1">
                            <span
                              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                                acc.status === "published" || !acc.status
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                  : "bg-amber-50 text-amber-800 border border-amber-200/60"
                              }`}
                            >
                              {acc.status === "draft" ? "🟡 แบบร่าง" : "🟢 เผยแพร่แล้ว"}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="flex items-center gap-1 truncate text-stone-400">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate">
                                {acc.address || "ไม่ได้ระบุตำแหน่งที่ตั้ง"}
                              </span>
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-stone-900 tracking-tight truncate leading-snug group-hover:text-teal-700 transition-colors">
                            {acc.name}
                          </h3>

                          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                            {acc.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                          </p>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-xs text-stone-500">
                          <div className="flex items-center gap-3 truncate">
                            {acc.contact_phone ? (
                              <span className="flex items-center gap-1 text-stone-600 font-medium">
                                <Phone size={12} className="text-teal-700" />{" "}
                                {acc.contact_phone}
                              </span>
                            ) : (
                              <span className="italic text-stone-400 text-[11px]">
                                ไม่มีเบอร์ติดต่อ
                              </span>
                            )}
                          </div>

                          {/* Warm Amber Price Badge */}
                          <div className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                            {acc.price_range
                              ? `${acc.price_range} บ.`
                              : acc.min_price
                                ? `฿${acc.min_price}`
                                : "สอบถามราคา"}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Column */}
                      <div className="sm:border-l sm:border-stone-100 sm:pl-4 flex sm:flex-col gap-2 shrink-0 justify-center">
                        <button
                          onClick={() => handleEdit(acc)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 size={13} className="text-teal-700" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(acc.id, acc.name)}
                          className="inline-flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">ลบ</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── 5. PAGINATION ─── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-1">
            <p className="hidden sm:block text-xs text-stone-500">
              แสดง{" "}
              <span className="font-semibold text-stone-900">
                {(page - 1) * itemsPerPage + 1}
              </span>
              –
              <span className="font-semibold text-stone-900">
                {Math.min(page * itemsPerPage, filteredAccommodations.length)}
              </span>{" "}
              จาก{" "}
              <span className="font-semibold text-stone-900">
                {filteredAccommodations.length}
              </span>{" "}
              แห่ง
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>ก่อนหน้า</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors flex items-center justify-center cursor-pointer ${
                        page === pageNum
                          ? "bg-teal-700 text-white shadow-xs"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ),
                )}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <span>ถัดไป</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Floating Bulk Action Bar ─── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 bg-stone-900 text-white rounded-2xl shadow-xl border border-stone-800">
                <span className="text-xs font-semibold px-1">
                  เลือกแล้ว {selectedIds.size} รายการ
                </span>
                <div className="w-px h-4 bg-stone-700" />
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "status",
                      ids: Array.from(selectedIds),
                      newStatus: "published",
                      title: "เผยแพร่ที่พัก",
                      message: `ยืนยันการเผยแพร่ที่พักจำนวน ${selectedIds.size} แห่ง?`,
                    })
                  }
                  className="text-xs font-semibold text-teal-300 hover:text-teal-200 hover:bg-stone-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  เผยแพร่
                </button>
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "status",
                      ids: Array.from(selectedIds),
                      newStatus: "draft",
                      title: "เปลี่ยนเป็นแบบร่าง",
                      message: `ยืนยันการเปลี่ยนสถานะเป็นแบบร่าง ${selectedIds.size} แห่ง?`,
                    })
                  }
                  className="text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  แบบร่าง
                </button>
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "delete",
                      ids: Array.from(selectedIds),
                      title: "ลบรายการที่พัก",
                      message: `คุณแน่ใจหรือไม่ว่าต้องการลบที่พักจำนวน ${selectedIds.size} แห่งออกจากระบบอย่างถาวร?`,
                    })
                  }
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  ลบ
                </button>
                <div className="w-px h-4 bg-stone-700 ml-1" />
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 text-stone-400 hover:text-white transition-colors rounded-lg cursor-pointer"
                  aria-label="ล้างการเลือก"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Delete Single Confirmation Dialog ─── */}
        <ConfirmDialog
          open={!!deleteConfirm}
          danger={true}
          loading={!!deletingId}
          title="ลบข้อมูลที่พัก"
          message={
            <span className="block leading-relaxed">
              คุณต้องการลบข้อมูลที่พัก{" "}
              <span className="font-semibold text-stone-900">
                {deleteConfirm?.name}
              </span>{" "}
              ออกจากระบบหรือไม่? ข้อมูลทั้งหมดจะถูก{" "}
              <span className="font-semibold text-stone-900">ลบอย่างถาวร</span>{" "}
              โดยไม่สามารถกู้คืนได้
            </span>
          }
          confirmText="ลบถาวร"
          cancelText="ยกเลิก"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />

        {/* ─── Bulk Action Confirmation Dialog ─── */}
        <ConfirmDialog
          open={!!bulkDialog}
          danger={bulkDialog?.type === "delete"}
          loading={isBulkProcessing}
          title={bulkDialog?.title || ""}
          message={bulkDialog?.message || ""}
          confirmText={bulkDialog?.type === "delete" ? "ลบถาวร" : "ยืนยัน"}
          cancelText="ยกเลิก"
          onConfirm={handleBulkActionConfirm}
          onCancel={() => setBulkDialog(null)}
        />

        {/* ─── Add/Edit Modal Component ─── */}
        <AddAccommodationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          editAccommodation={editingAccommodation}
        />
      </main>
    </div>
  );
}
