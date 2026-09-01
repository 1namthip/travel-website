"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, MoreHorizontal, Edit3, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface RestaurantsTableProps {
  restaurants: any[];
  onEdit: (r: any) => void;
  onDelete: () => void;
}

export default function RestaurantsTable({ restaurants, onEdit, onDelete }: RestaurantsTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setPage(1);
  }, [restaurants.length]);

  // Handle global click to close action menus
  useEffect(() => {
    const closeAllMenus = () => setOpenMenuId(null);
    window.addEventListener("click", closeAllMenus);
    return () => window.removeEventListener("click", closeAllMenus);
  }, []);

  const totalPages = Math.ceil(restaurants.length / itemsPerPage);
  
  const displayedRestaurants = useMemo(() => {
    return restaurants.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage
    );
  }, [restaurants, page]);

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

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="w-full">
      {/* ─── Premium Restaurants Card List ─── */}
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
                onClick={() => onEdit(r)}
                className="group bg-white border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors p-4 rounded-xl flex flex-col sm:flex-row gap-5 relative cursor-pointer"
              >
                {/* Image Container Block */}
                <div className="relative w-full sm:w-50 aspect-16/10 sm:h-32 shrink-0 overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  {imgData.primary ? (
                    <>
                      <img
                        src={imgData.primary}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {imgData.count > 1 && (
                        <div className="absolute bottom-2 right-2 bg-zinc-950/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded select-none">
                          +{imgData.count - 1} รูป
                        </div>
                      )}
                    </>
                  ) : (
                    <ImageIcon size={20} className="text-zinc-300" />
                  )}

                  {/* Section label */}
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/95 text-zinc-700 border border-zinc-200 text-[10px] font-medium px-1.5 py-0.5 rounded">
                      ร้านอาหาร
                    </span>
                  </div>
                </div>

                {/* Content Details Block */}
                <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                  <div className="relative pr-8">
                    {/* Three-Dot Dropdown Trigger Menu */}
                    <div className="absolute top-0 right-0">
                      <button
                        onClick={(e) => handleMenuToggle(e, r.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
                        aria-expanded={openMenuId === r.id}
                        aria-haspopup="true"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {/* Dropdown Box Overlay */}
                      <AnimatePresence>
                        {openMenuId === r.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50 text-left overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { onEdit(r); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium"
                            >
                              <Edit3 size={13} className="text-zinc-400" /> แก้ไขข้อมูล
                            </button>
                            <div className="h-px bg-zinc-100 my-1" />
                            <button
                              onClick={() => { setConfirmId(r.id); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                              <Trash2 size={13} className="text-red-500/70" /> ลบข้อมูลร้าน
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Metadata Header Line */}
                    <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                      <span>{r.category || "ทั่วไป"}</span>
                      {r.location && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="flex items-center gap-1 max-w-50 truncate">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{r.location}</span>
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Restaurant Name */}
                    <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug truncate">
                      {r.name}
                    </h3>

                    {/* Rich Description */}
                    <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed max-w-xl">
                      {r.description || "พร้อมมอบประสบการณ์อาหารเลิศรสและบริการที่ประทับใจให้กับคุณ"}
                    </p>
                  </div>

                  {/* Secondary Metadata Footer Bar */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      {r.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {r.phone}
                        </span>
                      ) : (
                        <span className="italic text-zinc-300">ไม่มีข้อมูลเบอร์ติดต่อ</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-1">
          <p className="hidden sm:block text-xs text-zinc-500">
            แสดง <span className="font-medium text-zinc-900">{(page - 1) * itemsPerPage + 1}</span>–
            <span className="font-medium text-zinc-900">{Math.min(page * itemsPerPage, restaurants.length)}</span> จาก{" "}
            <span className="font-medium text-zinc-900">{restaurants.length}</span> รายการ
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
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

      {/* ─── Global Destructive Action Confirm Dialog ─── */}
      <ConfirmDialog
        open={!!confirmId}
        danger={true}
        loading={isDeleting}
        title="ลบข้อมูลร้านอาหาร"
        message={
          <span className="block leading-relaxed">
            คุณต้องการลบข้อมูลร้านอาหารนี้ออกจากระบบหรือไม่? ข้อมูลประวัติและรูปภาพทั้งหมดจะถูก{" "}
            <span className="font-semibold text-zinc-900">ลบอย่างถาวร</span> โดยไม่สามารถกู้คืนได้
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