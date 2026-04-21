"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function UserMenu({
  userName,
  userEmail
}: {
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const avatar = useMemo(() => initials(userName), [userName]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.target instanceof Node && !panel.contains(e.target)) setOpen(false);
    }
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="hidden md:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
      >
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-b from-indigo-400 to-indigo-600 text-sm font-semibold shadow-sm shadow-indigo-500/25">
          {avatar}
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold leading-tight">{userName}</div>
          <div className="text-xs text-white/60 leading-tight">{userEmail}</div>
        </div>
      </button>

      {open ? (
        <div
          role="menu"
          className={clsx(
            "hidden md:block absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]/95 backdrop-blur",
            "shadow-[0_25px_60px_-30px_rgba(0,0,0,0.8)]"
          )}
        >
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Profile
          </Link>
          <div className="h-px bg-white/10" />
          <form action="/logout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full text-left px-4 py-3 text-sm text-rose-100 hover:bg-rose-500/15"
            >
              Logout
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

