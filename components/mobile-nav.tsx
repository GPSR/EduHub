"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";

type NavItem = { href: string; label: string; activeStartsWith?: boolean };

const TAB_ICONS: Record<string, string> = {
  "/dashboard":  "◈",
  "/students":   "👥",
  "/fees":       "💳",
  "/feed":       "📢",
  "/attendance": "✅",
};
const MORE_ICONS: Record<string, string> = {
  "/academics":     "📚",
  "/notifications": "🔔",
  "/reports":       "📊",
};

function isActive(pathname: string, item: NavItem) {
  if (item.activeStartsWith) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

export function MobileNav({
  role, userName, userEmail, items, moreItems
}: {
  role: string;
  userName: string;
  userEmail: string;
  items: NavItem[];
  moreItems: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabItems = items.slice(0, 5);

  const initials = userName.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-1.5 rounded-[11px] border border-white/[0.09]
                   bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-white/75
                   hover:bg-white/[0.10] transition-all"
      >
        <span className="flex flex-col gap-[4px] w-4">
          <span className="block h-[1.5px] bg-current rounded-full" />
          <span className="block h-[1.5px] bg-current rounded-full w-3/4" />
          <span className="block h-[1.5px] bg-current rounded-full" />
        </span>
        Menu
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <div className="relative rounded-t-[28px] border-t border-white/[0.10]
                          bg-[#060912]/96 backdrop-blur-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]
                          shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">

            {/* Handle bar */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            {/* User info */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[12px]
                                bg-gradient-to-b from-indigo-400 to-indigo-600
                                text-sm font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white/90">{userName}</div>
                  <div className="text-[12px] text-white/45">{userEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[10px] border border-white/[0.09] bg-white/[0.05]
                           px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.10] transition"
              >
                Close
              </button>
            </div>

            {/* Nav grid */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex flex-col items-center gap-1.5 rounded-[14px] border px-3 py-4 transition col-span-3",
                  pathname.startsWith("/profile")
                    ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                    : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:bg-white/[0.07]"
                )}
              >
                <span className="text-lg">👤</span>
                <span className="text-[12px] font-medium">Profile</span>
              </Link>

              {items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-[14px] border px-3 py-4 transition",
                    isActive(pathname, item)
                      ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:bg-white/[0.07]"
                  )}
                >
                  <span className="text-lg">{TAB_ICONS[item.href] ?? "•"}</span>
                  <span className="text-[12px] font-medium">{item.label}</span>
                </Link>
              ))}

              {moreItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-[14px] border px-3 py-4 transition",
                    isActive(pathname, item)
                      ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:bg-white/[0.07]"
                  )}
                >
                  <span className="text-lg">{MORE_ICONS[item.href] ?? "•"}</span>
                  <span className="text-[12px] font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Logout */}
            <form action="/logout" method="post" className="mt-4">
              <button className="w-full rounded-[13px] border border-rose-500/25 bg-rose-500/[0.12]
                                  py-3 text-sm font-medium text-rose-300 hover:bg-rose-500/[0.20] transition">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                      border-t border-white/[0.08] bg-[#060912]/92 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-2
                        pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2
                        grid gap-1"
             style={{ gridTemplateColumns: `repeat(${Math.min(tabItems.length, 5)}, 1fr)` }}>
          {tabItems.map(item => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-[10px] py-2 px-1 transition-all",
                  active
                    ? "bg-indigo-500/[0.18] text-white"
                    : "text-white/45 hover:text-white/75 hover:bg-white/[0.05]"
                )}
              >
                <span className="text-[18px] leading-none">{TAB_ICONS[item.href] ?? "•"}</span>
                <span className={clsx(
                  "text-[10px] font-medium truncate max-w-full",
                  active ? "text-white" : "text-white/45"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
