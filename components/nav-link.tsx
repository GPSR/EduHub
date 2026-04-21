"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={clsx(
        "block rounded-xl px-3 py-2 border transition",
        active
          ? "bg-white/10 border-white/15 text-white"
          : "bg-white/0 border-transparent hover:bg-white/10 hover:border-white/10 text-white/90"
      )}
    >
      {label}
    </Link>
  );
}

