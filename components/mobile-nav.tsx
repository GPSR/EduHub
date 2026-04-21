"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";

type NavItem = { href: string; label: string; activeStartsWith?: boolean };

function isActive(pathname: string, item: NavItem) {
  if (item.activeStartsWith) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

export function MobileNav({
  role,
  userName,
  userEmail,
  items,
  moreItems
}: {
  role: string;
  userName: string;
  userEmail: string;
  items: NavItem[];
  moreItems: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabItems = items.slice(0, 5);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="md:hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Menu
      </button>

      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute left-0 right-0 top-0 rounded-b-3xl border-b border-white/10 bg-[#0b1020]/95 backdrop-blur p-5 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">{userName}</div>
                <div className="mt-1 text-xs text-white/60">{userEmail}</div>
                <div className="mt-1 text-xs text-white/60">Role: {role}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={clsx(
                  "rounded-2xl border px-3 py-3 transition col-span-2",
                  pathname.startsWith("/profile")
                    ? "border-indigo-400/40 bg-indigo-500/15 text-white"
                    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                )}
              >
                Profile
              </Link>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "rounded-2xl border px-3 py-3 transition",
                    isActive(pathname, item)
                      ? "border-indigo-400/40 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  )}
                >
                  {item.label}
                </Link>
              ))}

              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "rounded-2xl border px-3 py-3 transition",
                    item.activeStartsWith ? pathname.startsWith(item.href) : pathname === item.href
                      ? "border-indigo-400/40 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <form action="/logout" method="post" className="mt-4">
              <button className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/15 px-3 py-3 text-sm text-rose-100 hover:bg-rose-500/20">
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b1020]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 grid grid-cols-5 gap-1 text-xs">
          {tabItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-xl px-2 py-2 text-center transition",
                isActive(pathname, item)
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
