"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, LayoutGrid, ImageOff, Play } from "lucide-react";
import { isVideoUrl } from "@/lib/media";

interface ImageGalleryProps {
  /** รายการสื่อรวม (รูป + วิดีโอ) แยกประเภทด้วยนามสกุลไฟล์ */
  images: string[];
  alt: string;
}

/** รูปหรือวิดีโอหนึ่งช่อง ใช้ทั้งในกริดและ hero */
function MediaTile({
  src,
  alt,
  className,
  showPlayBadge = true,
}: {
  src: string;
  alt: string;
  className?: string;
  showPlayBadge?: boolean;
}) {
  if (isVideoUrl(src)) {
    return (
      <>
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className={className}
        />
        {showPlayBadge && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-neutral-950/55 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </>
    );
  }
  return (
    <Image src={src} alt={alt} fill unoptimized className={className} />
  );
}

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const showPrev = useCallback(
    () => setActiveIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const showNext = useCallback(
    () => setActiveIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, closeLightbox, showPrev, showNext]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[40vh] md:h-[50vh] lg:h-[60vh] rounded-3xl mb-12 bg-neutral-100 flex flex-col items-center justify-center text-neutral-300">
        <ImageOff className="w-10 h-10 mb-2" />
        <span className="text-sm font-medium">ไม่มีรูปภาพ</span>
      </div>
    );
  }

  const rightImages = images.slice(1, 5);
  const extraCount = images.length - 5;

  const rightGridClass =
    rightImages.length === 4
      ? "grid-cols-2 grid-rows-2"
      : rightImages.length === 3
        ? "grid-cols-1 grid-rows-3"
        : rightImages.length === 2
          ? "grid-cols-1 grid-rows-2"
          : "grid-cols-1 grid-rows-1";

  const activeIsVideo = isVideoUrl(images[activeIndex]);

  return (
    <>
      <div className="w-full h-[40vh] md:h-[50vh] lg:h-[60vh] relative rounded-3xl overflow-hidden mb-12 flex gap-2">
        {/* Main Large Image */}
        <div
          onClick={() => openLightbox(0)}
          className={`relative h-full cursor-pointer group ${rightImages.length > 0 ? "w-full md:w-1/2" : "w-full"}`}
        >
          <MediaTile
            src={images[0]}
            alt={alt}
            className="object-cover w-full h-full group-hover:brightness-95 transition-all duration-300"
          />
        </div>

        {/* Grid Small Images (Desktop Only) */}
        {rightImages.length > 0 && (
          <div className={`hidden md:grid w-1/2 h-full gap-2 ${rightGridClass}`}>
            {rightImages.map((img, i) => {
              const realIndex = i + 1;
              const isLastVisible = i === rightImages.length - 1;
              return (
                <div
                  key={realIndex}
                  onClick={() => openLightbox(realIndex)}
                  className="relative w-full h-full cursor-pointer group overflow-hidden bg-neutral-100"
                >
                  <MediaTile
                    src={img}
                    alt={`${alt} ${realIndex + 1}`}
                    className="object-cover w-full h-full group-hover:scale-105 group-hover:brightness-95 transition-all duration-500"
                  />
                  {isLastVisible && extraCount > 0 && (
                    <div className="absolute inset-0 bg-neutral-950/55 flex flex-col items-center justify-center text-white pointer-events-none">
                      <LayoutGrid className="w-5 h-5 mb-1" />
                      <span className="text-sm font-bold">+{extraCount} รูป</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* View All Photos Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3.5 py-2 bg-white text-neutral-900 text-xs font-bold rounded-lg shadow-lg hover:bg-neutral-50 transition active:scale-95"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> ดูรูปทั้งหมด ({images.length})
          </button>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-100 bg-neutral-950/95 flex flex-col select-none"
          >
            {/* Header */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between px-4 sm:px-6 py-4 text-white shrink-0"
            >
              <span className="text-sm font-medium text-neutral-300">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex-1 relative flex items-center justify-center px-4 sm:px-16 min-h-0"
            >
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-sm"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
              <div className="relative w-full h-full max-w-5xl">
                {activeIsVideo ? (
                  <video
                    key={images[activeIndex]}
                    src={images[activeIndex]}
                    controls
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    src={images[activeIndex]}
                    alt={`${alt} ${activeIndex + 1}`}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                )}
              </div>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-sm"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex gap-2 overflow-x-auto px-4 sm:px-6 py-4 scrollbar-none"
              >
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      i === activeIndex
                        ? "border-white"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <MediaTile src={img} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
