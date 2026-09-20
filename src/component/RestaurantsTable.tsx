"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  UtensilsCrossed,
} from "lucide-react";

interface RestaurantsTableProps {
  restaurants: any[];
  onEdit: (r: any) => void;
  onDelete: () => void;
  viewMode?: "grid" | "list";
}

export default function RestaurantsTable({
  restaurants,
  onEdit,
  onDelete,
  viewMode = "grid",
}: RestaurantsTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic items per page based on view mode (9 for 3-col grid, 6 for list)
  const itemsPerPage = viewMode === "grid" ? 9 : 6;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [restaurants.length, viewMode]);

  const totalPages = Math.max(1, Math.ceil(restaurants.length / itemsPerPage));

  const displayedRestaurants = useMemo(() => {
    return restaurants.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [restaurants, page, itemsPerPage]);

  const getImagesData = (imageUrl: string | null) => {
    if (!imageUrl) return { primary: null, count: 0 };
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) {
        return { primary: parsed[0] || null, count: parsed.length };
      }
      return { primary: imageUrl, count: 1 };
    } catch {
      return { primary: imageUrl, count: 1 };
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("ลบข้อมูลร้านอาหารเรียบร้อยแล้ว");
      onDelete();
      setConfirmId(null);

      if (displayedRestaurants.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch {
      toast.error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full">
      {/* ─── 1. GRID VIEW MODE (3 Columns) ─── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {displayedRestaurants.map((r) => {
              const imgData = getImagesData(r.image_url);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  key={r.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-lg hover:border-teal-300 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                >
                  {/* Top Thumbnail Image */}
                  <div>
                    <div
                      onClick={() => onEdit(r)}
                      className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
                    >
                      {imgData.primary ? (
                        <>
                          <img
                            src={imgData.primary}
                            alt={r.name}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                            loading="lazy"
                          />
                          {imgData.count > 1 && (
                            <div className="absolute bottom-2.5 right-2.5 bg-stone-950/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs select-none">
                              +{imgData.count - 1} รูป
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
                        <span className="bg-teal-900/85 backdrop-blur-xs text-teal-50 border border-teal-700/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1">
                          <UtensilsCrossed size={11} className="text-teal-200" />
                          {r.category || "ร้านอาหาร"}
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 space-y-2.5">
                      {/* Location snippet */}
                      {r.location && (
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <MapPin size={12} className="shrink-0 text-stone-400" />
                          <span className="truncate">{r.location}</span>
                        </div>
                      )}

                      {/* Restaurant Name */}
                      <h3
                        onClick={() => onEdit(r)}
                        className="text-base font-bold text-stone-900 tracking-tight leading-snug truncate group-hover:text-teal-700 transition-colors cursor-pointer"
                        title={r.name}
                      >
                        {r.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed min-h-8">
                        {r.description || "พร้อมบริการอาหารและเครื่องดื่มรสเลิศ"}
                      </p>

                      {/* Contact Phone Pill */}
                      {r.phone ? (
                        <div className="flex items-center gap-1 text-xs text-stone-600 pt-1 font-medium">
                          <Phone size={12} className="text-teal-700 shrink-0" />
                          <span>{r.phone}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-400 italic pt-1">
                          ไม่มีข้อมูลเบอร์ติดต่อ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-3 bg-stone-50/70 border-t border-stone-100 flex items-center gap-2">
                    <button
                      onClick={() => onEdit(r)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 size={13} className="text-teal-700" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmId(r.id);
                        setConfirmName(r.name);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                      title="ลบร้านอาหาร"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">ลบ</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── 2. LIST VIEW MODE (Horizontal Rows) ─── */
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedRestaurants.map((r) => {
              const imgData = getImagesData(r.image_url);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  key={r.id}
                  className="group bg-white border border-stone-200/80 shadow-xs hover:border-teal-300 hover:shadow-md transition-all p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-4.5 relative"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => onEdit(r)}
                    className="relative w-full sm:w-44 aspect-16/10 sm:h-28 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/60 flex items-center justify-center cursor-pointer"
                  >
                    {imgData.primary ? (
                      <>
                        <img
                          src={imgData.primary}
                          alt={r.name}
                          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                          loading="lazy"
                        />
                        {imgData.count > 1 && (
                          <div className="absolute bottom-2 right-2 bg-stone-950/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs select-none">
                            +{imgData.count - 1} รูป
                          </div>
                        )}
                      </>
                    ) : (
                      <ImageIcon size={22} className="text-stone-300" />
                    )}

                    {/* Section label */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-teal-900/85 backdrop-blur-xs text-teal-50 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                        {r.category || "ร้านอาหาร"}
                      </span>
                    </div>
                  </div>

                  {/* Content Details Block */}
                  <div
                    onClick={() => onEdit(r)}
                    className="flex-1 flex flex-col justify-between min-w-0 py-0.5 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-teal-800 font-semibold bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md text-[11px]">
                          {r.category || "ทั่วไป"}
                        </span>
                        {r.location && (
                          <span className="flex items-center gap-1 truncate text-xs text-stone-500">
                            <MapPin size={12} className="shrink-0 text-stone-400" />
                            <span className="truncate">{r.location}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-stone-900 leading-snug truncate group-hover:text-teal-700 transition-colors">
                        {r.name}
                      </h3>

                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {r.description || "พร้อมมอบประสบการณ์อาหารเลิศรสและบริการที่ประทับใจ"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-2.5">
                      {r.phone ? (
                        <span className="flex items-center gap-1 text-stone-600 font-medium">
                          <Phone size={12} className="text-teal-700" /> {r.phone}
                        </span>
                      ) : (
                        <span className="italic text-stone-400 text-[11px]">
                          ไม่มีข้อมูลเบอร์ติดต่อ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side Action Buttons */}
                  <div className="sm:border-l sm:border-stone-100 sm:pl-4 flex sm:flex-col gap-2 shrink-0 justify-center">
                    <button
                      onClick={() => onEdit(r)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 size={13} className="text-teal-700" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmId(r.id);
                        setConfirmName(r.name);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">ลบ</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-1">
          <p className="hidden sm:block text-xs text-stone-500">
            แสดง{" "}
            <span className="font-semibold text-stone-900">
              {(page - 1) * itemsPerPage + 1}
            </span>
            –
            <span className="font-semibold text-stone-900">
              {Math.min(page * itemsPerPage, restaurants.length)}
            </span>{" "}
            จาก{" "}
            <span className="font-semibold text-stone-900">
              {restaurants.length}
            </span>{" "}
            รายการ
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
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
              ))}
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

      {/* ─── Global Destructive Action Confirm Dialog ─── */}
      <ConfirmDialog
        open={!!confirmId}
        danger={true}
        loading={isDeleting}
        title="ลบข้อมูลร้านอาหาร"
        message={
          <span className="block leading-relaxed">
            คุณต้องการลบร้าน{" "}
            <span className="font-semibold text-stone-900">{confirmName}</span>{" "}
            ออกจากระบบหรือไม่? ข้อมูลประวัติและรูปภาพทั้งหมดจะถูก{" "}
            <span className="font-semibold text-stone-900">ลบอย่างถาวร</span>{" "}
            โดยไม่สามารถกู้คืนได้
          </span>
        }
        confirmText="ลบถาวร"
        cancelText="ยกเลิก"
        onConfirm={() => confirmId && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}