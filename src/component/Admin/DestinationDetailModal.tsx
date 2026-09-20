"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Ticket,
  Edit3,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import type { Destination } from "@/types/destination";
import { DAYS_CONFIG } from "@/component/OpeningHoursEditor";

interface DestinationDetailModalProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (destination: Destination) => void;
  todayDayCode: string;
}

export default function DestinationDetailModal({
  destination,
  isOpen,
  onClose,
  onEdit,
  todayDayCode,
}: DestinationDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!isOpen || !destination) return null;

  // Parse images
  const images: string[] = (() => {
    if (!destination.image_url) return [];
    if (Array.isArray(destination.image_url)) return destination.image_url;
    try {
      const parsed = JSON.parse(destination.image_url);
      return Array.isArray(parsed) ? parsed : [destination.image_url];
    } catch {
      return [destination.image_url];
    }
  })();

  const currentImage = images[activeImageIndex] || images[0];

  // Price label
  const priceDisplay = (() => {
    const min = Number(destination.min_price) || 0;
    const max = Number(destination.max_price) || 0;
    if (min === 0 && max === 0) return "เข้าชมฟรี";
    if (min > 0 && max > 0 && min !== max) return `฿${min.toLocaleString()} - ฿${max.toLocaleString()}`;
    return `฿${(min || max).toLocaleString()}`;
  })();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                <Sparkles size={12} className="text-teal-600" />
                {destination.category || "สถานที่ท่องเที่ยว"}
              </span>
              <span className="text-xs text-stone-400">• รายละเอียดสถานที่</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
            {/* Image Gallery */}
            <div>
              <div className="relative w-full aspect-16/9 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs">
                {currentImage ? (
                  <Image
                    src={currentImage}
                    alt={destination.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                    <ImageIcon size={40} strokeWidth={1.5} />
                    <span className="text-xs text-stone-400 mt-2">ไม่มีรูปภาพ</span>
                  </div>
                )}

                {/* Admission badge on image */}
                <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                  <Ticket size={13} className="text-amber-400" />
                  <span>{priceDisplay}</span>
                </div>
              </div>

              {/* Thumbnails if multiple images */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? "border-teal-700 ring-2 ring-teal-600/20"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Description Section */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                {destination.name}
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line bg-stone-50/80 p-4 rounded-xl border border-stone-100">
                {destination.description || "ยังไม่มีข้อมูลคำอธิบายสำหรับสถานที่นี้"}
              </p>
            </div>

            {/* 7 Days Operating Schedule Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Calendar size={16} className="text-teal-700" />
                  วันและเวลาเปิดให้บริการ (7 วัน)
                </h3>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 bg-white">
                {DAYS_CONFIG.map((day) => {
                  const isToday = todayDayCode === day.key;
                  const sched = destination.opening_hours?.[day.key];
                  const hasOpenDays = destination.open_days?.includes(day.key);

                  // Determine status
                  let isOpen = false;
                  let timeStr = "";

                  if (sched && typeof sched === "object" && typeof sched.is_open === "boolean") {
                    isOpen = sched.is_open;
                    timeStr = isOpen && sched.open_time && sched.close_time
                      ? `${sched.open_time} - ${sched.close_time} น.`
                      : "";
                  } else if (hasOpenDays !== undefined) {
                    isOpen = hasOpenDays;
                    timeStr = isOpen ? "08:00 - 17:00 น. (มาตรฐาน)" : "";
                  } else {
                    isOpen = true; // Default open
                    timeStr = "08:00 - 17:00 น. (ค่าเริ่มต้น)";
                  }

                  return (
                    <div
                      key={day.key}
                      className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                        isToday ? "bg-amber-50/70 font-semibold border-l-3 border-amber-500" : "hover:bg-stone-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-16 font-medium ${isToday ? "text-amber-900 font-bold" : "text-stone-700"}`}>
                          {day.fullLabel}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.2 rounded-full">
                            วันนี้
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <>
                            <span className="text-stone-600 font-mono text-[11px]">{timeStr}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              เปิด
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                            <XCircle size={11} className="text-stone-400" />
                            ปิดทำการ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admission Info */}
            <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Ticket size={18} />
                </div>
                <div>
                  <div className="text-xs text-stone-500">ค่าธรรมเนียมเข้าชม</div>
                  <div className="text-sm font-bold text-stone-900">{priceDisplay}</div>
                </div>
              </div>
              <div className="text-xs text-stone-500">
                {destination.min_price === 0 && destination.max_price === 0
                  ? "เปิดให้เข้าชมฟรีไม่มีค่าใช้จ่าย"
                  : `ขั้นต่ำ ฿${(destination.min_price || 0).toLocaleString()} ต่อคน`}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(destination);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-sm shadow-teal-900/15 cursor-pointer"
            >
              <Edit3 size={13} />
              แก้ไขข้อมูลนี้
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
