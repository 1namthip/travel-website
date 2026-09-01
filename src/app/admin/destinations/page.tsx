"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Destination } from "@/types/destination";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmDialog from "../../../component/ConfirmDialog";
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
  Map,
  X,
  Check,
  ChevronDown,
  Loader2,
  Play,
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

export default function AdminDestinationsPage() {
  const router = useRouter();

  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ==================== STATES ====================
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string | number;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | number | null>(
    null,
  );

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
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search, Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;


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
    } catch (error) { // เปลี่ยนจาก err เป็น error
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
  }, [supabase, router]);

  useEffect(() => {
    const closeMenus = () => setOpenCardMenuId(null);
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

      // Supabase Delete In Bulk
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
    setIsSubmitting(true);
    const method = editingDestination ? "PUT" : "POST";
    const url = editingDestination
      ? `/api/destinations/${editingDestination.id}`
      : "/api/destinations";

    try {
      // สื่อเดิมถูกแยกเป็นรูป/วิดีโอ เพื่อคุมลำดับตอนบันทึก (รูปก่อนวิดีโอเสมอ)
      const { images: existingImages, videos: existingVideos } = splitMedia(
        formData.image_url,
      );
      let finalImageUrl: string[] = [...existingImages, ...existingVideos];

      // ==========================================
      // 1. อัปโหลดไฟล์ใหม่ทั้งหมด (ถ้ามี) — รูปก่อน แล้วค่อยวิดีโอ
      // ==========================================
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

      // ==========================================
      // 2. จัดเตรียมข้อมูล (Payload) เพื่อส่งเข้า API
      // ==========================================
      const payload = {
        ...formData,
        // แปลงเป็น JSON String (ถ้า Database ของคุณเก็บข้อมูล image_url เป็น String ที่เป็นลักษณะ "[]") 
        // หรือถ้า DB เป็นชนิด Array ให้ส่งแค่ finalImageUrl ก็ได้ครับ
        image_url: JSON.stringify(finalImageUrl), 
        min_price: Number(formData.min_price) || 0,
        max_price: Number(formData.max_price) || 0,
      };

      // ลบ `image_file` ออกจาก payload เพราะเราอัปโหลดไปแล้ว และ API รับไม่รับ Object ชนิด File
      delete (payload as any).image_file;

      // ==========================================
      // 3. ยิง API บันทึกข้อมูล
      // ==========================================
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingDestination ? "อัปเดตข้อมูลสำเร็จ" : "เพิ่มสถานที่สำเร็จ",
        );
        fetchDestinations();
        handleCloseModal();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== HANDLERS ====================
  const handleOpenModal = (destination?: Destination) => {
    setImagePreview([]); // เคลียร์พรีวิวไฟล์ใหม่ที่เพิ่งเลือกไว้เสมอเมื่อเปิดโมดัล
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
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDestination(null);
    setIsCategoryOpen(false);
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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description?.toLowerCase() || "").includes(
          searchQuery.toLowerCase(),
        );
      const matchesCategory =
        activeCategory === "ทั้งหมด" ? true : d.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [destinations, searchQuery, activeCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDestinations.length / itemsPerPage),
  );

  const displayedDestinations = filteredDestinations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const allOnPageSelected =
    displayedDestinations.length > 0 &&
    displayedDestinations.every((d) => selectedIds.includes(d.id));

  const stats = {
    total: destinations.length,
    free: destinations.filter((a) => a.max_price === 0 && a.min_price === 0).length,
    paid: destinations.filter(
      (a) => (a.max_price || 0) > 0 || (a.min_price || 0) > 0
    ).length,
  };

  const mediaExisting = splitMedia(formData.image_url);
  const mediaNewFiles = formData.image_file || [];
  const totalImages =
    mediaExisting.images.length + mediaNewFiles.filter(isImageFile).length;
  const totalVideos =
    mediaExisting.videos.length + mediaNewFiles.filter(isVideoFile).length;
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
            กรุณาเข้าสู่ระบบด้วยบัญชีแอดมินก่อนตรวจสอบและจัดการข้อมูลระบบหลังบ้าน
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-6xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
        {/* ─── 1. PREMIUM HEADER ─── */}
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
              <Map size={22} strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                จัดการสถานที่ท่องเที่ยว
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                จัดการฐานข้อมูลสถานที่ท่องเที่ยว จุดเช็คอิน และแลนด์มาร์ค
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenModal()}
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
    transition-all duration-300
    hover:-translate-y-0.5
    active:translate-y-0
    active:scale-[0.98]
    flex items-center justify-center gap-2
  "
          >
            <Plus
              size={16}
              strokeWidth={2.5}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
            เพิ่มสถานที่ใหม่
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

        {/* ─── STATS PANELS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "Total Destinations",
              value: stats.total,
              color: "bg-blue-600",
            },
            {
              label: "Free Entry",
              value: stats.free,
              color: "bg-emerald-500",
              dot: true,
            },
            {
              label: "Paid Entry",
              value: stats.paid,
              color: "bg-blue-500",
              dot: true,
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-1.5 mb-1 text-zinc-500 select-none">
                {stat.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                )}
                <p className="text-xs font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-semibold text-zinc-900 tracking-tight">
                {loading ? "-" : stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ─── 2. THE UNIFIED COMMAND BOX ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-sm mb-6 space-y-3"
        >
          <div className="relative flex items-center">
            <Search
              className="absolute left-3.5 text-zinc-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหาจากชื่อสถานที่ หรือคำอธิบาย (เช่น น้ำตก, ดอย, วัด)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-zinc-50/80 hover:bg-zinc-100/50 focus:bg-white border border-zinc-200/80 focus:border-zinc-400 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between overflow-x-auto pt-0.5 pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1 pr-1.5 flex items-center gap-1 shrink-0 select-none">
                <Filter size={12} /> หมวดหมู่:
              </span>
              {CATEGORIES.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveCategory(tab);
                    setPage(1);
                    setSelectedIds([]); // หรือ [] ถ้าทำตามข้อ 3 ด้านล่าง
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 select-none ${activeCategory === tab
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {!loading && filteredDestinations.length > 0 && (
              <div className="flex items-center gap-2 pl-4 text-xs text-zinc-400 shrink-0">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 accent-zinc-900 cursor-pointer"
                  id="select-all"
                />
                <label
                  htmlFor="select-all"
                  className="cursor-pointer hover:text-zinc-600 select-none"
                >
                  เลือกทั้งหมด
                </label>
              </div>
            )}
          </div>
        </motion.div>

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
                    className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-5 animate-pulse"
                  >
                    <div className="w-full sm:w-60 aspect-16/10 rounded-xl bg-zinc-100 shrink-0" />
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
            ) : filteredDestinations.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-zinc-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center border-dashed"
              >
                <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center mb-3 text-zinc-400">
                  <Inbox size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  ไม่พบสถานที่ท่องเที่ยว
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  ยังไม่มีข้อมูลที่ตรงกับการค้นหาในหมวดหมู่นี้
                </p>
              </motion.div>
            ) : (
              <motion.div key="card-list" layout className="space-y-4">
                {displayedDestinations.map((d, index) => {
                  const isSelected = selectedIds.includes(d.id);
                  const parsedImages = parseImageUrl(d.image_url || "");
                  const displayImgUrl =
                    parsedImages.length > 0 ? parsedImages[0] : null;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      key={d.id}
                      onClick={() => handleOpenModal(d)}
                      className={`group bg-white rounded-2xl p-4 transition-all flex flex-col sm:flex-row gap-5 relative cursor-pointer border ${isSelected
                          ? "border-blue-900 shadow-md ring-1 ring-blue-900/10 bg-blue-50/40"
                          : "border-blue-200/80 shadow-sm hover:shadow-md hover:border-blue-300"
                        }`}
                    >
                      {/* THUMBNAIL BLOCK */}
                      <div className="relative w-full sm:w-60 aspect-16/10 shrink-0 rounded-xl overflow-hidden bg-zinc-100 border border-blue-200/50 flex items-center justify-center">
                        {displayImgUrl ? (
                          <>
                            <Image
                              src={displayImgUrl}
                              alt={d.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 240px"
                              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            {parsedImages.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-zinc-900/70 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
                                +{parsedImages.length - 1} รูป
                              </div>
                            )}
                          </>
                        ) : (
                          <ImageIcon size={28} className="text-zinc-300" />
                        )}

                        <div
                          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="bg-pink-400/75 border-[#EC4899] shadow-pink-200 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider shadow-sm">
                            สถานที่ท่องเที่ยว
                          </span>
                        </div>
                      </div>

                      {/* CONTENT DETAILS BLOCK */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                        <div className="relative pr-8">
                          {/* 3-Dot Menu */}
                          <div
                            className="absolute top-0 right-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleMenuToggle(e, d.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            <AnimatePresence>
                              {openCardMenuId === d.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-zinc-200 py-1 z-50 text-left overflow-hidden"
                                >
                                  <button
                                    onClick={() => {
                                      handleOpenModal(d);
                                      setOpenCardMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium"
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
                                      setDeleteConfirm({
                                        id: d.id,
                                        name: d.name,
                                      });
                                      setOpenCardMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                  >
                                    <Trash2
                                      size={13}
                                      className="text-red-500/70"
                                    />{" "}
                                    ลบข้อมูลออก
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-blue-800 font-medium truncate mb-1.5 pr-6">
                            <span>{d.category || "ทั่วไป"}</span>
                            <span className="text-zinc-300">•</span>
                            <span className="truncate">จุดท่องเที่ยวแนะนำ</span>
                          </div>

                          <h3 className="text-lg font-bold text-zinc-900 tracking-tight truncate leading-tight">
                            {d.name}
                          </h3>

                          <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed pr-4">
                            {d.description ||
                              "ไม่มีคำอธิบายเพิ่มเติมสำหรับสถานที่นี้"}
                          </p>
                        </div>

                        {/* Faint Footer Bar */}
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                          <div className="flex items-center gap-3 truncate">
                            <span className="italic text-zinc-400">
                              เปิดให้บริการทุกวัน
                            </span>
                          </div>

                          <div className="font-bold text-zinc-900 text-sm shrink-0 pl-2">
                            {d.max_price === 0 && d.min_price === 0 ? (
                              <span className="text-emerald-600">
                                เข้าชมฟรี
                              </span>
                            ) : (
                              `฿${d.min_price} - ${d.max_price}`
                            )}
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

        {/* ─── PREMIUM PAGINATION ─── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-1">
            <p className="hidden sm:block text-xs text-zinc-400 font-medium">
              Showing{" "}
              <span className="text-zinc-900">
                {(page - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="text-zinc-900">
                {Math.min(page * itemsPerPage, filteredDestinations.length)}
              </span>{" "}
              of{" "}
              <span className="text-zinc-900">
                {filteredDestinations.length}
              </span>{" "}
              entries
            </p>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 hover:text-blue-900 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-all flex items-center justify-center ${page === pNum ? "bg-blue-800 text-white font-semibold" : "text-blue-500 hover:bg-blue-100"}`}
                    >
                      {pNum}
                    </button>
                  ),
                )}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 hover:text-zinc-900 disabled:opacity-30 transition-all"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── VERCEL-STYLE FLOATING COMMAND BAR ─── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 text-white rounded-full shadow-2xl border border-zinc-800 text-xs font-medium">
                <span className="text-zinc-300">
                  เลือกแล้ว{" "}
                  <span className="text-white font-bold">
                    {selectedIds.length}
                  </span>{" "}
                  รายการ
                </span>
                <div className="w-px h-4 bg-zinc-700" />
                <button
                  onClick={() =>
                    setBulkDialog({
                      type: "delete",
                      ids: Array.from(selectedIds),
                      title: "Delete Destinations",
                      message: `ยืนยันการลบสถานที่ท่องเที่ยว ${selectedIds.length} รายการอย่างถาวร?`,
                    })
                  }
                  className="text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
                >
                  Delete Selected
                </button>
                <div className="w-px h-4 bg-zinc-700 ml-1" />
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-full"
                  aria-label="Clear"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── INLINE PREMIUM EDITOR MODAL ─── */}
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
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.23, ease: "easeOut" }}
                className="relative w-full max-w-2xl bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-zinc-200/50 flex flex-col max-h-[85vh] overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white z-10 shrink-0">
                  <div>
                    <h2 className="text-[16px] font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                      <Map size={16} className="text-zinc-500" />
                      {editingDestination
                        ? "Edit Destination"
                        : "New Destination"}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {editingDestination
                        ? "แก้ไขข้อมูลสถานที่ท่องเที่ยว"
                        : "เพิ่มจุดเช็คอินใหม่เข้าสู่ระบบ"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                  <form
                    id="destination-modal-form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    {/* Media Area (รูป + วิดีโอ) */}
                    <div>
                      <label className="block text-[13px] font-medium text-zinc-700 mb-2">
                        รูปภาพ / วิดีโอแลนด์มาร์ค{" "}
                        <span className="text-zinc-400 font-normal">
                          ({totalImages}/{MAX_IMAGES} รูป · {totalVideos}/{MAX_VIDEOS} วิดีโอ)
                        </span>
                      </label>

                      {(formData.image_url.length > 0 || imagePreview.length > 0) && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                          {formData.image_url.map((media, index) => (
                            <div key={`existing-${index}`} className={`relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 shadow-sm ${isVideoUrl(media) ? "bg-zinc-900" : "bg-zinc-50"}`}>
                              {isVideoUrl(media) ? (
                                <>
                                  <video src={media} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-8 h-8 rounded-full bg-zinc-950/55 flex items-center justify-center">
                                      <Play size={13} className="text-white fill-white ml-0.5" />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={media} alt="" className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => removeExistingImage(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {imagePreview.map((preview, index) => {
                            const isVid = isVideoFile((formData.image_file || [])[index] ?? new File([], ""));
                            return (
                              <div key={`new-${index}`} className={`relative group aspect-square rounded-lg overflow-hidden border border-zinc-900/10 shadow-sm ${isVid ? "bg-zinc-900" : "bg-zinc-50"}`}>
                                {isVid ? (
                                  <>
                                    <video src={preview} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-8 h-8 rounded-full bg-zinc-950/55 flex items-center justify-center">
                                        <Play size={13} className="text-white fill-white ml-0.5" />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={preview} alt="" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button type="button" onClick={() => removeNewImage(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">NEW</span>
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
                          className={`relative flex flex-col items-center justify-center w-full min-h-35 p-4 transition-all border border-dashed rounded-lg cursor-pointer ${
                            isDragging
                              ? "border-zinc-500 bg-zinc-100/80"
                              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
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
                          <div className="p-2.5 bg-white shadow-sm border border-zinc-200 rounded-lg text-zinc-400 mb-1">
                            <ImageIcon size={22} strokeWidth={1.5} />
                          </div>
                          <p className="text-[13px] font-medium text-zinc-900">
                            คลิกเพื่อเลือกไฟล์{" "}
                            <span className="font-normal text-zinc-500">
                              หรือลากไฟล์มาวางที่นี่ (เลือกได้หลายไฟล์)
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            รูป JPG/PNG/WEBP ≤ 5MB · วิดีโอ MP4/WEBM ≤ 50MB (สูงสุด {MAX_VIDEOS} คลิป) · ต้องมีรูปอย่างน้อย 1 รูปก่อนแนบวิดีโอ
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">
                          ชื่อสถานที่ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                          placeholder="เช่น น้ำตกเอราวัณ"
                        />
                      </div>

                      {/* Custom Category Dropdown */}
                      <div
                        className="sm:col-span-1 space-y-1.5"
                        ref={dropdownRef}
                      >
                        <label className="text-[13px] font-medium text-zinc-700">
                          หมวดหมู่
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className={`w-full pl-3 pr-3 py-2 text-sm border rounded-lg bg-white transition-all flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 ${isCategoryOpen ? "border-zinc-400 ring-4 ring-zinc-900/5" : "border-zinc-200 hover:border-zinc-300"} text-zinc-900`}
                          >
                            <span>{formData.category}</span>
                            <ChevronDown
                              size={14}
                              className={`text-zinc-400 transition-transform duration-200 ${isCategoryOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                          <AnimatePresence>
                            {isCategoryOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.13 }}
                                className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-[0_12px_30px_-10px_rgba(0,0,0,0.1)] py-1 overflow-hidden"
                              >
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                  {CATEGORIES.filter(
                                    (c) => c !== "ทั้งหมด",
                                  ).map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          category:
                                            cat as Destination["category"],
                                        });
                                        setIsCategoryOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 flex items-center justify-between transition-colors group text-zinc-700 hover:text-zinc-900"
                                    >
                                      <span>{cat}</span>
                                      {formData.category === cat && (
                                        <Check
                                          size={12}
                                          className="text-zinc-900 shrink-0"
                                        />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">
                          รายละเอียดสถานที่
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400 resize-none leading-relaxed"
                          placeholder="ประวัติ, จุดเด่น, หรือข้อมูลการเดินทาง..."
                        />
                      </div>

                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">
                          ค่าเข้าชมเริ่มต้น{" "}
                          <span className="text-zinc-400 font-normal">
                            (บาท)
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.min_price}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              min_price: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                          placeholder="0"
                        />
                      </div>

                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">
                          ค่าเข้าชมสูงสุด{" "}
                          <span className="text-zinc-400 font-normal">
                            (บาท)
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.max_price}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              max_price: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-[13px] font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    form="destination-modal-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-[13px] font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 shadow-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center min-w-30"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2
                          size={14}
                          className="animate-spin text-zinc-400"
                        />{" "}
                        บันทึก...
                      </span>
                    ) : editingDestination ? (
                      "บันทึกการแก้ไข"
                    ) : (
                      "เพิ่มสถานที่"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── GLOBAL CONFIRM DIALOGS ─── */}
        <ConfirmDialog
          open={!!deleteConfirm}
          danger={true}
          loading={!!deletingId}
          title="Delete Destination"
          message={
            <span className="text-zinc-500 text-xs block mt-1">
              ยืนยันการลบ &quot;{deleteConfirm?.name}&quot; อย่างถาวร?
            </span>
          }
          confirmText="ลบข้อมูลถาวร"
          cancelText="ยกเลิก"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />

        <ConfirmDialog
          open={!!bulkDialog}
          danger={bulkDialog?.type === "delete"}
          loading={isBulkProcessing}
          title={bulkDialog?.title || ""}
          message={
            <span className="text-zinc-500 text-xs block mt-1">
              {bulkDialog?.message}
            </span>
          }
          confirmText={
            bulkDialog?.type === "delete" ? "ลบข้อมูลถาวร" : "ยืนยัน"
          }
          cancelText="ยกเลิก"
          onConfirm={handleBulkActionConfirm}
          onCancel={() => setBulkDialog(null)}
        />
      </main>
    </div>
  );
}
