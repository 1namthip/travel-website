"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Loader2, ChevronDown, Check, Trash2, Play, Phone } from "lucide-react";
import {
  MAX_IMAGES,
  MAX_VIDEOS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  splitMedia,
  isImageFile,
  isVideoFile,
} from "@/lib/media";

interface Props {
  form: any;
  setForm: (val: any) => void;
  onClose: () => void;
  refreshData: () => void;
}

const parseImages = (image: any): string[] => {
  if (!image) return [];
  if (Array.isArray(image)) return image.filter(Boolean);
  if (typeof image === "string") {
    try {
      const parsed = JSON.parse(image);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return image ? [image] : [];
  }
  return [];
};

export default function RestaurantModal({
  form,
  setForm,
  onClose,
  refreshData,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Media State — สื่อเดิมถูกแยกเป็นรูป/วิดีโอ, ไฟล์ใหม่แยกอีกสองก้อน
  const initialMedia = splitMedia(parseImages(form.image_url));
  const [existingImages, setExistingImages] = useState<string[]>(initialMedia.images);
  const [existingVideos, setExistingVideos] = useState<string[]>(initialMedia.videos);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  // Custom Dropdown State
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // เก็บกวาด object URL ของวิดีโอตอนปิด modal
  useEffect(() => {
    return () => {
      videoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle clicking outside of the custom dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = [
    "อาหารไทย",
    "อาหารฝรั่ง",
    "อาหารญี่ปุ่น",
    "อาหารเกาหลี",
    "อาหารอีสาน",
    "คาเฟ่ / กาแฟ",
    "บุฟเฟ่ต์",
    "ของหวาน / เบเกอรี่",
    "อื่น ๆ",
  ];

  const totalImages = existingImages.length + imageFiles.length;
  const totalVideos = existingVideos.length + videoFiles.length;
  const canAddMore = totalImages < MAX_IMAGES || totalVideos < MAX_VIDEOS;

  const processFiles = (incoming: File[]) => {
    const imgs = incoming.filter(isImageFile);
    const vids = incoming.filter(isVideoFile);

    if (imgs.length + vids.length < incoming.length) {
      toast.error("รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอเท่านั้น");
    }

    if (imgs.length > 0) {
      if (totalImages + imgs.length > MAX_IMAGES) {
        toast.error(`อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูป`);
        return;
      }
      if (imgs.some((f) => f.size > MAX_IMAGE_BYTES)) {
        toast.error("แต่ละรูปต้องมีขนาดไม่เกิน 5MB");
        return;
      }
    }

    if (vids.length > 0) {
      if (totalImages === 0 && imgs.length === 0) {
        toast.error("กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูปก่อนแนบวิดีโอ");
        return;
      }
      if (totalVideos + vids.length > MAX_VIDEOS) {
        toast.error(`อัปโหลดวิดีโอได้สูงสุด ${MAX_VIDEOS} คลิป`);
        return;
      }
      if (vids.some((f) => f.size > MAX_VIDEO_BYTES)) {
        toast.error("แต่ละวิดีโอต้องมีขนาดไม่เกิน 50MB");
        return;
      }
    }

    if (imgs.length > 0) {
      setImageFiles((prev) => [...prev, ...imgs]);
      imgs.forEach((f) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(f);
      });
    }

    if (vids.length > 0) {
      setVideoFiles((prev) => [...prev, ...vids]);
      setVideoPreviews((prev) => [...prev, ...vids.map((f) => URL.createObjectURL(f))]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index: number) => {
    setExistingVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewVideo = (index: number) => {
    setVideoPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setVideoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFileViaApi = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Upload failed");
    }
    const data = await res.json();
    return data.url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let newImageUrls: string[] = [];
    let newVideoUrls: string[] = [];
    try {
      for (const f of imageFiles) newImageUrls.push(await uploadFileViaApi(f));
      for (const f of videoFiles) newVideoUrls.push(await uploadFileViaApi(f));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไฟล์ไม่สำเร็จ");
      setIsSubmitting(false);
      return;
    }

    try {
      // เรียงรูปก่อนวิดีโอเสมอ เพื่อให้ media[0] เป็นรูปสำหรับ thumbnail หน้า list
      const allMedia = [
        ...existingImages,
        ...newImageUrls,
        ...existingVideos,
        ...newVideoUrls,
      ];
      const method = form.id ? "PUT" : "POST";
      const url = form.id ? `/api/restaurants/${form.id}` : "/api/restaurants";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image_url: allMedia,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success(
        form.id ? "อัปเดตข้อมูลร้านอาหารสำเร็จ" : "เพิ่มร้านอาหารใหม่สำเร็จ",
      );
      setForm({
        id: "",
        name: "",
        description: "",
        image_url: [],
        location: "",
        category: "",
        phone: "",
      });
      onClose();
      refreshData();
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) processFiles(selected);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) processFiles(dropped);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSubmitting ? onClose : undefined}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <div>
              <h2 className="text-[17px] font-semibold text-zinc-900 tracking-tight">
                {form.id ? "แก้ไขข้อมูลร้านอาหาร" : "เพิ่มร้านอาหารใหม่"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {form.id ? "แก้ไขและอัปเดตข้อมูลร้านอาหาร" : "เพิ่มข้อมูลร้านอาหารใหม่เข้าสู่ระบบ"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="restaurant-form" onSubmit={handleSubmit} className="space-y-6">

              {/* Media Upload Zone */}
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-2">
                  รูปภาพ / วิดีโอหน้าร้าน{" "}
                  <span className="text-zinc-400 font-normal">
                    ({totalImages}/{MAX_IMAGES} รูป · {totalVideos}/{MAX_VIDEOS} วิดีโอ)
                  </span>
                </label>

                {/* Grid of existing + newly selected media */}
                {(existingImages.length > 0 ||
                  imagePreviews.length > 0 ||
                  existingVideos.length > 0 ||
                  videoPreviews.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                    {existingImages.map((image, index) => (
                      <div key={`existing-img-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeExistingImage(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {imagePreviews.map((preview, index) => (
                      <div key={`new-img-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-900/10 shadow-sm bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeNewImage(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">NEW</span>
                      </div>
                    ))}
                    {existingVideos.map((video, index) => (
                      <div key={`existing-vid-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-900">
                        <video src={video} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-zinc-950/55 flex items-center justify-center">
                            <Play size={13} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeExistingVideo(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {videoPreviews.map((preview, index) => (
                      <div key={`new-vid-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-900/10 shadow-sm bg-zinc-900">
                        <video src={preview} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-zinc-950/55 flex items-center justify-center">
                            <Play size={13} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeNewVideo(index)} className="p-1.5 bg-white text-zinc-900 shadow rounded-md hover:bg-zinc-50 hover:text-red-600 transition-all scale-95 group-hover:scale-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">NEW</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone */}
                {canAddMore && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center w-full min-h-35 p-4 transition-all border border-dashed rounded-lg cursor-pointer
                      ${isDragging ? "border-zinc-500 bg-zinc-100/70" : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="p-2 bg-white shadow-sm border border-zinc-200/80 rounded-md text-zinc-400 mb-2">
                      <ImageIcon size={18} strokeWidth={1.8} />
                    </div>
                    <p className="text-xs font-medium text-zinc-900">
                      คลิกเพื่อเลือกไฟล์ <span className="font-normal text-zinc-400">หรือลากไฟล์มาวางที่นี่ (เลือกได้หลายไฟล์)</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      รูป JPG/PNG/WEBP ≤ 5MB · วิดีโอ MP4/WEBM ≤ 50MB (สูงสุด {MAX_VIDEOS} คลิป) · ต้องมีรูปอย่างน้อย 1 รูปก่อนแนบวิดีโอ
                    </p>
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-700">
                    ชื่อร้านอาหาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น The Coffee Club"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                  />
                </div>

                {/* ─── Premium Custom Dropdown ─── */}
                <div className="sm:col-span-1 space-y-1.5" ref={categoryDropdownRef}>
                  <label className="text-[13px] font-medium text-zinc-700">
                    หมวดหมู่
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className={`w-full pl-3 pr-3 py-2 text-sm border rounded-lg bg-white transition-all flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        isCategoryOpen
                          ? "border-zinc-400 ring-4 ring-zinc-900/5"
                          : "border-zinc-200 hover:border-zinc-300"
                      } ${form.category ? "text-zinc-900" : "text-zinc-400"}`}
                    >
                      <span className="truncate">{form.category || "เลือกหมวดหมู่..."}</span>
                      <ChevronDown
                        size={16}
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
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-1.5 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 overflow-hidden"
                        >
                          <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {categories.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setForm({ ...form, category: cat });
                                  setIsCategoryOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] hover:bg-zinc-50 flex items-center justify-between transition-colors group"
                              >
                                <span className={form.category === cat ? "text-zinc-900 font-medium" : "text-zinc-600 group-hover:text-zinc-900"}>
                                  {cat}
                                </span>
                                {form.category === cat && (
                                  <Check size={14} className="text-zinc-900" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-700">
                    ตำแหน่งที่ตั้ง / พิกัด
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ชั้น G สยามพารากอน, ถ.สุขุมวิท"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-700 flex items-center gap-1">
                    <Phone size={13} className="text-zinc-400" /> เบอร์โทรติดต่อ
                  </label>
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[13px] font-medium text-zinc-700">
                    คำอธิบาย / รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    placeholder="ใส่ข้อมูลเวลาเปิด-ปิด, เมนูแนะนำ, หรือจุดเด่นของร้าน..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              form="restaurant-form"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 min-w-25 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-zinc-400" />
                  กำลังบันทึก...
                </span>
              ) : form.id ? (
                "บันทึกการเปลี่ยนแปลง"
              ) : (
                "สร้างร้านอาหาร"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
