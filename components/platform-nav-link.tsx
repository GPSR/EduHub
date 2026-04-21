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
        "text-[13px] font-medium rounded-[10px] px-3 py-1.5 transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
        active
          ? "text-white bg-indigo-500/[0.18] border border-indigo-400/25"
          : "text-white/55 border border-transparent hover:text-white/85 hover:bg-white/[0.07]"
      )}
    >
      {label}
    </Link>
  );
}
