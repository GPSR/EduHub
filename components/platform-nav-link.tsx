"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function PlatformNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/platform" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={clsx(
        "text-sm rounded-xl px-3 py-1.5 border transition font-medium tracking-tight",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/35",
        active
          ? "text-white border-indigo-300/35 bg-gradient-to-b from-indigo-400/25 to-indigo-500/10 shadow-[0_8px_24px_-16px_rgba(129,140,248,0.8)]"
          : "text-white/70 border-transparent hover:text-white hover:border-white/10 hover:bg-white/5"
      )}
    >
      {label}
    </Link>
  );
}
