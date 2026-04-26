"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { clsx } from "clsx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function UserMenu({ userName, userEmail, photoUrl }: { userName: string; userEmail: string; photoUrl?: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const avatar = useMemo(() => initials(userName), [userName]);
  const pathname = usePathname();
  const router = useRouter();
  const onProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");

  const handleProfileClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (!onProfilePage) return;
    event.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && e.target instanceof Node && !panelRef.current.contains(e.target))
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [open]);

  return (
    <div className="relative hidden md:block" ref={panelRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
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
            alt={userName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-[10px] object-cover border border-white/[0.12]"
          />
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-[10px]
                          bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd]
                          text-xs font-bold text-white shadow-sm">
            {avatar}
          </div>
        )}
        <div className="text-left max-w-[120px]">
          <div className="text-[13px] font-semibold text-white/90 truncate leading-tight">{userName}</div>
          <div className="text-[11px] text-white/45 truncate leading-tight">{userEmail}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={clsx("text-white/35 transition-transform", open && "rotate-180")}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[16px]
                     border border-white/[0.12] bg-[#111a2d]/95 backdrop-blur-2xl
                     shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)]
                     animate-fade-up"
          style={{ animationDuration: "0.15s" }}
        >
          <div className="px-3.5 py-3 border-b border-white/[0.10] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-white/40 font-medium mb-0.5">Signed in as</div>
              <div className="text-[13px] font-semibold text-white/85 break-all">{userEmail}</div>
            </div>
            <form action="/logout" method="post" className="shrink-0">
              <button
                type="submit"
                role="menuitem"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-rose-500/25 bg-rose-500/[0.10] px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/[0.20] transition"
              >
                ↗ Sign out
              </button>
            </form>
          </div>
          <Link
            role="menuitem"
            href="/profile"
            onClick={handleProfileClick}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/82 hover:bg-white/[0.09] hover:text-white transition"
          >
            <span>👤</span> Profile settings
          </Link>
        </div>
      )}
    </div>
  );
}
