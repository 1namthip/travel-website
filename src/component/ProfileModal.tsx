"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  UserRound, 
  Mail, 
  ShieldCheck, 
  LogOut, 
  Loader2, 
  Camera,
  X
} from "lucide-react";

export interface UserProfileData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  provider: string;
}

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ดึงข้อมูลเฉพาะตอนที่เปิด Modal เพื่อประหยัดการยิง API
  useEffect(() => {
    if (!isOpen) return;

    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            fullName: user.user_metadata?.full_name || "ผู้ใช้งานระบบ",
            avatarUrl: user.user_metadata?.avatar_url || "",
            role: user.app_metadata?.role || "user",
            provider: user.app_metadata?.provider || "email",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [supabase, isOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // ป้องกันการ Scroll หน้าเว็บหลักเวลาเปิด Modal
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

  if (!isOpen) return null;

  const isAdmin = user?.role === "admin";

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // ป้องกันไม่ให้ปิดเมื่อคลิกที่ตัว Modal
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-neutral-50 p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="flex min-h-100 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : !user ? (
          <div className="flex min-h-100 items-center justify-center text-neutral-500">
            ไม่พบข้อมูลผู้ใช้งาน
          </div>
        ) : (
          <>
            <div className="mb-8 pr-12">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                {isAdmin ? "การจัดการบัญชีผู้ดูแลระบบ" : "บัญชีส่วนตัว"}
              </h2>
              <p className="mt-1.5 text-sm text-neutral-500">
                จัดการข้อมูลส่วนตัวและตั้งค่าความปลอดภัยของบัญชีคุณ
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Left Column */}
              <div className="col-span-1 flex flex-col items-center rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="relative mb-5">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-neutral-50 bg-neutral-100 shadow-sm">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.fullName} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-10 w-10 text-neutral-400" />
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 rounded-full border border-neutral-200 bg-white p-2 text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 hover:text-amber-600">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                
                <h3 className="text-lg font-medium text-neutral-900">{user.fullName}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                  {isAdmin && <ShieldCheck className="h-4 w-4 text-amber-500" />}
                  <span>{isAdmin ? "Administrator" : "Standard User"}</span>
                </div>

                <button 
                  onClick={handleSignOut}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              </div>

              {/* Right Column */}
              <div className="col-span-1 space-y-6 md:col-span-2">
                <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                  <h4 className="mb-5 text-base font-medium text-neutral-900">ข้อมูลติดต่อ</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neutral-600">
                        ชื่อ-นามสกุล
                      </label>
                      <input 
                        type="text" 
                        disabled
                        defaultValue={user.fullName}
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-70"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neutral-600">
                        อีเมล
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                          <Mail className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input 
                          type="email" 
                          disabled
                          defaultValue={user.email}
                          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-11 pr-4 text-sm text-neutral-900 outline-none disabled:opacity-70"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-medium text-emerald-900">Admin Privileges</h4>
                        <p className="text-xs text-emerald-700/80">บัญชีนี้มีสิทธิ์ระดับผู้ดูแลระบบ</p>
                      </div>
                    </div>
                    <p className="leading-relaxed text-sm text-neutral-600">
                      คุณสามารถเข้าถึงการตั้งค่าระดับสูง เช่น การจัดการผู้ใช้งานระบบ, การดู Logs, และการตั้งค่าระบบผ่านเมนูจัดการหลัก
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};