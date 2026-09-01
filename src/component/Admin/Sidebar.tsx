"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  MapPin,
  UtensilsCrossed,
  BedDouble,
  MessageSquareText,
  Mail,
  ChevronLeft,
  LogOut,
  Loader2,
  UserCog2,
  Menu,
  X,
} from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// ─── Navigation Data ──────────────────────────────────────────────────────────

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: "ภาพรวม",
    items: [
      { name: "แดชบอร์ด", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "จัดการเนื้อหา",
    items: [
      { name: "สถานที่ท่องเที่ยว", href: "/admin/destinations", icon: MapPin },
      { name: "ของกิน", href: "/admin/food", icon: UtensilsCrossed },
      { name: "ที่พัก", href: "/admin/accomodations", icon: BedDouble },
      { name: "รีวิว", href: "/admin/reviews", icon: MessageSquareText },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { name: "จัดการผู้ใช้", href: "/admin/users", icon: UserCog2 }
    ],
  },
];

// ─── Tooltip (collapsed state only) ──────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="
        pointer-events-none absolute left-[calc(100%+12px)] top-1/2
        -translate-y-1/2 z-100 whitespace-nowrap rounded-md
        bg-zinc-900 border border-zinc-900
        px-2.5 py-1 text-[12px] font-medium text-white
        shadow-lg
        opacity-0 invisible -translate-x-2
        group-hover:opacity-100 group-hover:visible group-hover:translate-x-0
        transition-all duration-200
      "
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const displayName = user?.email?.split("@")[0] ?? "ผู้ดูแลระบบ";
  const avatarInitial = (user?.email?.charAt(0) ?? "A").toUpperCase();

  return (
    <>
      {/* ── Mobile Header ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="เปิดเมนู"
          className="
            flex h-9 w-9 items-center justify-center rounded-lg
            border border-zinc-200 text-zinc-500
            transition-colors hover:bg-zinc-100 hover:text-zinc-900
          "
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 ring-1 ring-pink-200">
            <Image
              src="/images/logo-travel.png"
              alt="Logo"
              width={20}
              height={20}
              className="rounded"
              priority
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            เที่ยวโคราช
          </span>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="ออกจากระบบ"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </header>

      {/* ── Mobile Backdrop ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen flex-col",
          "border-r border-zinc-200 bg-white",
          "transition-[width,transform] duration-300 ease-in-out",
          "lg:sticky lg:translate-x-0",
          collapsed ? "w-18" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Collapse button — desktop */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "ขยาย Sidebar" : "ย่อ Sidebar"}
          className="
            absolute -right-3.5 top-4.25 z-50 hidden h-7 w-7 items-center justify-center
            rounded-full border border-zinc-200 bg-white
            text-zinc-500 shadow-sm
            transition-colors hover:text-zinc-900
            lg:flex
          "
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* ── Logo / Header ──────────────────────────────────────── */}
        <div className="flex h-15 shrink-0 items-center border-b border-zinc-200 px-3.5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 px-2 w-full min-w-0"
          >
            {/* Logo */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/images/logo-travel.png"
                alt="เที่ยวตามงบโคราช"
                fill
                priority
                className="object-cover"
              />
            </div>

            {/* Wordmark */}
            <div
              className={`flex-1 overflow-hidden transition-all duration-300 ${
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}
            >
              <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
                เที่ยวตามงบ<span className="text-blue-600">โคราช</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                หน้าจัดการระบบของเว็บไซต์
              </p>
            </div>
          </Link>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          aria-label="Navigation"
        >
          <div className="space-y-4">
            {NAVIGATION_GROUPS.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                {!collapsed ? (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {group.label}
                  </p>
                ) : (
                  <div className="mx-auto mb-2 h-px w-5 rounded-full bg-zinc-200" />
                )}

                <ul className="space-y-0.5" role="list">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <li key={item.href} role="listitem">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={[
                            "group relative flex h-9 items-center rounded-lg min-w-0",
                            "outline-none transition-colors duration-150",
                            "focus-visible:ring-2 focus-visible:ring-blue-500/40",
                            collapsed ? "justify-center px-0" : "px-2.5",
                            active
                              ? "bg-pink-50 text-pink-700"
                              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                          ].join(" ")}
                        >
                          {/* Active indicator */}
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 h-4.5 w-0.5 -translate-y-1/2 rounded-r bg-pink-500"
                            />
                          )}

                          <Icon
                            aria-hidden="true"
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active
                                ? "text-pink-600"
                                : "text-zinc-400 group-hover:text-zinc-600"
                            }`}
                          />

                          {/* Text */}
                          <div
                            className={`flex items-center overflow-hidden transition-all duration-300 ${
                              collapsed ? "w-0 opacity-0" : "flex-1 w-auto opacity-100 ml-2"
                            }`}
                          >
                            <span className="truncate text-[13px] font-medium block w-full">
                              {item.name}
                            </span>
                          </div>

                          {collapsed && <Tooltip label={item.name} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ── User Panel ─────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-zinc-200 p-3">
          {loading ? (
            <div className="flex h-12 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div
              className={[
                "relative flex items-center rounded-lg min-w-0",
                "border border-zinc-200 bg-zinc-50",
                "transition-colors hover:border-zinc-300",
                collapsed ? "justify-center p-2" : "p-2",
              ].join(" ")}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-[13px] font-semibold text-zinc-600">
                  {avatarInitial}
                </div>
                <span
                  aria-label="Online"
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"
                />
              </div>

              {/* Info */}
              <div
                className={`flex items-center overflow-hidden transition-all duration-300 ${
                  collapsed ? "w-0 opacity-0" : "flex-1 w-auto opacity-100 ml-2"
                }`}
              >
                <div className="min-w-0 flex-1 overflow-hidden pr-1">
                  <p className="truncate text-[13px] font-semibold capitalize leading-none text-zinc-900">
                    {displayName}
                  </p>
                  <p className="mt-1 truncate text-[10px] uppercase leading-none tracking-[0.04em] text-zinc-400">
                    Administrator
                  </p>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  {signingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Collapsed overlay */}
              {collapsed && (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label="ออกจากระบบ"
                  className="group absolute inset-0 z-10 h-full w-full cursor-pointer rounded-lg"
                >
                  <Tooltip label="ออกจากระบบ" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
