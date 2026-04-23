"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";

type NavItem = { href: string; label: string; activeStartsWith?: boolean };

const ALL_ICONS: Record<string, string> = {
  "/dashboard":       "◈",
  "/students":        "👥",
  "/fees":            "💳",
  "/feed":            "📢",
  "/attendance":      "✅",
  "/academics":       "📚",
  "/notifications":   "🔔",
  "/reports":         "📊",
  "/requests/student-profile": "📝",
  "/admin/users":     "🛡",
  "/admin/settings":  "⚙️",
  "/profile":         "👤",
};

function isActive(pathname: string, item: NavItem) {
  if (item.activeStartsWith) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

export function MobileNav({
  role, userName, userEmail, items, moreItems, unreadCount = 0, feedUnreadCount = 0,
}: {
  role: string;
  userName: string;
  userEmail: string;
  items: NavItem[];
  moreItems: NavItem[];
  unreadCount?: number;
  feedUnreadCount?: number;
}) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  // Always show 4 items + "More" tab = 5 total
  const tabItems  = items.slice(0, 4);
  const showMore  = moreItems.length > 0 || items.length > 4;
  const initials  = userName.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();
  const moreIsActive = open || [...items.slice(4), ...moreItems].some(i => isActive(pathname, i));

  return (
    <>
      {/* ── Hamburger (hidden — only bottom tab bar used) ── */}

      {/* ── Bottom sheet drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div
            className="relative rounded-t-[28px] border-t border-white/[0.10]
                        bg-[#060912]/98 backdrop-blur-2xl
                        shadow-[0_-20px_60px_rgba(0,0,0,0.7)]
                        animate-slide-up"
          >
            {/* iOS handle */}
            <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-white/20" />

            {/* User header */}
            <div className="flex items-center justify-between px-5 mb-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[13px]
                                bg-gradient-to-b from-indigo-400 to-indigo-600
                                text-sm font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-white/95">{userName}</div>
                  <div className="text-[12px] text-white/45">{userEmail}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-[10px] border border-white/[0.09] bg-white/[0.05]
                           p-2 text-white/50 hover:text-white hover:bg-white/[0.10] transition"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Nav grid */}
            <div className="px-4 grid grid-cols-4 gap-2">
              {/* Profile always first */}
              <Link href="/profile" onClick={() => setOpen(false)}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-[16px] border py-4 px-2 transition col-span-4",
                  pathname.startsWith("/profile")
                    ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                    : "border-white/[0.08] bg-white/[0.03] text-white/60 active:bg-white/[0.10]"
                )}>
                <span className="text-xl">👤</span>
                <span className="text-[12px] font-semibold">Profile & Settings</span>
              </Link>

              {/* All items */}
              {[...items, ...moreItems].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-2 rounded-[16px] border py-4 px-1 transition",
                    isActive(pathname, item)
                      ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-white/60 active:bg-white/[0.10]"
                  )}>
                  <span className="text-xl relative">
                    {ALL_ICONS[item.href] ?? "•"}
                    {item.href === "/notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500
                                       text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {item.href === "/feed" && feedUnreadCount > 0 && !isActive(pathname, item) && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500
                                       text-[9px] font-bold text-white flex items-center justify-center">
                        {feedUnreadCount > 9 ? "9+" : feedUnreadCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <div className="px-4 mt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]">
              <form action="/logout" method="post">
                <button className="w-full rounded-[14px] border border-rose-500/25 bg-rose-500/[0.10]
                                    py-3.5 text-sm font-semibold text-rose-300
                                    hover:bg-rose-500/[0.20] active:bg-rose-500/[0.25] transition">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40
                   border-t border-white/[0.08] bg-[#060912]/95 backdrop-blur-2xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
      >
        <div
          className="mx-auto max-w-lg pt-2 grid gap-0.5 px-1"
          style={{ gridTemplateColumns: `repeat(${tabItems.length + (showMore ? 1 : 0)}, 1fr)` }}
        >
          {tabItems.map(item => {
            const active = isActive(pathname, item);
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 rounded-[12px] py-2 px-1 transition-all",
                  active ? "bg-indigo-500/[0.18] text-white" : "text-white/40 active:text-white/70 active:bg-white/[0.06]"
                )}>
                <span className="text-[20px] leading-none relative">
                  {ALL_ICONS[item.href] ?? "•"}
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 h-4 w-4 rounded-full bg-rose-500
                                     text-[9px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {item.href === "/feed" && feedUnreadCount > 0 && !active && (
                    <span className="absolute -top-1 -right-2 h-4 w-4 rounded-full bg-rose-500
                                     text-[9px] font-bold text-white flex items-center justify-center">
                      {feedUnreadCount > 9 ? "9+" : feedUnreadCount}
                    </span>
                  )}
                </span>
                <span className={clsx(
                  "text-[10px] font-semibold truncate max-w-full",
                  active ? "text-white" : "text-white/40"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          {showMore && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-[12px] py-2 px-1 transition-all",
                moreIsActive ? "bg-indigo-500/[0.18] text-white" : "text-white/40 active:text-white/70 active:bg-white/[0.06]"
              )}>
              <span className="text-[20px] leading-none">
                {moreIsActive && !open ? "●" : "⋯"}
              </span>
              <span className={clsx(
                "text-[10px] font-semibold",
                moreIsActive ? "text-white" : "text-white/40"
              )}>
                More
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
