// src/lib/media.ts
//
// ค่าคงที่และ helper สำหรับสื่อ (รูปภาพ + วิดีโอ) ที่ใช้ร่วมกันทั้งฟอร์มแอดมินและแกลเลอรี
// วิดีโอถูกเก็บ URL ปนอยู่ใน array เดียวกับรูป (ต่อท้ายรูปเสมอ) แล้วแยกประเภทตอนแสดงผลด้วยนามสกุลไฟล์

export const MAX_IMAGES = 15;
export const MAX_VIDEOS = 3;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

/** เดาจากนามสกุลไฟล์ว่า URL นี้เป็นวิดีโอหรือไม่ (ตัด query string / hash ออกก่อน) */
export function isVideoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.split(/[?#]/)[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

/** แยก array สื่อรวมออกเป็นรูปและวิดีโอ โดยคงลำดับเดิมของแต่ละกลุ่มไว้ */
export function splitMedia(urls: string[] | null | undefined): {
  images: string[];
  videos: string[];
} {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const images: string[] = [];
  const videos: string[] = [];
  for (const url of list) {
    (isVideoUrl(url) ? videos : images).push(url);
  }
  return { images, videos };
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
