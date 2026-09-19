"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Destination, OpeningHoursMap, TodayStatus } from "@/types/destination";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmDialog from "@/component/ConfirmDialog";
import DestinationDetailModal from "@/component/Admin/DestinationDetailModal";
import OpeningHoursEditor, { DEFAULT_OPENING_HOURS } from "@/component/OpeningHoursEditor";
import { parseOpeningHours } from "@/lib/opening-hours";
import {
  Search,
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
  Check,
  ChevronDown,
  Loader2,
  Play,
  Eye,
  Ticket,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  RotateCcw,
} from "lucide-react";
import {
  MAX_IMAGES,
  MAX_VIDEOS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  splitMedia,
  isImageFile,
  isVideoFile,
  isVideoUrl,
} from "@/lib/media";

// ==================== TYPES & CONSTANTS ====================
interface DestinationFormData {
  name: string;
  description: string;
  category: Destination["category"];
  image_url: string[];
  min_price: number | string;
  max_price: number | string;
  image_file?: File[];
  opening_hours?: OpeningHoursMap;
  open_days?: string[];
}

const CATEGORIES = [
  "ทั้งหมด",
  "ธรรมชาติ",
  "วัด",
  "ร้านอาหาร",
  "คาเฟ่",
  "ที่พัก",
  "อื่นๆ",
] as const;

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function getTodayDayCode(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const thTime = new Date(utc + 7 * 3600000);
  return DAY_CODES[thTime.getDay()];
}

function getTodayOpeningStatus(d: Destination, todayCode: string): TodayStatus {
  const fullDayMap: Record<string, string> = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
    sat: "saturday",
    sun: "sunday",
  };

  // 1. Check opening_hours JSON
  if (d.opening_hours && typeof d.opening_hours === "object") {
    const sched = d.opening_hours[todayCode] ?? d.opening_hours[fullDayMap[todayCode]];
    if (sched && typeof sched === "object" && typeof sched.is_open === "boolean") {
      if (!sched.is_open) {
        return { status: "closed", label: "ปิดวันนี้" };
      }
      const timeStr = sched.open_time && sched.close_time ? `${sched.open_time}–${sched.close_time}` : "";
      return {
        status: "open",
        label: timeStr ? `เปิดวันนี้ ${timeStr}` : "เปิดวันนี้",
        timeRange: timeStr,
      };
    }
  }

  // 2. Check open_days text[]
  if (d.open_days && Array.isArray(d.open_days) && d.open_days.length > 0) {
    const isOpen = d.open_days.includes(todayCode);
    if (!isOpen) {
      return { status: "closed", label: "ปิดวันนี้" };
    }
    return { status: "open", label: "เปิดวันนี้", timeRange: "08:00–17:00" };
  }

  // 3. Fallback
  return { status: "unset", label: "ยังไม่ได้กำหนดเวลาเปิด-ปิด" };
}

