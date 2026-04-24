"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; icon: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformMobileNav({
  items,
  userName,
  userEmail,
  photoUrl,
}: {
  items: Item[];
  userName: string;
  userEmail: string;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const initials = userName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tabItems = items.slice(0, 4);
  const moreItems = items.slice(4);
  const moreActive = !open && (pathname === "/platform/profile" || moreItems.some((item) => isActive(pathname, item.href)));

  useEffect(() => {
    setOpen(false);
    setShowUserInfo(false);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (open) setShowUserInfo(false);
  }, [open]);

  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            className="relative animate-slide-up overflow-hidden rounded-t-[28px] border-t border-white/[0.10]
                       bg-[#070b16]/97 backdrop-blur-2xl shadow-[0_-24px_60px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-white/20" />

            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={userName}
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-[13px] object-cover border border-white/[0.12]"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]
                                 bg-gradient-to-b from-indigo-400 to-indigo-600 text-sm font-bold text-white shadow"
                    >
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowUserInfo((value) => !value)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/[0.09]"
                  >
                    {showUserInfo ? "Hide info" : "Show info"}
                    <span className="text-[10px]">{showUserInfo ? "▲" : "▼"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form action="/platform/logout" method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rose-500/25 bg-rose-500/[0.10] px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/[0.20]"
                    >
                      ↗ Sign out
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-[10px] border border-white/[0.08] bg-white/[0.06] p-2 text-white/40 transition hover:text-white/80 active:bg-white/[0.12]"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {showUserInfo && (
                <div className="mt-3 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                  <p className="truncate text-[14px] font-semibold text-white/95">{userName}</p>
                  <p className="truncate text-[12px] text-white/45">{userEmail}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 px-4 py-4">
              <Link
                href="/platform/profile"
                className={clsx(
                  "col-span-4 flex items-center gap-3 rounded-[14px] border px-4 py-3.5 transition",
                  pathname === "/platform/profile" || pathname.startsWith("/platform/profile/")
                    ? "border-indigo-400/30 bg-indigo-500/15 text-white"
                    : "border-white/[0.07] bg-white/[0.03] text-white/65 active:bg-white/[0.10]"
                )}
              >
                <span className="text-xl">👤</span>
                <span className="text-[14px] font-semibold">Profile & Settings</span>
              </Link>

              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex flex-col items-center gap-2 rounded-[14px] border py-4 px-1 transition",
                      active
                        ? "border-indigo-400/25 bg-indigo-500/[0.14] text-white"
                        : "border-white/[0.07] bg-white/[0.03] text-white/55 active:bg-white/[0.10]"
                    )}
                  >
                    <span className="text-[22px] leading-none">{item.icon}</span>
                    <span className="text-center text-[11px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#060912]/96 backdrop-blur-2xl">
        <div
          className="grid pt-2"
          style={{
            gridTemplateColumns: `repeat(${tabItems.length + 1}, 1fr)`,
            paddingBottom: "max(0.6rem, env(safe-area-inset-bottom, 0.6rem))",
          }}
        >
          {tabItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "mx-0.5 flex flex-col items-center gap-0.5 rounded-[10px] px-1 py-1.5 transition-all",
                  active ? "text-white" : "text-white/38 active:text-white/75"
                )}
              >
                {active && (
                  <span className="absolute -top-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-indigo-400" />
                )}
                <span className="text-[21px] leading-none">{item.icon}</span>
                <span className={clsx("w-full truncate text-center text-[10px] font-semibold", active ? "text-white" : "text-white/38")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={clsx(
              "mx-0.5 flex flex-col items-center gap-0.5 rounded-[10px] px-1 py-1.5 transition-all",
              open || moreActive ? "text-white" : "text-white/38 active:text-white/75"
            )}
          >
            <span className="text-[21px] leading-none">{open ? "✕" : moreActive ? "●" : "⋯"}</span>
            <span className={clsx("text-[10px] font-semibold", open || moreActive ? "text-white" : "text-white/38")}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
