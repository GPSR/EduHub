"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function PlatformNavLink({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/platform" && pathname.startsWith(href));
  const emoji = icon ?? "•";

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2.5 rounded-[11px] border px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border-transparent",
        active
          ? "bg-indigo-500/[0.18] text-white border-indigo-400/25"
          : "text-white/60 hover:text-white/90 hover:bg-white/[0.06]"
      )}
    >
      <span className="w-5 text-center text-base leading-none opacity-80">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