export default function AdminDestinationsPage() {
  const router = useRouter();

  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // ==================== STATES ====================
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [detailDestination, setDetailDestination] = useState<Destination | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string | number;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | number | null>(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [bulkDialog, setBulkDialog] = useState<{
    type: "delete";
    ids: (string | number)[];
    title: string;
    message: string;
  } | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Form States
  const [formData, setFormData] = useState<DestinationFormData>({
    name: "",
    description: "",
    category: "ธรรมชาติ",
    image_url: [],
    min_price: 0,
    max_price: 0,
    opening_hours: DEFAULT_OPENING_HOURS,
    open_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  });
  const [isScheduleValid, setIsScheduleValid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search, Filter, View & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");
  const [feeFilter, setFeeFilter] = useState<"all" | "free" | "paid">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  const todayDayCode = useMemo(() => getTodayDayCode(), []);

  const parseImageUrl = (urlData: string): string[] => {
    if (!urlData) return [];
    if (Array.isArray(urlData)) return urlData;
    try {
      const parsed = JSON.parse(urlData);
      return Array.isArray(parsed) ? parsed : [urlData];
    } catch {
      return [urlData];
    }
  };

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/destinations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDestinations(data);
    } catch (err: any) {
      setError("ไม่สามารถดึงข้อมูลสถานที่ท่องเที่ยวได้");
      toast.error("ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== EFFECTS ====================
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
    let active = true;
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;

        if (!active) return;
        setUser(currentUser);

        if (!currentUser) {
          router.push("/dashboard");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();

        if (profile?.role !== "admin") {
          router.push("/dashboard");
        } else {
          fetchDestinations();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        if (active) setAuthLoaded(true);
      }
    };
    initializeAuth();
    return () => {
      active = false;
    };
  }, [supabase, router, fetchDestinations]);

  useEffect(() => {
    const closeMenus = () => setOpenCardMenuId(null);
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    try {
      setDeletingId(id);
      setError(null);
      const res = await fetch(`/api/destinations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("ลบสถานที่เรียบร้อยแล้ว");
      setDestinations((prev) => prev.filter((d) => d.id !== id));
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));

      if (displayedDestinations.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการลบข้อมูล");
      toast.error("ลบข้อมูลไม่สำเร็จ");
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleBulkActionConfirm = async () => {
    if (!bulkDialog) return;
    try {
      setIsBulkProcessing(true);
      const { ids } = bulkDialog;

      const { error: deleteError } = await supabase
        .from("destinations")
        .delete()
        .in("id", ids);

      if (deleteError) throw deleteError;
      toast.success(`ลบข้อมูลสถานที่จำนวน ${ids.length} รายการเรียบร้อยแล้ว`);

      setSelectedIds([]);
      setBulkDialog(null);
      fetchDestinations();
    } catch (err) {
      toast.error("การทำรายการลบแบบกลุ่มล้มเหลว");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isScheduleValid) {
      toast.error("กรุณาตรวจสอบเวลาเปิด-ปิดให้ถูกต้อง (เวลาเปิดต้องน้อยกว่าเวลาปิด)");
      return;
    }

    setIsSubmitting(true);
    const method = editingDestination ? "PUT" : "POST";
    const url = editingDestination
      ? `/api/destinations/${editingDestination.id}`
      : "/api/destinations";

    try {
      const { images: existingImages, videos: existingVideos } = splitMedia(formData.image_url);
      let finalImageUrl: string[] = [...existingImages, ...existingVideos];

      // Upload new files
      const newFiles = formData.image_file || [];
      if (newFiles.length > 0) {
        const uploadOne = async (file: File) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `destinations/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("Images")
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("Images")
            .getPublicUrl(filePath);

          return publicUrl as string;
        };

        const uploadedImageUrls: string[] = [];
        const uploadedVideoUrls: string[] = [];
        for (const file of newFiles.filter(isImageFile)) {
          uploadedImageUrls.push(await uploadOne(file));
        }
        for (const file of newFiles.filter(isVideoFile)) {
          uploadedVideoUrls.push(await uploadOne(file));
        }

        finalImageUrl = [
          ...existingImages,
          ...uploadedImageUrls,
          ...existingVideos,
          ...uploadedVideoUrls,
        ];
      }

      // Payload
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        image_url: JSON.stringify(finalImageUrl),
        min_price: Number(formData.min_price) || 0,
        max_price: Number(formData.max_price) || 0,
        opening_hours: formData.opening_hours || DEFAULT_OPENING_HOURS,
        open_days: formData.open_days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingDestination ? "แก้ไขข้อมูลสถานที่สำเร็จ" : "เพิ่มสถานที่ใหม่สำเร็จ");
        fetchDestinations();
        handleCloseModal();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "บันทึกข้อมูลไม่สำเร็จ");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== MODAL HANDLERS ====================
  const handleOpenModal = (destination?: Destination) => {
    setImagePreview([]);
    if (destination) {
      setEditingDestination(destination);
      setFormData({
        name: destination.name,
        description: destination.description || "",
        category: destination.category,
        image_url: parseImageUrl(destination.image_url || ""),
        min_price: destination.min_price ?? 0,
        max_price: destination.max_price ?? 0,
        image_file: [],
        opening_hours:
          parseOpeningHours(destination.opening_hours) ||
          destination.opening_hours ||
          DEFAULT_OPENING_HOURS,
        open_days: destination.open_days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });
    } else {
      setEditingDestination(null);
      setFormData({
        name: "",
        description: "",
        category: "ธรรมชาติ",
        image_url: [],
        min_price: 0,
        max_price: 0,
        image_file: [],
        opening_hours: DEFAULT_OPENING_HOURS,
        open_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDestination(null);
    setIsCategoryOpen(false);
  };

  const handleOpenDetail = (destination: Destination) => {
    setDetailDestination(destination);
    setIsDetailOpen(true);
  };

  const processImageFiles = (files: File[]) => {
    const existing = splitMedia(formData.image_url);
    const newFiles = formData.image_file || [];
    const currentImages = existing.images.length + newFiles.filter(isImageFile).length;
    const currentVideos = existing.videos.length + newFiles.filter(isVideoFile).length;

    const imgs = files.filter(isImageFile);
    const vids = files.filter(isVideoFile);

    if (imgs.length + vids.length < files.length) {
      toast.error("รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอเท่านั้น");
    }
    if (imgs.length + vids.length === 0) return;

    if (imgs.length > 0) {
      if (currentImages + imgs.length > MAX_IMAGES) {
        toast.error(`อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูปเท่านั้น`);
        return;
      }
      if (imgs.some((f) => f.size > MAX_IMAGE_BYTES)) {
        toast.error("แต่ละรูปต้องมีขนาดไม่เกิน 5MB");
        return;
      }
    }

    if (vids.length > 0) {
      if (currentImages + imgs.length === 0) {
        toast.error("กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูปก่อนแนบวิดีโอ");
        return;
      }
      if (currentVideos + vids.length > MAX_VIDEOS) {
        toast.error(`อัปโหลดวิดีโอได้สูงสุด ${MAX_VIDEOS} คลิปเท่านั้น`);
        return;
      }
      if (vids.some((f) => f.size > MAX_VIDEO_BYTES)) {
        toast.error("แต่ละวิดีโอต้องมีขนาดไม่เกิน 50MB");
        return;
      }
    }

    const accepted = [...imgs, ...vids];
    const newPreviews = accepted.map((f) => URL.createObjectURL(f));
    setImagePreview((prev) => [...prev, ...newPreviews]);
    setFormData((prev) => ({
      ...prev,
      image_file: [...(prev.image_file || []), ...accepted],
    }));
  };

  const removeExistingImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      image_url: prev.image_url.filter((_, i) => i !== index),
    }));
  };

  const removeNewImage = (index: number) => {
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      image_file: (prev.image_file || []).filter((_, i) => i !== index),
    }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) processImageFiles(files);
  };

  const handleMenuToggle = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setOpenCardMenuId(openCardMenuId === id ? null : id);
  };

  const toggleSelectOne = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIds = displayedDestinations.map((d) => d.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = displayedDestinations.map((d) => d.id);
      const newIds = pageIds.filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newIds]);
    }
  };

  // ==================== COMPUTED DATA ====================
  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) => {
      // 1. Search Query
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        d.name.toLowerCase().includes(query) ||
        (d.description?.toLowerCase() || "").includes(query);

      // 2. Category Filter
      const matchesCategory =
        activeCategory === "ทั้งหมด" ? true : d.category === activeCategory;

      // 3. Admission Fee Filter
      let matchesFee = true;
      const minP = Number(d.min_price) || 0;
      const maxP = Number(d.max_price) || 0;
      if (feeFilter === "free") {
        matchesFee = minP === 0 && maxP === 0;
      } else if (feeFilter === "paid") {
        matchesFee = minP > 0 || maxP > 0;
      }

      // 4. Operating Status Filter (Today)
      let matchesStatus = true;
      if (statusFilter !== "all") {
        const todayStat = getTodayOpeningStatus(d, todayDayCode);
        if (statusFilter === "open") {
          matchesStatus = todayStat.status === "open";
        } else if (statusFilter === "closed") {
          matchesStatus = todayStat.status === "closed";
        }
      }

      return matchesSearch && matchesCategory && matchesFee && matchesStatus;
    });
  }, [destinations, searchQuery, activeCategory, feeFilter, statusFilter, todayDayCode]);

  const totalPages = Math.max(1, Math.ceil(filteredDestinations.length / itemsPerPage));

  const displayedDestinations = filteredDestinations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const allOnPageSelected =
    displayedDestinations.length > 0 &&
    displayedDestinations.every((d) => selectedIds.includes(d.id));

  // Statistics
  const stats = useMemo(() => {
    return {
      total: destinations.length,
      free: destinations.filter((a) => (Number(a.min_price) || 0) === 0 && (Number(a.max_price) || 0) === 0).length,
      paid: destinations.filter((a) => (Number(a.min_price) || 0) > 0 || (Number(a.max_price) || 0) > 0).length,
    };
  }, [destinations]);

  const isAnyFilterActive =
    searchQuery !== "" || activeCategory !== "ทั้งหมด" || feeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setActiveCategory("ทั้งหมด");
    setFeeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const mediaExisting = splitMedia(formData.image_url);
  const mediaNewFiles = formData.image_file || [];
  const totalImages = mediaExisting.images.length + mediaNewFiles.filter(isImageFile).length;
  const totalVideos = mediaExisting.videos.length + mediaNewFiles.filter(isVideoFile).length;
  const canAddMore = totalImages < MAX_IMAGES || totalVideos < MAX_VIDEOS;

  // ==================== RENDER ====================
  if (authLoaded && !user) {
    return (
      <main className="max-w-6xl mx-auto py-20 px-4 flex justify-center font-sans text-zinc-900">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center max-w-sm w-full shadow-sm flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
            <AlertCircle size={18} />
          </div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">
            จำเป็นต้องเข้าสู่ระบบ
          </h2>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">
            กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบเพื่อจัดการข้อมูลสถานที่ท่องเที่ยว
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-24 font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        {/* ─── 1. HEADER (Item 3) ─── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-6"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              สถานที่ท่องเที่ยว
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              จัดการข้อมูลสถานที่ เวลาเปิด-ปิด และรายละเอียดสำหรับระบบแนะนำทริป
            </p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-700 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 shrink-0 cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.2} />
            เพิ่มสถานที่
          </button>
        </motion.div>

        {/* Error banner */}
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

        {/* ─── 2. STATISTICS: 3 SUMMARY CARDS (Item 4) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Card 1: ทั้งหมด */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition-colors">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">📍 สถานที่ทั้งหมด</span>
              <div className="text-3xl font-extrabold tracking-tight text-zinc-900 tabular-nums">
                {loading ? "—" : stats.total.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-400">จุดเช็คอินในจังหวัดนครราชสีมา</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xl shrink-0">
              📍
            </div>
          </div>

          {/* Card 2: เข้าฟรี */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition-colors">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">🎟️ เข้าฟรี</span>
              <div className="text-3xl font-extrabold tracking-tight text-emerald-600 tabular-nums">
                {loading ? "—" : stats.free.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-400">ไม่มีค่าธรรมเนียมเข้าชม</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-xl shrink-0">
              🎟️
            </div>
          </div>

          {/* Card 3: มีค่าเข้าชม */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition-colors">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">💰 มีค่าเข้าชม</span>
              <div className="text-3xl font-extrabold tracking-tight text-amber-600 tabular-nums">
                {loading ? "—" : stats.paid.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-400">มีค่าบัตรผ่านประตูหรือกิจกรรม</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-xl shrink-0">
              💰
            </div>
          </div>
        </div>

        {/* ─── 3. SEARCH & FILTER SECTION (Item 5 & 6) ─── */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs mb-6 space-y-3.5">
          {/* Main Search row */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3.5 text-zinc-400 pointer-events-none"
                size={17}
              />
              <input
                type="text"
                placeholder="🔍 ค้นหาชื่อสถานที่ หรือคำอธิบาย (เช่น น้ำตก, วัด, คาเฟ่, ธรรมชาติ)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 pl-10 pr-9 bg-zinc-50/70 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Dropdown Filters (Admission & Operating Status) */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              {/* Fee filter */}
              <select
                value={feeFilter}
                onChange={(e) => {
                  setFeeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="h-10 px-3 text-xs bg-zinc-50/70 border border-zinc-200 rounded-xl text-zinc-700 font-medium outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="all">ค่าเข้าชม: ทั้งหมด</option>
                <option value="free">🎟️ เข้าฟรี</option>
                <option value="paid">💰 มีค่าเข้าชม</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="h-10 px-3 text-xs bg-zinc-50/70 border border-zinc-200 rounded-xl text-zinc-700 font-medium outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="open">🟢 เปิดวันนี้</option>
                <option value="closed">🔴 ปิดวันนี้</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="แสดงแบบการ์ด"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="แสดงแบบตาราง / แถว"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-blue-600 shadow-xs font-medium"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Categories Tabs (Item 6) */}
          <div className="flex items-center justify-between overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-zinc-100">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-zinc-400 pr-1 flex items-center gap-1 shrink-0 select-none">
                <Filter size={12} /> หมวดหมู่:
              </span>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 bg-zinc-50"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Select all & Count on page */}
            {!loading && filteredDestinations.length > 0 && (
              <div className="flex items-center gap-3 pl-4 text-xs text-zinc-500 shrink-0">
                <span className="text-zinc-400">
                  พบ {filteredDestinations.length} รายการ
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 accent-blue-600 cursor-pointer"
                    id="select-all"
                  />
                  <label
                    htmlFor="select-all"
                    className="cursor-pointer hover:text-zinc-700 select-none font-medium"
                  >
                    เลือกทั้งหมดในหน้านี้
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── 4. DESTINATION LIST: MODERN CARDS (Item 7 & 8) ─── */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs animate-pulse"
                  >
                    <div className="aspect-16/10 bg-zinc-100 w-full" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-zinc-100 rounded w-1/3" />
                      <div className="h-5 bg-zinc-200 rounded w-3/4" />
                      <div className="h-3.5 bg-zinc-100 rounded w-full" />
                      <div className="h-3.5 bg-zinc-100 rounded w-2/3" />
                      <div className="pt-3 border-t border-zinc-100 flex justify-between">
                        <div className="h-4 bg-zinc-100 rounded w-20" />
                        <div className="h-4 bg-zinc-200 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : filteredDestinations.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-dashed border-zinc-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-xs"
              >
                <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center mb-3 text-zinc-400">
                  <Inbox size={22} />
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  ไม่พบสถานที่ท่องเที่ยว
                </h3>
                <p className="text-zinc-500 text-xs mt-1 max-w-sm">
                  ไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือกในขณะนี้
                </p>
                {isAnyFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    ล้างการค้นหาและตัวกรองทั้งหมด
                  </button>
                )}
              </motion.div>
            ) : viewMode === "grid" ? (
              /* ── Grid View ── */
              <motion.div
                key="grid-list"
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {displayedDestinations.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const parsedImages = parseImageUrl(d.image_url || "");
                  const displayImgUrl = parsedImages.length > 0 ? parsedImages[0] : null;
                  const todayStat = getTodayOpeningStatus(d, todayDayCode);

                  const minP = Number(d.min_price) || 0;
                  const maxP = Number(d.max_price) || 0;
                  const isFree = minP === 0 && maxP === 0;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      key={d.id}
                      className={`group bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all border flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-600/10"
                          : "border-zinc-200/80 hover:border-zinc-300"
                      }`}
                    >
                      <div>
                        {/* Thumbnail Image Area */}
                        <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 border-b border-zinc-100">
                          {displayImgUrl ? (
                            <>
                              <Image
                                src={displayImgUrl}
                                alt={d.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover group-hover:scale-104 transition-transform duration-300"
                              />
                              {parsedImages.length > 1 && (
                                <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                                  +{parsedImages.length - 1} รูป
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ImageIcon size={32} strokeWidth={1.5} />
                            </div>
                          )}

                          {/* Top-left: Category tag */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                            <span className="bg-white/95 backdrop-blur-xs text-zinc-800 border border-zinc-200/70 text-[11px] font-semibold px-2 py-0.5 rounded-lg shadow-xs">
                              {d.category || "สถานที่ท่องเที่ยว"}
                            </span>
                          </div>

                          {/* Top-right: Selection Checkbox */}
                          <div
                            className="absolute top-2.5 right-2.5 z-10"
                            onClick={(e) => toggleSelectOne(e, d.id)}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-white/85 text-transparent border border-zinc-300 hover:bg-white"
                              }`}
                            >
                              <Check size={14} strokeWidth={3} className={isSelected ? "block" : "hidden"} />
                            </div>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-4.5 space-y-3">
                          <div>
                            {/* Category subtitle */}
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1">
                              <span>{d.category || "ทั่วไป"}</span>
                              <span>•</span>
                              <span>จุดท่องเที่ยวแนะนำ</span>
                            </div>

                            {/* Destination Name */}
                            <h3 className="text-base font-bold text-zinc-900 tracking-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {d.name}
                            </h3>

                            {/* Short Description */}
                            <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                              {d.description || "ยังไม่มีข้อมูลคำอธิบายเพิ่มเติม"}
                            </p>
                          </div>

                          {/* Operating Hours & Admission Badges (Item 8) */}
                          <div className="space-y-2 pt-1 border-t border-zinc-100">
                            {/* Today's Status Badge */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                {todayStat.status === "open" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {todayStat.label}
                                  </span>
                                ) : todayStat.status === "closed" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    {todayStat.label}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                    {todayStat.label}
                                  </span>
                                )}
                              </div>

                              {/* Price */}
                              <div className="font-bold text-xs">
                                {isFree ? (
                                  <span className="text-emerald-600 bg-emerald-50/70 px-2 py-0.5 rounded-md border border-emerald-200/40">
                                    เข้าฟรี
                                  </span>
                                ) : (
                                  <span className="text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md">
                                    ฿{minP.toLocaleString()}{maxP > minP ? ` - ฿${maxP.toLocaleString()}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions (Item 7) */}
                      <div className="px-4.5 py-3 bg-zinc-50/70 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          ดูรายละเอียด
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenModal(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                          แก้ไข
                        </button>

                        {/* More Menu (3-Dot) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => handleMenuToggle(e, d.id)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={17} />
                          </button>

                          <AnimatePresence>
                            {openCardMenuId === d.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 z-50 text-left overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenDetail(d);
                                    setOpenCardMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium"
                                >
                                  <Eye size={13} className="text-zinc-400" />
                                  ดูรายละเอียด
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenModal(d);
                                    setOpenCardMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium"
                                >
                                  <Edit3 size={13} className="text-zinc-400" />
                                  แก้ไขข้อมูล
                                </button>
                                <div className="h-px bg-zinc-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirm({ id: d.id, name: d.name });
                                    setOpenCardMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 size={13} className="text-red-500" />
                                  ลบสถานที่
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              /* ── List / Row View ── */
              <motion.div
                key="list-view"
                layout
                className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs divide-y divide-zinc-100 overflow-hidden"
              >
                {displayedDestinations.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const parsedImages = parseImageUrl(d.image_url || "");
                  const displayImgUrl = parsedImages.length > 0 ? parsedImages[0] : null;
                  const todayStat = getTodayOpeningStatus(d, todayDayCode);
                  const minP = Number(d.min_price) || 0;
                  const maxP = Number(d.max_price) || 0;
                  const isFree = minP === 0 && maxP === 0;

                  return (
                    <div
                      key={d.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isSelected ? "bg-blue-50/40" : "hover:bg-zinc-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectOne(e as any, d.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                        />

                        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200/60">
                          {displayImgUrl ? (
                            <Image src={displayImgUrl} alt="" fill sizes="64px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-md">
                              {d.category}
                            </span>
                            <h4 className="text-sm font-bold text-zinc-900 truncate">
                              {d.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                            <span>{todayStat.label}</span>
                            <span>•</span>
                            <span>{isFree ? "เข้าฟรี" : `฿${minP}`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(d)}
                          className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(d)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: d.id, name: d.name })}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── 5. PAGINATION ─── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-1">
            <p className="hidden sm:block text-xs text-zinc-500">
              แสดง{" "}
              <span className="font-semibold text-zinc-900">
                {(page - 1) * itemsPerPage + 1}
              </span>
              –
              <span className="font-semibold text-zinc-900">
                {Math.min(page * itemsPerPage, filteredDestinations.length)}
              </span>{" "}
              จากทั้งหมด{" "}
              <span className="font-semibold text-zinc-900">
                {filteredDestinations.length}
              </span>{" "}
              รายการ
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={15} />
                <span>ก่อนหน้า</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      page === pNum
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <span>ถัดไป</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ─── 6. FLOATING BULK-ACTION BAR ─── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-zinc-800"
            >
              <span className="text-xs font-medium">
                เลือกแล้ว <strong className="text-blue-400">{selectedIds.length}</strong> รายการ
              </span>
              <div className="h-4 w-px bg-zinc-700" />
              <button
                type="button"
                onClick={() =>
                  setBulkDialog({
                    type: "delete",
                    ids: selectedIds,
                    title: "ลบสถานที่ที่เลือก",
                    message: `ยืนยันการลบสถานที่จำนวน ${selectedIds.length} รายการอย่างถาวรหรือไม่?`,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 size={13} />
                ลบรายการที่เลือก
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="ล้างการเลือก"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 7. DETAIL MODAL (Item 9) ─── */}
        <DestinationDetailModal
          isOpen={isDetailOpen}
          destination={detailDestination}
          onClose={() => {
            setIsDetailOpen(false);
            setDetailDestination(null);
          }}
          onEdit={(dest) => {
            handleOpenModal(dest);
          }}
          todayDayCode={todayDayCode}
        />

        {/* ─── 8. EDIT / ADD MODAL IN 3 SECTIONS (Item 10) ─── */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!isSubmitting ? handleCloseModal : undefined}
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden z-10"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                      {editingDestination ? "แก้ไขข้อมูลสถานที่ท่องเที่ยว" : "เพิ่มสถานที่ท่องเที่ยวใหม่"}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {editingDestination
                        ? "ปรับปรุงรายละเอียด วัน-เวลาเปิดให้บริการ และค่าเข้าชม"
                        : "กรอกข้อมูลสถานที่ใหม่ให้ครบถ้วนเพื่อนำไปใช้ในระบบจัดทริป"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Form Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white space-y-8">
                  <form
                    id="destination-modal-form"
                    onSubmit={handleSubmit}
                    className="space-y-8"
                  >
                    {/* ════ SECTION 1: ข้อมูลพื้นฐาน ════ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900">
                          ข้อมูลพื้นฐานของสถานที่
                        </h3>
                      </div>

                      {/* Media Upload Area */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-2">
                          รูปภาพ / วิดีโอแลนด์มาร์ค{" "}
                          <span className="text-zinc-400 font-normal">
                            ({totalImages}/{MAX_IMAGES} รูป · {totalVideos}/{MAX_VIDEOS} วิดีโอ)
                          </span>
                        </label>

                        {(formData.image_url.length > 0 || imagePreview.length > 0) && (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                            {formData.image_url.map((media, index) => (
                              <div
                                key={`existing-${index}`}
                                className={`relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 shadow-xs ${
                                  isVideoUrl(media) ? "bg-zinc-900" : "bg-zinc-50"
                                }`}
                              >
                                {isVideoUrl(media) ? (
                                  <>
                                    <video src={media} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-8 h-8 rounded-full bg-zinc-950/60 flex items-center justify-center">
                                        <Play size={13} className="text-white fill-white ml-0.5" />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={media} alt="" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => removeExistingImage(index)}
                                    className="p-1.5 bg-white text-zinc-900 shadow-sm rounded-lg hover:bg-zinc-50 hover:text-red-600 transition-all"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {imagePreview.map((preview, index) => {
                              const isVid = isVideoFile((formData.image_file || [])[index] ?? new File([], ""));
                              return (
                                <div
                                  key={`new-${index}`}
                                  className={`relative group aspect-square rounded-xl overflow-hidden border border-blue-500/30 shadow-xs ${
                                    isVid ? "bg-zinc-900" : "bg-zinc-50"
                                  }`}
                                >
                                  {isVid ? (
                                    <>
                                      <video src={preview} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-8 h-8 rounded-full bg-zinc-950/60 flex items-center justify-center">
                                          <Play size={13} className="text-white fill-white ml-0.5" />
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => removeNewImage(index)}
                                      className="p-1.5 bg-white text-zinc-900 shadow-sm rounded-lg hover:bg-zinc-50 hover:text-red-600 transition-all"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-md shadow-xs">
                                    ใหม่
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {canAddMore && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                            }}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative flex flex-col items-center justify-center w-full min-h-[120px] p-4 transition-all border border-dashed rounded-xl cursor-pointer ${
                              isDragging
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/60 hover:bg-zinc-50"
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) processImageFiles(files);
                                e.target.value = "";
                              }}
                              accept="image/*,video/*"
                              className="hidden"
                            />
                            <div className="p-2.5 bg-white shadow-xs border border-zinc-200 rounded-xl text-zinc-400 mb-1">
                              <ImageIcon size={20} strokeWidth={1.6} />
                            </div>
                            <p className="text-xs font-semibold text-zinc-800">
                              คลิกเพื่อเลือกไฟล์{" "}
                              <span className="font-normal text-zinc-500">
                                หรือลากไฟล์มาวางที่นี่
                              </span>
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              รูป JPG/PNG/WEBP ≤ 5MB · วิดีโอ MP4/WEBM ≤ 50MB (สูงสุด {MAX_VIDEOS} คลิป)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Name & Category Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700">
                            ชื่อสถานที่ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            placeholder="เช่น ไร่มณีศร, วัดศาลาลอย"
                          />
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-1.5" ref={dropdownRef}>
                          <label className="text-xs font-semibold text-zinc-700">
                            หมวดหมู่สถานที่
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                              className={`w-full px-3.5 py-2 text-sm border rounded-xl bg-white transition-all flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                                isCategoryOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-zinc-200"
                              } text-zinc-900`}
                            >
                              <span>{formData.category}</span>
                              <ChevronDown
                                size={15}
                                className={`text-zinc-400 transition-transform duration-200 ${
                                  isCategoryOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            <AnimatePresence>
                              {isCategoryOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                  transition={{ duration: 0.13 }}
                                  className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 overflow-hidden"
                                >
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {CATEGORIES.filter((c) => c !== "ทั้งหมด").map((cat) => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            category: cat as Destination["category"],
                                          });
                                          setIsCategoryOpen(false);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-zinc-50 flex items-center justify-between transition-colors text-zinc-700 hover:text-zinc-900"
                                      >
                                        <span>{cat}</span>
                                        {formData.category === cat && (
                                          <Check size={14} className="text-blue-600 shrink-0" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700">
                            รายละเอียดสถานที่
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-zinc-400 resize-none leading-relaxed"
                            placeholder="ประวัติ, จุดเด่น หรือข้อมูลแนะนำสำหรับนักท่องเที่ยว..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ════ SECTION 2: วันและเวลาเปิดให้บริการ (Item 10) ════ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900">
                          วันและเวลาเปิดให้บริการ
                        </h3>
                      </div>

                      <OpeningHoursEditor
                        key={editingDestination ? `edit-${editingDestination.id}` : "add-new"}
                        value={formData.opening_hours}
                        openDays={formData.open_days}
                        onChange={(hours, days, valid) => {
                          setFormData((prev) => ({
                            ...prev,
                            opening_hours: hours,
                            open_days: days,
                          }));
                          setIsScheduleValid(valid);
                        }}
                      />
                    </div>

                    {/* ════ SECTION 3: ค่าเข้าชม (Item 10) ════ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          3
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900">
                          ค่าธรรมเนียมเข้าชม (บาท)
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700">
                            ราคาเริ่มต้น (บาท){" "}
                            <span className="text-zinc-400 font-normal">
                              (ใส่ 0 หากเข้าชมฟรี)
                            </span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.min_price}
                            onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                            className="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700">
                            ราคาสูงสุด (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.max_price}
                            onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                            className="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modal Footer Buttons */}
                <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    form="destination-modal-form"
                    type="submit"
                    disabled={isSubmitting || !isScheduleValid}
                    className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white transition-all hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin text-white" />
                        บันทึกข้อมูล...
                      </span>
                    ) : editingDestination ? (
                      "บันทึกการแก้ไข"
                    ) : (
                      "เพิ่มสถานที่ท่องเที่ยว"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── 9. CONFIRMATION DIALOG (Item 13) ─── */}
        <ConfirmDialog
          open={!!deleteConfirm}
          danger={true}
          loading={!!deletingId}
          title="ลบสถานที่นี้หรือไม่?"
          message={
            <div className="space-y-1.5 mt-1">
              <p className="text-zinc-700 font-semibold text-sm">
                &ldquo;{deleteConfirm?.name}&rdquo;
              </p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                การลบข้อมูลนี้ไม่สามารถย้อนกลับได้ ข้อมูลสถานที่และรูปภาพที่เกี่ยวข้องจะถูกลบออกจากระบบจัดทริป
              </p>
            </div>
          }
          confirmText="ลบสถานที่"
          cancelText="ยกเลิก"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />

        {/* Bulk Action Confirm Dialog */}
        <ConfirmDialog
          open={!!bulkDialog}
          danger={true}
          loading={isBulkProcessing}
          title={bulkDialog?.title || "ยืนยันการทำรายการแบบกลุ่ม"}
          message={bulkDialog?.message || ""}
          confirmText="ลบข้อมูลทั้งหมดที่เลือก"
          cancelText="ยกเลิก"
          onConfirm={handleBulkActionConfirm}
          onCancel={() => setBulkDialog(null)}
        />
      </main>
    </div>
  );
}
