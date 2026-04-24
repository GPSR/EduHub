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
        "flex items-center gap-2.5 rounded-[12px] border px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/35",
        active
          ? "bg-gradient-to-r from-blue-500/[0.22] to-cyan-400/[0.18] text-white border-blue-300/40 shadow-[0_12px_24px_-20px_rgba(79,141,253,0.95)]"
          : "text-white/78 border-white/[0.05] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.14]"
      )}
    >
      <span className="w-5 text-center text-base leading-none opacity-80">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
