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
            ? "fill-amber-400 text-amber-400"
            : "fill-zinc-100 text-zinc-200"
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
    <div className="min-h-screen bg-zinc-50 pb-24 font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-6xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              จัดการรีวิวของแต่ละสถานที่
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">
              ตรวจสอบ ตรวจทาน และจัดการโพสต์ความคิดเห็นของผู้ใช้บนสถานที่ต่างๆ
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-2.5 bg-white border border-zinc-200 rounded-xl shadow-sm gap-2.5 mb-6">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {(["ทั้งหมด", "ที่พัก", "ร้านอาหาร", "สถานที่ท่องเที่ยว"] as CategoryType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  activeType === type
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {type === "ทั้งหมด" ? "ทุกหมวดหมู่" : type}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาชื่อสถานที่..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 bg-white border border-zinc-200 text-zinc-900 rounded-lg pl-9 pr-9 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
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
                  <div key={i} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-square bg-zinc-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-zinc-100 rounded w-3/4" />
                      <div className="h-3 bg-zinc-50 rounded w-1/2" />
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
                className="bg-white border border-zinc-200 rounded-xl p-16 text-center flex flex-col items-center justify-center border-dashed"
              >
                <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center mb-4 text-zinc-400">
                  <Inbox size={18} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">ไม่พบข้อมูลสถานที่</h3>
                <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">
                  {searchQuery ? `ไม่พบรีวิวที่ตรงกับคำค้นหา "${searchQuery}"` : "ยังไม่มีข้อมูลการรีวิวในระบบสำหรับหมวดหมู่นี้"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
                    className="group bg-white rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors cursor-pointer overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square bg-zinc-50 overflow-hidden border-b border-zinc-100">
                        {loc.target_image ? (
                          <img
                            src={loc.target_image}
                            alt={loc.target_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex bg-zinc-50 items-center justify-center text-zinc-300">
                            <ImageIcon size={32} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="bg-white/95 text-zinc-700 border border-zinc-200 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            {loc.target_type}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col gap-1">
                        <h3 className="font-medium text-zinc-900 truncate text-sm">
                          {loc.target_name}
                        </h3>
                        {loc.target_location && (
                          <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                            <MapPin size={10} /> {loc.target_location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-zinc-50 mt-auto bg-zinc-50/20">
                      <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                        {loc.reviews.length} รีวิว
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-xs text-zinc-700">
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
          <div className="flex items-center justify-between mt-8 px-1 py-3 border-t border-zinc-200">
            <p className="text-xs text-zinc-500">
              หน้า <span className="font-medium text-zinc-900">{page}</span> จาก <span className="font-medium text-zinc-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
                className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full h-[90vh] md:h-auto md:max-h-[80vh] max-w-4xl bg-white rounded-xl shadow-xl flex flex-col md:flex-row overflow-hidden border border-zinc-200"
              >
                {/* Close Button on Mobile layout */}
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="md:hidden absolute top-3 right-3 z-50 p-1.5 bg-white text-zinc-700 rounded-lg border border-zinc-200 shadow-sm"
                >
                  <X size={16} />
                </button>

                {/* Left Side Visual Preview Pane */}
                <div className="w-full md:w-[45%] h-[30vh] md:h-auto bg-zinc-50 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-zinc-200">
                  {selectedLocation.target_image ? (
                    <img
                      src={selectedLocation.target_image}
                      alt={selectedLocation.target_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-300">
                      <ImageIcon size={40} className="mb-1" />
                      <p className="text-xs">ไม่มีรูปภาพสถานที่</p>
                    </div>
                  )}
                  <div className="hidden md:block absolute top-3 left-3 bg-zinc-900/85 text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
                    {selectedLocation.target_type}
                  </div>
                </div>

                {/* Right Side Comments Interactive Panel */}
                <div className="w-full md:w-[55%] flex flex-col bg-white h-[60vh] md:h-[80vh]">
                  {/* Internal Sub-Header */}
                  <div className="p-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-zinc-50/50">
                    <div className="min-w-0 pr-4">
                      <h2 className="font-medium text-zinc-900 text-sm truncate" title={selectedLocation.target_name}>
                        {selectedLocation.target_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-zinc-400">
                          {selectedLocation.reviews.length} รายการรีวิว
                        </p>
                        <span className="w-1 h-1 rounded-full bg-zinc-300" />
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-zinc-700">
                            {selectedLocation.average_rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="hidden md:flex p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Reviews Stream Container */}
                  <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                    {selectedLocation.reviews.map((r) => (
                      <div key={r.id} className="flex gap-3 items-start group">
                        {/* Elegant Minimal Initial Circle */}
                        <div className="w-7 h-7 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-medium text-xs shrink-0 select-none">
                          {r.created_by.charAt(0).toUpperCase()}
                        </div>

                        {/* Speech Block */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg rounded-tl-none">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="font-medium text-xs text-zinc-500 truncate" title={r.created_by}>
                                ID: {r.created_by.slice(0, 8)}...
                              </span>
                              <div className="flex gap-0.5 shrink-0">
                                {renderStars(r.rating, 10)}
                              </div>
                            </div>
                            <p className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                              {r.comment || <span className="text-zinc-400 italic text-xs">ไม่มีข้อความประเมิน</span>}
                            </p>
                          </div>

                          {/* Action Sub-text line */}
                          <div className="flex items-center gap-3 mt-1.5 ml-1">
                            <span className="text-[10px] text-zinc-400">
                              {timeAgo(r.created_at)}
                            </span>
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="text-[10px] font-medium text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 size={10} /> ลบความคิดเห็นนี้
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
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการรีวิวนี้? ข้อมูลคอมเมนต์และคะแนนจะถูก <span className="font-semibold text-zinc-900">ลบอย่างถาวร</span> โดยไม่สามารถกู้คืนได้
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