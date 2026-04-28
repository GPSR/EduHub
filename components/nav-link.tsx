"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import type { MouseEvent } from "react";

const NAV_ICONS: Record<string, string> = {
  "/home":               "🏠",
  "/dashboard":          "◈",
  "/students":           "👥",
  "/fees":               "💳",
  "/feed":               "📢",
  "/attendance":         "✅",
  "/timetable":          "🗓️",
  "/academics":          "📚",
  "/learning-center":    "🧠",
  "/youtube-learning":   "▶️",
  "/calendar":           "🗓️",
  "/leave-requests":     "📝",
  "/gallery":            "🖼️",
  "/support":            "💬",
  "/transport":          "🚌",
  "/reports":            "📊",
  "/notifications":      "🔔",
  "/profile":            "👤",
  "/admin/users":        "🛡",
  "/admin/settings":     "⚙️",
  "/admin/teacher-salary":"💼",
  "/admin/approvals":    "✓",
  "/admin/audit":        "🔍",
  "/requests":           "📋",
};

export function NavLink({
  href,
  label,
  icon,
  badgeCount,
  profileFallbackHref = "/dashboard"
}: {
  href: string;
  label: string;
  icon?: string;
  badgeCount?: number;
  profileFallbackHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const emoji = icon ?? NAV_ICONS[href] ?? "•";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (href !== "/profile" || !active) return;
    event.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(profileFallbackHref);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={clsx(
        "flex items-center justify-between gap-2.5 rounded-[12px] px-3 py-2 text-[13.5px] font-medium transition-all duration-150 border",
        active
          ? "bg-gradient-to-r from-blue-500/[0.22] to-cyan-400/[0.18] text-white border-blue-300/40 shadow-[0_12px_24px_-20px_rgba(79,141,253,0.95)]"
          : "text-white/78 border-white/[0.05] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.14]"
      )}
    >
      <span className="inline-flex items-center gap-2.5">
        <span className="text-base leading-none w-5 text-center opacity-80">{emoji}</span>
        <span>{label}</span>
      </span>
      {badgeCount && badgeCount > 0 && !(href === "/feed" && active) ? (
        <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}
