"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ArrowRight, ArrowLeft, Play, Loader2 } from "lucide-react";

// สร้าง Interface สำหรับรับข้อมูลจาก API ให้ตรงกับโครงสร้างเดิมที่ UI ต้องการ
interface DestinationUI {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  image: string;
  desc: string;
}

const slideTransition = {
  duration: 0.5,
  ease: [0.075, 0.82, 0.165, 1],
} as const;

const easeOutCirc = [0.075, 0.82, 0.165, 1] as const;

const getParsedImages = (data: any, fallbackData?: any): string[] => {
  const defaultImg =
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200";
  const sourceToParse = data || fallbackData;

  if (!sourceToParse) return [defaultImg];

  try {
    if (typeof sourceToParse === "string" && sourceToParse.startsWith("[")) {
      const parsed = JSON.parse(sourceToParse);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultImg];
    }
    if (Array.isArray(sourceToParse) && sourceToParse.length > 0) {
      return sourceToParse;
    }
    if (typeof sourceToParse === "string") {
      return [sourceToParse];
    }
    return [defaultImg];
  } catch {
    return [defaultImg];
  }
};

export default function HeroSection() {
  const [destinations, setDestinations] = useState<DestinationUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // ฟังก์ชันดึงข้อมูลจาก API
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch("/api/destinations");
        const data = await response.json();
        const formattedData: DestinationUI[] = data.map((item: any) => ({
          id: String(item.id).padStart(2, "0"),
          title: item.name,
          subtitle: item.category || "จุดหมายปลายทาง",
          location: "นครราชสีมา",
          // ใช้ฟังก์ชันของคุณดึง Array ออกมา แล้วเลือกรูปแรก (Index 0)
          image: getParsedImages(item.image_url)[0],
          desc: item.description,
        }));

        setDestinations(formattedData);
      } catch (error) {
        console.error("Error fetching destinations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  const nextSlide = () => {
    if (isAnimating || destinations.length === 0) return;
    setIsAnimating(true);
    setActiveIdx((prev) => (prev + 1) % destinations.length);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const prevSlide = () => {
    if (isAnimating || destinations.length === 0) return;
    setIsAnimating(true);
    setActiveIdx((prev) => (prev === 0 ? destinations.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Auto-slide effect
  useEffect(() => {
    if (destinations.length === 0) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIdx, isAnimating, destinations.length]);

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full h-screen min-h-185 bg-neutral-950 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  // Fallback in case API fails or returns empty
  if (!destinations || destinations.length === 0) {
    return (
      <div className="w-full h-screen min-h-185 bg-neutral-950 flex items-center justify-center text-white">
        <p>ไม่พบข้อมูลสถานที่ท่องเที่ยว</p>
      </div>
    );
  }

  const activeData = destinations[activeIdx];

  return (
    <section className="relative w-full h-screen min-h-185 overflow-hidden bg-neutral-950 text-white">
      {/* 1. Background Layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeData.id}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${activeData.image})` }}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/40 to-transparent w-full md:w-3/4" />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent h-1/2 top-auto bottom-0" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-between px-6 pt-24 pb-12 md:px-12 lg:px-24">
        {/* Left Content (Text) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center gap-6 md:pr-12 z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeData.id}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.8, ease: easeOutCirc }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <MapPin className="w-5 h-5" />
                <span className="uppercase tracking-[0.2em] text-sm font-semibold">
                  {activeData.subtitle}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.1] mt-2 mb-4">
                {activeData.title}
              </h1>

              <p className="text-white/80 text-base md:text-lg max-w-lg leading-relaxed line-clamp-4">
                {activeData.desc}
              </p>

              <div className="flex items-center gap-6 mt-6">
                <a
                  href="#destinations"
                  className="group relative px-8 py-4 bg-white text-black rounded-full font-bold uppercase tracking-wider text-sm overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    สำรวจสถานที่แนะนำ
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-amber-500 transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />
                </a>
                <button className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 group">
                  <Play className="w-4 h-4 ml-1 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Content (Carousel Cards + Centered Controls) */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center gap-10 mt-12 md:mt-0">
          {/* Card Carousel Wrapper */}
          <div className="relative w-full max-w-70 md:max-w-[320px] lg:max-w-90 h-95 md:h-112 lg:h-125 perspective-[1000px]">
            {destinations.map((dest, i) => {
              const offset = i - activeIdx;

              // Handle wrap-around effect for smooth infinite carousel feel
              const total = destinations.length;
              let normalizedOffset = offset;
              if (offset < -Math.floor(total / 2)) normalizedOffset += total;
              if (offset > Math.floor(total / 2)) normalizedOffset -= total;

              const isActive = normalizedOffset === 0;
              const isPast = normalizedOffset < 0;

              // Hide items that are too far away to improve performance and visuals
              if (Math.abs(normalizedOffset) > 2 && !isActive) return null;

              const xPos = isActive
                ? "0%"
                : isPast
                  ? "-120%"
                  : `calc(${normalizedOffset * 35}% + ${normalizedOffset * 15}px)`;
              const scale = isActive
                ? 1
                : Math.max(0.7, 0.85 - Math.abs(normalizedOffset) * 0.05);
              const opacity = isActive
                ? 1
                : isPast
                  ? 0
                  : Math.max(0, 0.6 - normalizedOffset * 0.15);
              let zIndex = 30 - Math.abs(normalizedOffset);
              if (isActive) zIndex = 50;

              return (
                <motion.div
                  key={dest.id}
                  initial={false}
                  animate={{
                    x: xPos,
                    scale: scale,
                    opacity: opacity,
                    zIndex: zIndex,
                    rotateY: isActive ? 0 : -12 * normalizedOffset,
                  }}
                  transition={slideTransition}
                  className="absolute left-0 w-full aspect-3/4 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing origin-center border border-white/10"
                  onClick={() => i !== activeIdx && setActiveIdx(i)}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -50) nextSlide();
                    else if (info.offset.x > 50) prevSlide();
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${dest.image})` }}
                    animate={{ scale: isActive ? 1 : 1.15 }}
                    transition={{ duration: 1.5 }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                    <motion.div
                      animate={
                        isActive ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }
                      }
                      className="flex items-center gap-2 mb-2"
                    >
                      <MapPin className="w-3 h-3 text-amber-500" />
                      <span className="text-xs uppercase tracking-widest text-amber-500 font-medium">
                        {dest.location}
                      </span>
                    </motion.div>
                    <motion.h3
                      animate={
                        isActive ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }
                      }
                      className="text-xl md:text-2xl font-bold text-white leading-tight"
                    >
                      {dest.title}
                    </motion.h3>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Centered Controls Box */}
          <div className="flex items-center gap-4">
            <button
              onClick={prevSlide}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md bg-white/5 hover:bg-white hover:text-black transition-all duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={nextSlide}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md bg-white/5 hover:bg-white hover:text-black transition-all duration-300 group"
            >
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
