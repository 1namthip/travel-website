"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Trash2,
  MapPin,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../../../component/ConfirmDialog";

// --- Types ---
interface RawReview {
  id: string;
  accommodation_id: string | null;
  restaurant_id: number | null;
  destination_id: number | null;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewItem {
  id: string;
  created_by: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface GroupedLocation {
  target_id: string;
  target_name: string;
  target_location: string | null;
  target_image: string | null;
  target_type: "ที่พัก" | "ร้านอาหาร" | "สถานที่ท่องเที่ยว";
  reviews: ReviewItem[];
  average_rating: number;
}

type CategoryType = "ทั้งหมด" | "ที่พัก" | "ร้านอาหาร" | "สถานที่ท่องเที่ยว";

export default function AdminReviewsPage() {
  const router = useRouter();

  // ─── Supabase Auth State ───────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── Data State ────────────────────────────────────────────────────────────
  const [groupedLocations, setGroupedLocations] = useState<GroupedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters & Pagination ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<CategoryType>("ทั้งหมด");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Modals & Dialogs ──────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<GroupedLocation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
          fetchAndGroupReviews();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        toast.error("เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
      } finally {
        if (active) setAuthLoaded(true);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  const getFirstImage = (item: any): string | null => {
    try {
      const raw = item.images || item.image_url;
      if (!raw) return null;
      if (Array.isArray(raw)) return raw[0] || null;
      if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed[0] || null;
        return raw;
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchAndGroupReviews = async () => {
    try {
      setLoading(true);

      const [
        { data: reviewsData },
        { data: accData },
        { data: restData },
        { data: destData },
      ] = await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("accommodations").select("id, name, address, images"),
        supabase.from("restaurants").select("id, name, location, image_url"),
        supabase.from("destinations").select("id, name, category, image_url"),
      ]);

      if (!reviewsData) throw new Error("ไม่สามารถดึงข้อมูลรีวิวได้");

      const groupedMap = new Map<string, GroupedLocation>();

      reviewsData.forEach((r: RawReview) => {
        let target_id = "";
        let target_name = "ไม่ทราบชื่อสถานที่";
        let target_location = "";
        let target_image = null;
        let target_type: GroupedLocation["target_type"] = "สถานที่ท่องเที่ยว";

        if (r.accommodation_id) {
          target_id = r.accommodation_id;
          const target = accData?.find((a) => String(a.id) === String(r.accommodation_id));
          if (target) {
            target_name = target.name;
            target_location = target.address;
            target_type = "ที่พัก";
            target_image = getFirstImage(target);
          }
        } else if (r.restaurant_id) {
          target_id = String(r.restaurant_id);
          const target = restData?.find((a) => String(a.id) === String(r.restaurant_id));
          if (target) {
            target_name = target.name;
            target_location = target.location;
            target_type = "ร้านอาหาร";
            target_image = getFirstImage(target);
          }
        } else if (r.destination_id) {
          target_id = String(r.destination_id);
          const target = destData?.find((a) => String(a.id) === String(r.destination_id));
          if (target) {
            target_name = target.name;
            target_location = target.category || "สถานที่ท่องเที่ยว";
            target_type = "สถานที่ท่องเที่ยว";
            target_image = getFirstImage(target);
          }
        }

        if (!target_id) return;

        if (!groupedMap.has(target_id)) {
          groupedMap.set(target_id, {
            target_id,
            target_name,
            target_location,
            target_image,
            target_type,
            reviews: [],
            average_rating: 0,
          });
        }

        groupedMap.get(target_id)!.reviews.push({
          id: r.id,
          created_by: r.created_by,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        });
      });

      const finalGroups = Array.from(groupedMap.values()).map((g) => {
        const sum = g.reviews.reduce((acc, curr) => acc + curr.rating, 0);
        g.average_rating = g.reviews.length > 0 ? Number((sum / g.reviews.length).toFixed(1)) : 0;
        return g;
      });

      setGroupedLocations(finalGroups);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลรีวิว");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setIsDeleting(true);

      const res = await fetch(`/api/reviews?id=${deleteConfirm}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "ลบรีวิวไม่สำเร็จ");
      }

      toast.success("ลบรีวิวเรียบร้อยแล้ว");

      setGroupedLocations((prev) => {
        return prev
          .map((loc) => {
            const newReviews = loc.reviews.filter((r) => r.id !== deleteConfirm);
            if (newReviews.length === loc.reviews.length) return loc;

            const newAvg =
              newReviews.length > 0
                ? Number((newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length).toFixed(1))
                : 0;
            return { ...loc, reviews: newReviews, average_rating: newAvg };
          })
          .filter((loc) => loc.reviews.length > 0);
      });

      if (selectedLocation) {
        const updatedReviews = selectedLocation.reviews.filter((r) => r.id !== deleteConfirm);
        if (updatedReviews.length === 0) {
          setSelectedLocation(null);
        } else {
          const newAvg = Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1));
          setSelectedLocation({
            ...selectedLocation,
            reviews: updatedReviews,
            average_rating: newAvg,
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "ลบรีวิวไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const filteredLocations = useMemo(() => {
    return groupedLocations.filter((loc) => {
      const matchSearch = loc.target_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = activeType === "ทั้งหมด" || loc.target_type === activeType;
      return matchSearch && matchType;
    });
  }, [groupedLocations, searchQuery, activeType]);

  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const displayedLocations = useMemo(() => {
    return filteredLocations.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredLocations, page]);

  // --- Render Helpers ---
  const renderStars = (rating: number, size = 13) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={size}
        className={`${
          i < Math.round(rating)
            ? "fill-amber-500 text-amber-500"
            : "fill-stone-100 text-stone-200"
        } transition-colors`}
      />
    ));
  };

  const timeAgo = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "วันนี้";
    if (days < 30) return `${days} วันที่แล้ว`;
    return new Date(dateStr).toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 font-sans text-stone-900 selection:bg-teal-100 selection:text-teal-900">
      <main className="max-w-6xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-0.5 text-xs font-semibold text-teal-800 mb-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
              จัดการรีวิวและความคิดเห็น • Moderation Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              จัดการรีวิวของแต่ละสถานที่
            </h1>
            <p className="text-stone-500 mt-1 text-sm">
              ตรวจสอบ ตรวจทาน และจัดการโพสต์ความคิดเห็นของผู้ใช้บนสถานที่ต่างๆ
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white border border-stone-200/80 rounded-2xl shadow-xs gap-3 mb-6">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {(["ทั้งหมด", "ที่พัก", "ร้านอาหาร", "สถานที่ท่องเที่ยว"] as CategoryType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 cursor-pointer ${
                  activeType === type
                    ? "bg-teal-700 text-white shadow-xs"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-stone-50"
                }`}
              >
                {type === "ทั้งหมด" ? "ทุกหมวดหมู่" : type}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาชื่อสถานที่..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 bg-stone-50/70 border border-stone-200 text-stone-900 rounded-xl pl-10 pr-9 text-sm outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Arena */}
        <div className="min-h-100">
          <AnimatePresence mode="popLayout">
            {(!authLoaded || loading) ? (
              /* Premium Shimmer Skeleton Grid View */
              <div key="loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs animate-pulse">
                    <div className="aspect-square bg-stone-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-stone-100 rounded w-3/4" />
                      <div className="h-3 bg-stone-50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLocations.length === 0 ? (
              /* Minimalistic Empty State */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-dashed border-stone-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-xs"
              >
                <div className="w-12 h-12 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center mb-4 text-amber-600 shadow-2xs">
                  <Inbox size={20} />
                </div>
                <h3 className="text-base font-bold text-stone-900">ไม่พบข้อมูลสถานที่</h3>
                <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
                  {searchQuery ? `ไม่พบรีวิวที่ตรงกับคำค้นหา "${searchQuery}"` : "ยังไม่มีข้อมูลการรีวิวในระบบสำหรับหมวดหมู่นี้"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </motion.div>
            ) : (
              /* Content Card Grid */
              <motion.div
                key="grid-data"
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {displayedLocations.map((loc) => (
                  <div
                    key={loc.target_id}
                    onClick={() => setSelectedLocation(loc)}
                    className="group bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-teal-300 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square bg-stone-100 overflow-hidden border-b border-stone-100">
                        {loc.target_image ? (
                          <img
                            src={loc.target_image}
                            alt={loc.target_name}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex bg-stone-50 items-center justify-center text-stone-300">
                            <ImageIcon size={32} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-white/95 backdrop-blur-xs text-stone-800 border border-stone-200/80 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                            {loc.target_type}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col gap-1">
                        <h3 className="font-bold text-stone-900 truncate text-sm group-hover:text-teal-700 transition-colors">
                          {loc.target_name}
                        </h3>
                        {loc.target_location && (
                          <p className="text-xs text-stone-400 flex items-center gap-1 truncate">
                            <MapPin size={11} className="shrink-0" /> {loc.target_location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2.5 flex items-center justify-between border-t border-stone-100 mt-auto bg-stone-50/40">
                      <span className="text-xs font-semibold text-teal-700 group-hover:text-teal-800 transition-colors">
                        {loc.reviews.length} รีวิว
                      </span>
                      <div className="flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-xs text-amber-900">
                          {loc.average_rating}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-1 py-3 border-t border-stone-200">
            <p className="text-xs text-stone-500">
              หน้า <span className="font-semibold text-stone-900">{page}</span> จาก <span className="font-semibold text-stone-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-stone-500 border border-stone-200 bg-white hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-stone-500 border border-stone-200 bg-white hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Premium Focused Workspace Review Sheet Overlay ─── */}
        <AnimatePresence>
          {selectedLocation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLocation(null)}
                className="absolute inset-0 bg-stone-950/30 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full h-[90vh] md:h-auto md:max-h-[80vh] max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-stone-200/80"
              >
                {/* Close Button on Mobile layout */}
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="md:hidden absolute top-3 right-3 z-50 p-2 bg-white/90 backdrop-blur-xs text-stone-700 rounded-xl border border-stone-200 shadow-sm"
                >
                  <X size={16} />
                </button>

                {/* Left Side Visual Preview Pane */}
                <div className="w-full md:w-[45%] h-[30vh] md:h-auto bg-stone-100 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-stone-200/80">
                  {selectedLocation.target_image ? (
                    <img
                      src={selectedLocation.target_image}
                      alt={selectedLocation.target_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-stone-300">
                      <ImageIcon size={40} className="mb-1" />
                      <p className="text-xs">ไม่มีรูปภาพสถานที่</p>
                    </div>
                  )}
                  <div className="hidden md:block absolute top-3 left-3 bg-teal-900/85 backdrop-blur-xs text-teal-50 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-teal-700/50 shadow-xs">
                    {selectedLocation.target_type}
                  </div>
                </div>

                {/* Right Side Comments Interactive Panel */}
                <div className="w-full md:w-[55%] flex flex-col bg-white h-[60vh] md:h-[80vh]">
                  {/* Internal Sub-Header */}
                  <div className="p-4 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-stone-50/50">
                    <div className="min-w-0 pr-4">
                      <h2 className="font-semibold text-stone-900 text-sm truncate" title={selectedLocation.target_name}>
                        {selectedLocation.target_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-stone-500">
                          {selectedLocation.reviews.length} รายการรีวิว
                        </p>
                        <span className="w-1 h-1 rounded-full bg-stone-300" />
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-amber-800">
                            {selectedLocation.average_rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="hidden md:flex p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Reviews Stream Container */}
                  <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                    {selectedLocation.reviews.map((r) => (
                      <div key={r.id} className="flex gap-3 items-start group">
                        {/* Elegant Minimal Initial Circle */}
                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-800 font-bold text-xs shrink-0 select-none shadow-2xs">
                          {r.created_by.charAt(0).toUpperCase()}
                        </div>

                        {/* Speech Block */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-stone-50/90 border border-stone-200/80 p-3.5 rounded-2xl rounded-tl-xs shadow-2xs">
                            <div className="flex justify-between items-center mb-1.5 gap-2">
                              <span className="font-medium text-xs text-stone-500 truncate" title={r.created_by}>
                                ID: {r.created_by.slice(0, 8)}...
                              </span>
                              <div className="flex gap-0.5 shrink-0">
                                {renderStars(r.rating, 10)}
                              </div>
                            </div>
                            <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                              {r.comment || <span className="text-stone-400 italic text-xs">ไม่มีข้อความประเมิน</span>}
                            </p>
                          </div>

                          {/* Action Sub-text line */}
                          <div className="flex items-center gap-3 mt-1.5 ml-1">
                            <span className="text-[10px] text-stone-400 font-medium">
                              {timeAgo(r.created_at)}
                            </span>
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="text-[10px] font-semibold text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 size={11} /> ลบความคิดเห็นนี้
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Destructive Action Confirmation Modal */}
        <ConfirmDialog
          open={!!deleteConfirm}
          danger={true}
          loading={isDeleting}
          title="ลบรีวิว"
          message={
            <span className="block leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการรีวิวนี้? ข้อมูลคอมเมนต์และคะแนนจะถูก <span className="font-semibold text-stone-900">ลบอย่างถาวร</span> โดยไม่สามารถกู้คืนได้
            </span>
          }
          confirmText="ลบถาวร"
          cancelText="ยกเลิก"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      </main>
    </div>
  );
}