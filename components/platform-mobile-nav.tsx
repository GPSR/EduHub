"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

type Item = { href: string; label: string; icon: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformMobileNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#060912]/95 backdrop-blur-2xl"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
    >
      <div className="mx-auto max-w-lg pt-2 grid gap-0.5 px-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-[12px] py-2 px-1 transition-all",
                active ? "bg-indigo-500/[0.18] text-white" : "text-white/40 active:text-white/70 active:bg-white/[0.06]"
              )}
            >
              <span className="text-[20px] leading-none">{item.icon}</span>
              <span className={clsx("text-[10px] font-semibold truncate max-w-full", active ? "text-white" : "text-white/40")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
