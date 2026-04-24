"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function PlatformUserMenu({
  name,
  email,
  photoUrl
}: {
  name: string;
  email: string;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const avatar = useMemo(() => initials(name), [name]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && event.target instanceof Node && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative hidden md:block" ref={panelRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "flex items-center gap-2.5 rounded-[13px] border px-3 py-2 transition-all",
          open
            ? "border-blue-300/45 bg-gradient-to-r from-blue-500/[0.24] to-cyan-400/[0.18]"
            : "border-white/[0.12] bg-[#101a2d]/88 hover:bg-[#17253d] hover:border-white/[0.22]"
        )}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            width={32}
            height={32}
            className="h-8 w-8 rounded-[10px] object-cover border border-white/[0.12]"
          />
        ) : (
          <div
            className="grid h-8 w-8 place-items-center rounded-[10px]
                       bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-xs font-bold text-white shadow-sm"
          >
            {avatar}
          </div>
        )}
        <div className="max-w-[140px] text-left">
          <div className="truncate text-[13px] font-semibold leading-tight text-white/90">{name}</div>
          <div className="truncate text-[11px] leading-tight text-white/45">{email}</div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={clsx("text-white/35 transition-transform", open && "rotate-180")}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[90] mt-2 w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[16px]
                     border border-white/[0.12] bg-[#111a2d]/95
                     shadow-[0_18px_50px_-18px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.08)]
                     animate-fade-up"
          style={{ animationDuration: "0.15s" }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.10] px-3.5 py-3">
            <div className="min-w-0">
              <div className="mb-0.5 text-[12px] font-medium text-white/40">Signed in as</div>
              <div className="break-words text-[13px] font-semibold text-white/85">{email}</div>
            </div>
            <form action="/platform/logout" method="post" className="shrink-0">
              <button
                type="submit"
                role="menuitem"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-rose-500/25 bg-rose-500/[0.10] px-2.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/[0.20]"
              >
                ↗ Sign out
              </button>
            </form>
          </div>

          <Link
            role="menuitem"
            href="/platform/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/82 transition hover:bg-white/[0.09] hover:text-white"
          >
            <span>👤</span>
            Profile settings
          </Link>
        </div>
      )}
    </div>
  );
}
