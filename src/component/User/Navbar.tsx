"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  Menu,
  X,
  Loader2,
  LogOut,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { ProfileModal } from "../ProfileModal";

const navItems = [
  { name: "หน้าแรก", href: "/dashboard" },
  { name: "สถานที่ท่องเที่ยว", href: "/destinations" },
  { name: "ของกิน", href: "/restaurant" },
  { name: "ที่พัก", href: "/accommodations" },
  { name: "คอลเลคชั่น", href: "/favorites" },
  { name: "ทริปเที่ยวของฉัน", href: "/trips" }
];

// ─── Pages ที่มี hero เข้ม (เริ่มต้นด้วย glass mode) ─────────────────────────
const HERO_PAGES = [
  "/",
  "/dashboard",
  "/destinations",
  "/restaurant",
  "/accommodations",
  "/favorites",
  "/trips",
];

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // ─── Auth State ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ตรวจสอบว่าหน้านี้มี hero สีเข้มไหม
  const hasHero = HERO_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  // ตัดสินใจ theme: glass = บน hero ยังไม่ scroll | solid = scroll แล้ว หรือหน้าที่ไม่มี hero
  const isGlass = hasHero && !scrolled;

  // ─── Extract User Metadata ─────────────────────────────────────────────────
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* ── Navbar bar ──────────────────────────────────────────────────── */}
        <div
          className={`
            mx-auto transition-all duration-300 ease-out
            ${scrolled ? "max-w-full px-0 pt-0" : "max-w-7xl px-4 pt-4"}
          `}
        >
          <div
            className={`
              flex h-14 items-center justify-between px-4 transition-all duration-300 ease-out lg:px-6
              ${
                scrolled
                  ? "rounded-none border-b border-neutral-200/80 bg-white shadow-sm"
                  : "rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-2xl"
              }
            `}
          >
            {/* ── Logo ──────────────────────────────────────────────────── */}
            <Link href="/" className="group flex shrink-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
                <Image
                  src="/images/logo-travel.png"
                  alt="เที่ยวตามงบโคราช"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>

              <div className="hidden sm:flex flex-col leading-tight">
                <span
                  className={`text-base font-bold tracking-wide transition-colors duration-300 ${
                    isGlass ? "text-white" : "text-neutral-800"
                  }`}
                >
                  เที่ยวตามงบ<span className="text-amber-400">โคราช</span>
                </span>
              </div>
            </Link>

            {/* ── Desktop menu ───────────────────────────────────────────── */}
            <ul className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");

                return (
                  <li key={item.name} className="relative">
                    <Link
                      href={item.href}
                      className={`
                        relative flex items-center gap-1 rounded-full px-3.5
                        py-2 text-sm font-medium
                        transition-all duration-200
                        ${
                          isGlass
                            ? isActive
                              ? "text-white"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                            : isActive
                              ? "text-neutral-900"
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        }
                      `}
                    >
                      {item.name}
                      {isActive && (
                        <motion.span
                          layoutId="navbar-pill"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                          className={`
                            absolute inset-0 -z-10 rounded-full
                            ${
                              isGlass
                                ? "border border-white/20 bg-white/15"
                                : "bg-neutral-100"
                            }
                          `}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* ── Right actions ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                type="button"
                aria-label="ค้นหา"
                className={`
                  hidden h-9 w-9 items-center
                  justify-center rounded-full transition-all
                  duration-200 sm:flex
                  ${
                    isGlass
                      ? "border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                      : "border border-transparent bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
                  }
                `}
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Auth capsule */}
              <div
                className={`
                  flex items-center gap-2.5 rounded-full px-2
                  py-1.5 transition-all duration-200
                  ${
                    isGlass
                      ? "border border-white/20 bg-white/10 hover:bg-white/15"
                      : "border border-neutral-200 bg-neutral-100 hover:bg-neutral-200"
                  }
                `}
              >
                {/* Mobile hamburger */}
                <button
                  type="button"
                  aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
                  onClick={() => setMobileOpen((v) => !v)}
                  className={`
                    transition-colors duration-200 lg:hidden
                    ${
                      isGlass
                        ? "text-white/80 hover:text-white"
                        : "text-neutral-500 hover:text-neutral-800"
                    }
                  `}
                >
                  {mobileOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </button>

                {/* Divider — mobile only */}
                <div
                  className={`h-4 w-px lg:hidden ${
                    isGlass ? "bg-white/20" : "bg-neutral-300"
                  }`}
                />

                {/* Auth */}
                {loading ? (
                  <div className="flex h-7 w-7 items-center justify-center">
                    <Loader2
                      className={`h-4 w-4 animate-spin ${
                        isGlass ? "text-white" : "text-neutral-400"
                      }`}
                    />
                  </div>
                ) : user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`
                        flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border text-xs font-bold uppercase transition-colors
                        ${
                          isGlass
                            ? "border-transparent bg-white text-amber-700 hover:border-amber-300"
                            : "border-transparent bg-amber-100 text-amber-800 hover:border-amber-300"
                        }
                      `}
                    >
                      {avatarUrl ? (
                        <Image
                        height={40}
                          width={40}
                          src={avatarUrl}
                          alt={fullName || "User Avatar"}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.email?.charAt(0) || "U"
                      )}
                    </button>

                    {/* Desktop User Dropdown */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-3 hidden w-56 rounded-2xl border border-neutral-100 bg-white py-2 shadow-lg lg:block"
                        >
                          <div className="mb-1 border-b border-neutral-100 px-4 py-2">
                            <p className="text-xs font-medium text-neutral-400">
                              เข้าสู่ระบบด้วย
                            </p>
                            {fullName && (
                              <p className="truncate text-sm font-semibold text-neutral-800">
                                {fullName}
                              </p>
                            )}
                            <p
                              className={`truncate text-sm text-neutral-600 ${
                                !fullName && "font-semibold text-neutral-800"
                              }`}
                            >
                              {user.email}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              setIsProfileModalOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-amber-600"
                          >
                            <UserRound className="h-4 w-4" /> โปรไฟล์
                          </button>
                          <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" /> ออกจากระบบ
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href="/sign-in"
                    className={`
                      px-1 text-sm font-semibold transition-colors duration-200
                      ${
                        isGlass
                          ? "text-white hover:text-amber-300"
                          : "text-neutral-700 hover:text-amber-500"
                      }
                    `}
                  >
                    เข้าสู่ระบบ
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        <ProfileModal
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                      />
      </motion.nav>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-72 flex-col bg-white shadow-xl lg:hidden"
            >
              {/* Drawer header */}
              <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
                    <Compass className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-neutral-800">
                    เที่ยวตาม<span className="text-amber-400">งบ</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="ปิดเมนู"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {navItems.map((item, i) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                    return (
                      <motion.li
                        key={item.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.1 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`
                            flex items-center justify-between rounded-xl px-4
                            py-3 text-sm font-medium
                            transition-all duration-150
                            ${
                              isActive
                                ? "bg-amber-50 text-amber-700"
                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                            }
                          `}
                        >
                          <span>{item.name}</span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Drawer footer (Auth) */}
              <div className="border-t border-neutral-100 bg-neutral-50/50 p-4">
                {loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                      {avatarUrl ? (
                        <Image
                          width={40}
                          height={40}
                          src={avatarUrl}
                          alt="Profile"
                          className="h-10 w-10 shrink-0 rounded-full border border-neutral-100 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold uppercase text-amber-800">
                          {user.email?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-[11px] font-medium text-neutral-400">
                          เข้าสู่ระบบแล้ว
                        </p>
                        {fullName && (
                          <p className="truncate text-sm font-semibold text-neutral-800">
                            {fullName}
                          </p>
                        )}
                        <p className="truncate text-xs text-neutral-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-500"
                  >
                    เข้าสู่ระบบ / สมัครสมาชิก
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
