// src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Sidebar from "../../component/Admin/Sidebar";
import OnlineTracker from "@/component/OnlineTracker";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  
  // สร้าง Supabase Client สำหรับฝั่ง Server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // Layout ไม่ควร set cookie โดยตรง ปล่อยให้ Middleware/Actions จัดการ
      },
    }
  );

  // ดึงข้อมูล User ปัจจุบัน (Zero-Trust Check)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. ถ้าไม่มี User ให้เตะไปหน้า Login
  if (!user) {
    redirect("/sign-in");
  }

  // 2. ดึง Role จากตาราง profiles ให้ตรงกับ State Machine ของระบบ
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 3. หากไม่ใช่ Admin ให้เตะกลับไปหน้า Dashboard อัตโนมัติ
  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 lg:flex-row flex-col">
      <Sidebar />
      <main className="flex-1 min-w-0"><OnlineTracker />{children}</main>
    </div>
  );
}