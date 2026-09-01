"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  X,
  Image as ImageIcon,
  Loader2,
  Building2,
  DollarSign,
  FileText,
  MapPin,
  Phone,
  ChevronDown,
  Check,
  AlertCircle,
  Trash2,
  Play
} from "lucide-react";
import {
  MAX_IMAGES,
  MAX_VIDEOS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  splitMedia,
  isImageFile,
  isVideoFile,
} from "@/lib/media";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  price_range: string;
  min_price: number | null;
  max_price: number | null;
  category: string;
  contact_phone: string;
  contact_line: string;
  contact_facebook: string;
  images: string[] | null;
  created_by: string;
  created_at: string;
}

interface AddAccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAccommodation?: Accommodation | null;
}

export const AddAccommodationModal = ({
  isOpen,
  onClose,
  onSuccess,
  editAccommodation,
}: AddAccommodationModalProps) => {
  // ─── Supabase Auth ─────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (isOpen) {
      const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      };
      fetchUser();
    }
  }, [isOpen, supabase.auth]);

  // ─── Form States ───────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    min_price: "",
    max_price: "",
    category: "หอพัก",
    contact_phone: "",
    contact_line: "",
    contact_facebook: "",
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Custom Dropdown Active Toggle States
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle outside click triggers to fold custom select popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Initialize form configuration state on edit trigger
  useEffect(() => {
    if (editAccommodation) {
      setFormData({
        name: editAccommodation.name,
        description: editAccommodation.description || "",
        address: editAccommodation.address || "",
        min_price: editAccommodation.min_price ? editAccommodation.min_price.toString() : "",
        max_price: editAccommodation.max_price ? editAccommodation.max_price.toString() : "",
        category: editAccommodation.category,
        contact_phone: editAccommodation.contact_phone || "",
        contact_line: editAccommodation.contact_line || "",
        contact_facebook: editAccommodation.contact_facebook || "",
      });
      const media = splitMedia(editAccommodation.images || []);
      setExistingImages(media.images);
      setExistingVideos(media.videos);
    } else {
      resetForm();
    }
  }, [editAccommodation, isOpen]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address: "",
      min_price: "",
      max_price: "",
      category: "หอพัก",
      contact_phone: "",
      contact_line: "",
      contact_facebook: "",
    });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setVideoFiles([]);
    setVideoPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setExistingVideos([]);
    setError(null);
    setIsCategoryOpen(false);
  };

  const categories = ["หอพัก", "โรงแรม", "โฮมสเตย์", "อพาร์ทเมนท์", "คอนโด", "บ้านเช่า"];

  // ─── Image Processing ───
  const processFiles = useCallback((files: File[]) => {
    const imgs = files.filter(isImageFile);
    const vids = files.filter(isVideoFile);

    if (imgs.length + vids.length < files.length) {
      setError("รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอเท่านั้น");
      return;
    }

    if (imgs.length > 0) {
      if (existingImages.length + imageFiles.length + imgs.length > MAX_IMAGES) {
        setError(`อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูปเท่านั้น`);
        return;
      }
      if (imgs.some((f) => f.size > MAX_IMAGE_BYTES)) {
        setError("แต่ละรูปต้องมีขนาดไม่เกิน 5MB");
        return;
      }
    }

    if (vids.length > 0) {
      if (existingImages.length + imageFiles.length + imgs.length === 0) {
        setError("กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูปก่อนแนบวิดีโอ");
        return;
      }
      if (existingVideos.length + videoFiles.length + vids.length > MAX_VIDEOS) {
        setError(`อัปโหลดวิดีโอได้สูงสุด ${MAX_VIDEOS} คลิปเท่านั้น`);
        return;
      }
      if (vids.some((f) => f.size > MAX_VIDEO_BYTES)) {
        setError("แต่ละวิดีโอต้องมีขนาดไม่เกิน 50MB");
        return;
      }
    }

    setError(null);

    if (imgs.length > 0) {
      setImageFiles((prev) => [...prev, ...imgs]);
      imgs.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    if (vids.length > 0) {
      setVideoFiles((prev) => [...prev, ...vids]);
      setVideoPreviews((prev) => [...prev, ...vids.map((f) => URL.createObjectURL(f))]);
    }
  }, [existingImages.length, imageFiles.length, existingVideos.length, videoFiles.length]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewVideo = (index: number) => {
    setVideoPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setVideoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index: number) => {
    setExistingVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: fd });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "การอัปโหลดไฟล์ล้มเหลว");
      }
      const data = await response.json();
      uploadedUrls.push(data.url);
    }
    return uploadedUrls;
  };

  const uploadMedia = async (): Promise<{ images: string[]; videos: string[] }> => {
    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return { images: [], videos: [] };
    }
    try {
      setUploading(true);
      const images = await uploadFiles(imageFiles);
      const videos = await uploadFiles(videoFiles);
      return { images, videos };
    } catch (err) {
      console.error("Upload error:", err);
      throw err instanceof Error ? err : new Error("ไม่สามารถอัปโหลดไฟล์ได้");
    } finally {
      setUploading(false);
    }
  };

  // ─── Form Submission ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("กรุณาเข้าสู่ระบบก่อนทำรายการ");
      return;
    }

    if (!formData.min_price) {
      setError("กรุณาระบุราคาเริ่มต้น");
      return;
    }

    const min = parseInt(formData.min_price);
    const max = formData.max_price ? parseInt(formData.max_price) : null;

    if (max !== null && min > max) {
      setError("ราคาเริ่มต้นต้องไม่มากกว่าราคาสูงสุด");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const uploaded = await uploadMedia();
      // เรียงรูปก่อนวิดีโอเสมอ เพื่อให้ media[0] เป็นรูปสำหรับ thumbnail หน้า list
      const allImages = [
        ...existingImages,
        ...uploaded.images,
        ...existingVideos,
        ...uploaded.videos,
      ];

      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        category: formData.category,
        contact_phone: formData.contact_phone,
        contact_line: formData.contact_line,
        contact_facebook: formData.contact_facebook,
        min_price: min,
        max_price: max,
        price_range: max ? `${min}-${max}` : `${min}+`,
        images: allImages.length > 0 ? allImages : null,
      };

      if (editAccommodation) {
        const { error: updateError } = await supabase
          .from("accommodations")
          .update(payload)
          .eq("id", editAccommodation.id);

        if (updateError) throw updateError;
        toast.success("อัปเดตข้อมูลที่พักเรียบร้อยแล้ว");
      } else {
        const { error: insertError } = await supabase
          .from("accommodations")
          .insert({
            ...payload,
            created_by: user.id,
          });

        if (insertError) throw insertError;
        toast.success("เพิ่มที่พักใหม่เรียบร้อยแล้ว");
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setError(errorMessage);
      toast.error("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const totalImages = existingImages.length + imageFiles.length;
  const totalVideos = existingVideos.length + videoFiles.length;
  const canAddMore = totalImages < MAX_IMAGES || totalVideos < MAX_VIDEOS;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
          {/* Backdrop Blur Layer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(!submitting && !uploading) ? () => { resetForm(); onClose(); } : undefined}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />

          {/* Modal Architecture Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.23, ease: "easeOut" }}
            className="relative w-full max-w-2xl bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-zinc-200/50 flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Modal Sub-Header Node */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white z-10 shrink-0">
              <div>
                <h2 className="text-[16px] font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                  <Building2 size={16} className="text-zinc-500" />
                  {editAccommodation ? "Edit Accommodation" : "Create New Listing"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {editAccommodation ? "แก้ไขข้อมูลรายชื่อห้องพัก/หอพักหลังบ้าน" : "เพิ่มและจัดส่งข้อมูลรายชื่อหอพักใหม่เข้าสู่ระบบ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); onClose(); }}
                disabled={submitting || uploading}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Scrollable Form Deck */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
              <form id="accommodation-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Dynamic Warning Error Bar */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-xs font-medium border border-red-200/60 flex items-center gap-2"
                    >
                      <AlertCircle size={14} className="shrink-0 text-red-500" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* MODULE LAYER: MEDIA MANAGEMENT DECK */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-zinc-700">
                    รูปภาพ / วิดีโอที่พักประกอบการตัดสินใจ{" "}
                    <span className="text-zinc-400 font-normal">
                      ({totalImages}/{MAX_IMAGES} รูป · {totalVideos}/{MAX_VIDEOS} วิดีโอ)
                    </span>
                  </label>

                  {/* Grid Assets Stream */}
                  {(existingImages.length > 0 ||
                    imagePreviews.length > 0 ||
                    existingVideos.length > 0 ||
                    videoPreviews.length > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-2">
                      {existingImages.map((image, index) => (
                        <div key={`existing-img-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
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

                  {/* Dropzone Controller */}
                  {canAddMore && (
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center w-full min-h-35 p-4 transition-all border border-dashed rounded-lg cursor-pointer
                        ${isDragging ? "border-zinc-500 bg-zinc-100/70" : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"}`}
                    >
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleImageChange} className="hidden" />
                      <div className="p-2 bg-white shadow-sm border border-zinc-200/80 rounded-md text-zinc-400 mb-2">
                        <ImageIcon size={18} strokeWidth={1.8} />
                      </div>
                      <p className="text-xs font-medium text-zinc-900">
                        คลิกเพื่อเลือกไฟล์ <span className="font-normal text-zinc-400">หรือลากไฟล์มาวางที่นี่</span>
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        รูป JPG/PNG/WEBP ≤ 5MB · วิดีโอ MP4/WEBM ≤ 50MB (สูงสุด {MAX_VIDEOS} คลิป) · ต้องมีรูปอย่างน้อย 1 รูปก่อนแนบวิดีโอ
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-zinc-100" />

                {/* MODULE LAYER: GENERAL META INPUT FIELDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700 flex items-center gap-1">
                      <FileText size={13} className="text-zinc-400" /> ชื่อที่พัก <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="ระบุชื่อหอพัก หรือชื่อโครงการที่พัก"
                    />
                  </div>

                  {/* CUSTOM PREMIUM DROPDOWN ENGINE */}
                  <div className="md:col-span-1 space-y-1.5" ref={dropdownRef}>
                    <label className="text-[13px] font-medium text-zinc-700">ประเภทที่พัก</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className={`w-full pl-3 pr-3 py-2 text-sm border rounded-lg bg-white transition-all flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 ${
                          isCategoryOpen ? "border-zinc-400 ring-4 ring-zinc-900/5" : "border-zinc-200 hover:border-zinc-300"
                        } text-zinc-900`}
                      >
                        <span>{formData.category}</span>
                        <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isCategoryOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {isCategoryOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.13 }}
                            className="absolute synchronized-dropdown z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-[0_12px_30px_-10px_rgba(0,0,0,0.1)] py-1 overflow-hidden"
                          >
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                              {categories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, category: cat });
                                    setIsCategoryOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 flex items-center justify-between transition-colors group text-zinc-700 hover:text-zinc-900"
                                >
                                  <span>{cat}</span>
                                  {formData.category === cat && <Check size={12} className="text-zinc-900 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700">รายละเอียดเพิ่มเติม</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400 resize-none leading-relaxed"
                      placeholder="ระบุสิ่งอำนวยความสะดวก รายละเอียดค่าน้ำ/ค่าไฟ หรือจุดเด่นของโครงการ..."
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700 flex items-center gap-1">
                      <MapPin size={13} className="text-zinc-400" /> ที่อยู่ตำแหน่งพิกัด
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="บ้านเลขที่, ซอย, ถนน, ตำบล, อำเภอ..."
                    />
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* MODULE LAYER: PRICING LOG deck */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700 flex items-center gap-0.5">
                      <DollarSign size={13} className="text-zinc-400" /> ราคาเริ่มต้น <span className="text-zinc-400 font-normal">(บาท)</span> <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.min_price}
                      onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700">ราคาสูงสุด <span className="text-zinc-400 font-normal">(บาท / ไม่บังคับ)</span></label>
                    <input
                      type="number"
                      value={formData.max_price}
                      onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* MODULE LAYER: CONTACT MATRIX DECK */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700 flex items-center gap-1">
                      <Phone size={13} className="text-zinc-400" /> เบอร์โทรติดต่อ
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="08X-XXX-XXXX"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700">LINE ID</label>
                    <input
                      type="text"
                      value={formData.contact_line}
                      onChange={(e) => setFormData({ ...formData, contact_line: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="@lineid"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-zinc-700">Facebook</label>
                    <input
                      type="text"
                      value={formData.contact_facebook}
                      onChange={(e) => setFormData({ ...formData, contact_facebook: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                      placeholder="ชื่อเพจ หรือลิงก์โฮมเพจ"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer / Actions Menu Console */}
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => { resetForm(); onClose(); }}
                disabled={submitting || uploading}
                className="px-4 py-2 text-[13px] font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                form="accommodation-form"
                type="submit"
                disabled={submitting || uploading}
                className="px-4 py-2 text-[13px] font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 shadow-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center min-w-30"
              >
                {uploading || submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-zinc-400" />
                    {uploading ? "กำลังอัปโหลดรูป..." : "กำลังบันทึก..."}
                  </span>
                ) : editAccommodation ? (
                  "บันทึกการเปลี่ยนแปลง"
                ) : (
                  "สร้างรายการที่พัก"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};