"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authRateLimit } from "@/lib/rate-limit";

// Utility สำหรับสร้าง Supabase Client ที่รองรับ Cookies
export const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ข้ามกรณีเรียกใช้จาก Server Component
          }
        },
      },
    }
  );
};

export const signUpAction = async (formData: FormData) => {
  const ip = "client-ip"; // ใน Next.js 15+ ใช้ headers().get("x-forwarded-for") 
  const { success } = await authRateLimit.limit(`signup_${ip}`);
  
  if (!success) return { error: "คำขอมากเกินไป กรุณารอสักครู่" };

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = ((formData.get("full_name") as string) ?? "").trim();
  const supabase = await createClient();

  if (!fullName) return { error: "กรุณากรอกชื่อที่จะแสดง" };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // เก็บชื่อไว้ใน user_metadata เพื่อให้ระบบรีวิว/โปรไฟล์ดึงไปแสดงได้
      data: { full_name: fullName },
    },
  });

  if (error) return { error: error.message };
  return { status: "requires_otp", email };
};

export const signInAction = async (formData: FormData) => {
  const ip = "client-ip"; 
  const { success } = await authRateLimit.limit(`login_${ip}`);
  
  if (!success) return { error: "คำขอมากเกินไป กรุณารอสักครู่" };

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Intercept: กรณีที่สมัครแล้วแต่ยังไม่ยืนยัน OTP
    if (error.message.includes("Email not confirmed")) {
      // ส่งคำสั่ง Re-send OTP ไปด้วยเลยเพื่อความสะดวก
      await supabase.auth.resend({ type: 'signup', email });
      return { status: "requires_otp", email, error: "กรุณายืนยัน OTP ก่อนเข้าสู่ระบบ" };
    }
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  return { status: "success" };
};

export const verifyOtpAction = async (email: string, token: string) => {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว", status: "error" };
  }

  return { status: "success" };
};

export const sendAuthOtpAction = async (email: string) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, 
    },
  });

  if (error) {
    return { error: error.message, status: "error" };
  }

  return { status: "requires_otp" };
};