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
        "flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/30 border-transparent",
        active
          ? "bg-blue-500/[0.24] text-white border-blue-400/40"
          : "text-white/75 hover:text-white hover:bg-white/[0.10]"
      )}
    >
      <span className="w-5 text-center text-base leading-none opacity-80">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
