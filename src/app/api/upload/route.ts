import { supabaseAdmin } from "../../../lib/supabaseAdmin"; // ✅ ใช้ client ฝั่ง server
import { NextResponse } from "next/server";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/media";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอเท่านั้น" },
      { status: 400 },
    );
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return NextResponse.json(
      {
        error: isVideo
          ? `ไฟล์วิดีโอต้องมีขนาดไม่เกิน ${limitMb}MB`
          : `ไฟล์รูปภาพต้องมีขนาดไม่เกิน ${limitMb}MB`,
      },
      { status: 400 },
    );
  }

  const fileName = `${Date.now()}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  // ✅ ใช้ supabaseAdmin แทน supabase
  const { error } = await supabaseAdmin.storage
    .from("Images")
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("Images")
    .getPublicUrl(fileName);

  return NextResponse.json({
    url: publicUrl.publicUrl,
    kind: isVideo ? "video" : "image",
  });
}
