"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ICONS: Record<string, string> = {
  "/dashboard":          "◈",
  "/students":           "👥",
  "/fees":               "💳",
  "/feed":               "📢",
  "/attendance":         "✅",
  "/academics":          "📚",
  "/reports":            "📊",
  "/notifications":      "🔔",
  "/profile":            "👤",
  "/admin/users":        "🛡",
  "/admin/settings":     "⚙️",
  "/admin/approvals":    "✓",
  "/admin/audit":        "🔍",
  "/requests":           "📋",
};

export function NavLink({
  href,
  label,
  icon,
  badgeCount
}: {
  href: string;
  label: string;
  icon?: string;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const emoji = icon ?? NAV_ICONS[href] ?? "•";

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-between gap-2.5 rounded-[11px] px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
        active
          ? "bg-indigo-500/[0.18] text-white border border-indigo-400/20"
          : "text-white/60 hover:text-white/90 hover:bg-white/[0.06] border border-transparent"
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
