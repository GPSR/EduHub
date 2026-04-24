"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string; activeStartsWith?: boolean };

const ICONS: Record<string, string> = {
  "/dashboard":                "◈",
  "/students":                 "👥",
  "/fees":                     "💳",
  "/feed":                     "📢",
  "/attendance":               "✅",
  "/academics":                "📚",
  "/notifications":            "🔔",
  "/transport":                "🚌",
  "/reports":                  "📊",
  "/admin/users":              "🛡",
  "/admin/settings":           "⚙️",
  "/profile":                  "👤",
  "/requests/student-profile": "📝",
};

function isActive(pathname: string, item: NavItem) {
  return item.activeStartsWith
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : pathname === item.href;
}

export function MobileNav({
  userName, userEmail, items, moreItems, unreadCount = 0, feedUnreadCount = 0,
}: {
  role: string; userName: string; userEmail: string;
  items: NavItem[]; moreItems: NavItem[];
  unreadCount?: number; feedUnreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
    setShowUserInfo(false);
  }, [pathname]);

  // Allow top-header profile button to open this menu.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("eduhub:open-mobile-menu", onOpen);
    return () => window.removeEventListener("eduhub:open-mobile-menu", onOpen);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (open) {
      const current = Number(body.dataset.scrollLockCount ?? "0");
      body.dataset.scrollLockCount = String(current + 1);
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      return () => {
        const next = Math.max(0, Number(body.dataset.scrollLockCount ?? "1") - 1);
        body.dataset.scrollLockCount = String(next);
        if (next === 0) {
          html.style.overflow = "";
          body.style.overflow = "";
        }
      };
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (open) setShowUserInfo(false);
  }, [open]);

  const tabItems   = items.slice(0, 5);
  const allMore    = [...items.slice(5), ...moreItems];
  const moreActive = !open && allMore.some(i => isActive(pathname, i));
  const initials   = userName.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();

  function getBadge(href: string) {
    if (href === "/notifications" && unreadCount > 0) return unreadCount;
    if (href === "/feed" && feedUnreadCount > 0) return feedUnreadCount;
    return 0;
  }

  return (
    <>
      {/* ── Bottom sheet drawer ──────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm no-tap-scale"
          />

          {/* Sheet */}
          <div className="relative animate-slide-up rounded-t-[28px] border-t border-white/10
                          bg-[#242526]/98 backdrop-blur-2xl overflow-hidden
                          shadow-[0_-24px_60px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

            {/* Handle */}
            <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20" />

            {/* User row */}
            <div className="px-5 py-4 border-b border-white/[0.10]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 shrink-0 rounded-[13px] bg-gradient-to-b from-blue-400 to-blue-600
                                  flex items-center justify-center text-sm font-bold text-white shadow">
                    {initials}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserInfo(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#3a3b3c] px-3 py-1.5 text-[12px] font-semibold text-white/85 transition hover:bg-white/[0.18]"
                  >
                    {showUserInfo ? "Hide info" : "Show info"}
                    <span className="text-[10px]">{showUserInfo ? "▲" : "▼"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form action="/logout" method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rose-500/30 bg-rose-500/[0.18] px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/[0.28]"
                    >
                      ↗ Sign out
                    </button>
                  </form>
                  <button onClick={() => setOpen(false)}
                    className="p-2 rounded-[10px] bg-[#3a3b3c] border border-white/[0.10]
                               text-white/55 hover:text-white/90 active:bg-white/[0.18] transition">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {showUserInfo && (
                <div className="mt-3 rounded-[12px] border border-white/[0.10] bg-[#3a3b3c] px-3 py-2.5">
                  <p className="text-[14px] font-semibold text-white/95 truncate">{userName}</p>
                  <p className="text-[12px] text-white/45 truncate">{userEmail}</p>
                </div>
              )}
            </div>

            {/* Nav grid */}
            <div className="px-4 py-4 grid grid-cols-4 gap-2">
              {/* Profile */}
              <Link href="/profile"
                className={clsx(
                  "col-span-4 flex items-center gap-3 rounded-[14px] border px-4 py-3.5 transition",
                  pathname.startsWith("/profile")
                    ? "border-blue-400/40 bg-blue-500/20 text-white"
                    : "border-white/[0.10] bg-[#3a3b3c] text-white/80 active:bg-white/[0.18]"
                )}>
                <span className="text-xl">👤</span>
                <span className="text-[14px] font-semibold">Profile & Settings</span>
              </Link>

              {/* All nav items */}
              {[...items, ...moreItems].map(item => {
                const badge = getBadge(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={clsx(
                      "flex flex-col items-center gap-2 rounded-[14px] border py-4 px-1 transition relative",
                      isActive(pathname, item)
                        ? "border-blue-400/40 bg-blue-500/[0.20] text-white"
                        : "border-white/[0.10] bg-[#3a3b3c] text-white/75 active:bg-white/[0.18]"
                    )}>
                    <span className="text-[22px] leading-none relative">
                      {ICONS[item.href] ?? "•"}
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full
                                         bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ── Bottom tab bar ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                      border-t border-white/[0.10] bg-[#242526]/98 backdrop-blur-2xl">
        <div className="grid pt-2"
          style={{
            gridTemplateColumns: `repeat(${tabItems.length + 1}, 1fr)`,
            paddingBottom: "max(0.6rem, env(safe-area-inset-bottom, 0.6rem))",
          }}>

          {tabItems.map(item => {
            const active = isActive(pathname, item);
            const badge  = getBadge(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 py-1.5 px-1 mx-0.5 rounded-[10px] transition-all",
                  active ? "text-white" : "text-white/55 active:text-white/90"
                )}>
                {/* Active pill indicator */}
                {active && (
                  <span className="absolute h-0.5 w-6 rounded-full bg-blue-400 -top-0.5 left-1/2 -translate-x-1/2" />
                )}
                <span className="relative text-[21px] leading-none">
                  {ICONS[item.href] ?? "•"}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] rounded-full
                                     bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className={clsx(
                  "text-[10px] font-semibold truncate w-full text-center",
                  active ? "text-white" : "text-white/55"
                )}>{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button onClick={() => setOpen(v => !v)}
            className={clsx(
              "flex flex-col items-center gap-0.5 py-1.5 px-1 mx-0.5 rounded-[10px] transition-all",
              (open || moreActive) ? "text-white" : "text-white/55 active:text-white/90"
            )}>
            <span className="text-[21px] leading-none">{open ? "✕" : moreActive ? "●" : "⋯"}</span>
            <span className={clsx(
              "text-[10px] font-semibold",
              (open || moreActive) ? "text-white" : "text-white/55"
            )}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
