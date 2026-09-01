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
  MoreHorizontal,
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
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

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

  // ─── Search, Filter & Pagination States ────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

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
  }, [searchQuery, activeFilter, accommodations.length]);

  useEffect(() => {
    const closeMenus = () => setOpenCardMenuId(null);
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

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

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenCardMenuId(openCardMenuId === id ? null : id);
  };

  // ─── Bulk Logic Handlers ───
  const toggleSelectOne = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
  ) => {
    e.stopPropagation();
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

  const filteredAccommodations = useMemo(() => {
    return accommodations.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.address &&
          acc.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter =
        activeFilter === "all" ? true : acc.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [accommodations, searchQuery, activeFilter]);

  const totalPages = Math.ceil(filteredAccommodations.length / itemsPerPage);
  const displayedAccommodations = useMemo(() => {
    return filteredAccommodations.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage,
    );
  }, [filteredAccommodations, page]);

  const allOnPageSelected = useMemo(() => {
    return (
      displayedAccommodations.length > 0 &&
      displayedAccommodations.every((acc) => selectedIds.has(acc.id))
    );
  }, [displayedAccommodations, selectedIds]);

  if (authLoaded && !user) {
    return (
      <main className="max-w-6xl mx-auto py-20 px-4 flex justify-center font-sans text-zinc-900">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center max-w-sm w-full shadow-sm flex flex-col items-center justify-center">
          <AlertCircle size={32} className="text-zinc-400 mb-3" />
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">
            จำเป็นต้องเข้าสู่ระบบ
          </h2>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">
            กรุณาเข้าสู่ระบบด้วยบัญชีแอดมินก่อนตรวจสอบและจัดการข้อมูลระบบหลังบ้าน
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-6xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
        {/* ─── 1. HEADER ─── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              จัดการห้องพัก & ที่พัก
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              จัดการข้อมูลห้องพัก และที่พักต่างๆ
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:w-auto"
          >
            <Plus size={16} />
            เพิ่มที่พักใหม่
          </button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 p-3.5 rounded-xl mb-6 text-red-700 text-xs font-medium flex items-center gap-2.5"
            >
              <AlertCircle size={14} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 2. TOOLBAR ─── */}
        <div className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-sm mb-6 space-y-2.5">
          {/* Search Row */}
          <div className="relative flex items-center">
            <Search
              className="absolute left-3 text-zinc-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหาจากชื่อที่พัก หรือทำเลที่ตั้ง (เช่น หลังมอ, หน้ามอ, ชื่อถนน)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-9 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter strip */}
          <div className="flex items-center justify-between overflow-x-auto pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-medium text-zinc-400 pr-1 flex items-center gap-1 shrink-0 select-none">
                <Filter size={11} /> สถานะ
              </span>
              {(["all", "published", "draft"] as const).map((tab) => {
                const label =
                  tab === "all"
                    ? "ทั้งหมด"
                    : tab === "published"
                      ? "เผยแพร่แล้ว"
                      : "แบบร่าง";
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 select-none ${
                      activeFilter === tab
                        ? "bg-blue-600 text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Select All Sub-control */}
            {!loading && filteredAccommodations.length > 0 && (
              <div className="flex items-center gap-2 pl-4 text-xs text-zinc-400 shrink-0">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  className="w-3.5 h-3.5 rounded border-zinc-300 accent-blue-600 cursor-pointer"
                  id="select-all"
                />
                <label
                  htmlFor="select-all"
                  className="cursor-pointer hover:text-zinc-600 select-none"
                >
                  เลือกทั้งหมดในหน้านี้
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. CORE CARD STREAM ─── */}
        <div className="min-h-100 space-y-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                className="space-y-4"
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-5 animate-pulse"
                  >
                    <div className="w-full sm:w-60 aspect-16/10 rounded-lg bg-zinc-100 shrink-0" />
                    <div className="flex-1 flex flex-col justify-between py-1 space-y-4">
                      <div className="space-y-2.5">
                        <div className="h-3.5 bg-zinc-100 rounded w-1/3" />
                        <div className="h-5 bg-zinc-200 rounded w-3/4" />
                        <div className="h-4 bg-zinc-100 rounded w-full mt-3" />
                      </div>
                      <div className="pt-3 border-t border-zinc-100 flex justify-between">
                        <div className="h-3 bg-zinc-100 rounded w-24" />
                        <div className="h-4 bg-zinc-200 rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : filteredAccommodations.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-dashed border-zinc-200 rounded-xl p-16 text-center flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center mb-3 text-zinc-400">
                  <Inbox size={18} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  ไม่พบรายการห้องพัก
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  ยังไม่มีข้อมูลที่ตรงกับการค้นหาในหมวดหมู่นี้
                </p>
              </motion.div>
            ) : (
              <motion.div key="card-list" layout className="space-y-4">
                {displayedAccommodations.map((acc) => {
                  const isSelected = selectedIds.has(acc.id);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      key={acc.id}
                      onClick={() => handleEdit(acc)}
                      className={`group bg-white rounded-xl p-4 shadow-sm transition-colors flex flex-col sm:flex-row gap-5 relative cursor-pointer border ${
                        isSelected
                          ? "border-blue-600 ring-1 ring-blue-600/10 bg-blue-50/40"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {/* ─── THUMBNAIL BLOCK ─── */}
                      <div className="relative w-full sm:w-60 aspect-16/10 shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-100 flex items-center justify-center">
                        {acc.images && acc.images.length > 0 ? (
                          <>
                            <img
                              src={acc.images[0]}
                              alt={acc.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {acc.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-zinc-900/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                                +{acc.images.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <ImageIcon size={28} className="text-zinc-300" />
                        )}

                        <div
                          className="absolute top-2 left-2 flex items-center gap-1.5 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="bg-white/95 text-zinc-700 border border-zinc-200 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            {acc.category || "ที่พัก"}
                          </span>
                        </div>
                      </div>

                      {/* ─── CONTENT DETAILS BLOCK ─── */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                        <div className="relative pr-8">
                          <div
                            className="absolute top-0 right-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleMenuToggle(e, acc.id)}
                              className="p-1 text-zinc-400 hover:text-blue-600 rounded-md transition-colors"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            <AnimatePresence>
                              {openCardMenuId === acc.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.98, y: 4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                                  className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50 text-left overflow-hidden"
                                >
                                  <button
                                    onClick={() => {
                                      handleEdit(acc);
                                      setOpenCardMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 flex items-center gap-2 font-medium"
                                  >
                                    <Edit3
                                      size={13}
                                      className="text-zinc-400"
                                    />{" "}
                                    แก้ไขข้อมูล
                                  </button>
                                  <div className="h-px bg-zinc-100 my-1" />
                                  <button
                                    onClick={() => {
                                      handleDeleteClick(acc.id, acc.name);
                                      setOpenCardMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                  >
                                    <Trash2
                                      size={13}
                                      className="text-red-500/70"
                                    />{" "}
                                    ลบที่พักออก
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium truncate mb-1.5 pr-6">
                            <span
                              className={`font-semibold ${acc.status === "published" ? "text-emerald-600" : "text-amber-500"}`}
                            >
                              {acc.status === "published"
                                ? "🟢 เผยแพร่แล้ว"
                                : "🟡 แบบร่าง"}
                            </span>
                            <span className="text-zinc-300">•</span>
                            <span className="flex items-center gap-1 truncate text-zinc-400">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">
                                {acc.address || "ไม่ได้ระบุตำแหน่งที่ตั้ง"}
                              </span>
                            </span>
                          </div>

                          <h3 className="text-[15px] font-semibold text-zinc-900 tracking-tight truncate leading-snug">
                            {acc.name}
                          </h3>

                          <p className="text-sm text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed pr-4">
                            {acc.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                          <div className="flex items-center gap-3 truncate">
                            {acc.contact_phone ? (
                              <span className="flex items-center gap-1 font-medium text-zinc-600">
                                <Phone size={11} className="text-zinc-400" />{" "}
                                {acc.contact_phone}
                              </span>
                            ) : (
                              <span className="italic text-zinc-300">
                                ไม่มีข้อมูลเบอร์ติดต่อ
                              </span>
                            )}
                            {acc.contact_line && (
                              <span>• LINE: {acc.contact_line}</span>
                            )}
                          </div>

                          <div className="font-semibold text-zinc-900 text-sm shrink-0 pl-2">
                            {acc.price_range
                              ? `${acc.price_range} บ./เดือน`
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Pagination ─── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-1">
            <p className="hidden sm:block text-xs text-zinc-500">
              แสดง{" "}
              <span className="font-medium text-zinc-900">
                {(page - 1) * itemsPerPage + 1}
              </span>
              –
              <span className="font-medium text-zinc-900">
                {Math.min(page * itemsPerPage, filteredAccommodations.length)}
              </span>{" "}
              จาก{" "}
              <span className="font-medium text-zinc-900">
                {filteredAccommodations.length}
              </span>{" "}
              รายการ
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14} />
                <span>ก่อนหน้า</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                        page === pNum
                          ? "bg-blue-600 text-white"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      {pNum}
                    </button>
                  ),
                )}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <span>ถัดไป</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Floating bulk-action bar ─── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 text-white rounded-xl shadow-lg border border-zinc-800 text-xs font-medium">
                <span className="text-zinc-300">
                  เลือกแล้ว{" "}
                  <span className="text-white font-semibold">
                    {selectedIds.size}
                  </span>{" "}
                  รายการ
                </span>
                <div className="w-px h-4 bg-zinc-700" />
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "status",
                      ids: Array.from(selectedIds),
                      newStatus: "published",
                      title: "เผยแพร่ที่พัก",
                      message: `ยืนยันการเปิดเผยแพร่ที่พัก ${selectedIds.size} รายการ?`,
                    })
                  }
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1 rounded-md transition-colors"
                >
                  เผยแพร่
                </button>
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "status",
                      ids: Array.from(selectedIds),
                      newStatus: "draft",
                      title: "ตั้งเป็นแบบร่าง",
                      message: `ยืนยันการซ่อนเป็นแบบร่าง ${selectedIds.size} รายการ?`,
                    })
                  }
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1 rounded-md transition-colors"
                >
                  แบบร่าง
                </button>
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "delete",
                      ids: Array.from(selectedIds),
                      title: "ลบที่พัก",
                      message: `ยืนยันการลบที่พัก ${selectedIds.size} รายการอย่างถาวร?`,
                    })
                  }
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2 py-1 rounded-md transition-colors"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AddAccommodationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          editAccommodation={editingAccommodation}
        />

        <ConfirmDialog
          open={!!deleteConfirm}
          danger={true}
          loading={!!deletingId}
          title="ลบข้อมูลที่พัก"
          message={
            <span className="block">
              ยืนยันการลบ &quot;{deleteConfirm?.name}&quot; อย่างถาวร?
            </span>
          }
          confirmText="ลบถาวร"
          cancelText="ยกเลิก"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />

        <ConfirmDialog
          open={!!bulkDialog}
          danger={bulkDialog?.type === "delete"}
          loading={isBulkProcessing}
          title={bulkDialog?.title || ""}
          message={<span className="block">{bulkDialog?.message}</span>}
          confirmText={bulkDialog?.type === "delete" ? "ลบถาวร" : "ยืนยัน"}
          cancelText="ยกเลิก"
          onConfirm={handleBulkActionConfirm}
          onCancel={() => setBulkDialog(null)}
        />
      </main>
    </div>
  );
}
