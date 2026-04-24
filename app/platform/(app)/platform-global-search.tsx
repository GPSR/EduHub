"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SchoolSuggestion = {
  id: string;
  name: string;
  slug: string;
};

type UserSuggestion = {
  id: string;
  name: string;
  email: string;
  schoolId: string;
};

type SuggestionItem = {
  key: string;
  value: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "school" | "user";
};

export function PlatformGlobalSearch({
  initialQuery,
  schools,
  users
}: {
  initialQuery: string;
  schools: SchoolSuggestion[];
  users: UserSuggestion[];
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (e.target instanceof Node && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocDown);
    return () => window.removeEventListener("mousedown", onDocDown);
  }, []);

  const normalized = query.trim().toLowerCase();
  const suggestions = useMemo<SuggestionItem[]>(() => {
    if (!normalized) return [];

    const schoolItems = schools
      .filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(normalized))
      .slice(0, 6)
      .map((s) => ({
        key: `school-${s.id}`,
        value: s.name,
        title: s.name,
        subtitle: s.slug,
        href: `/platform/schools/${s.id}`,
        kind: "school" as const
      }));

    const userItems = users
      .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(normalized))
      .slice(0, 6)
      .map((u) => ({
        key: `user-${u.id}`,
        value: u.email,
        title: u.name,
        subtitle: u.email,
        href: `/platform/schools/${u.schoolId}#school-admin-${u.id}`,
        kind: "user" as const
      }));

    return [...schoolItems, ...userItems].slice(0, 10);
  }, [normalized, schools, users]);

  const submitSearch = (value: string) => {
    const q = value.trim();
    router.push(q ? `/platform?q=${encodeURIComponent(q)}` : "/platform");
    setOpen(false);
  };

  return (
    <div className="space-y-2" ref={boxRef}>
      <label className="text-[12px] font-medium text-white/70">Global Search (schools + school admins)</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          name="q"
          value={query}
          autoComplete="off"
          placeholder="Search schools or school admins"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSearch(query);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className="w-full rounded-full bg-[#3a3b3c] border border-white/10 pl-10 pr-4 py-2.5 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition text-sm"
        />

        {open && normalized && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[16px] border border-white/[0.12] bg-[#242526]/98 backdrop-blur-2xl shadow-[0_16px_50px_-20px_rgba(0,0,0,0.8)]">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(item.value);
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-white/[0.06] transition border-b last:border-b-0 border-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="text-white/90 truncate">{item.title}</div>
                    <div className="text-xs text-white/45 truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                    {item.kind}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3.5 py-3 text-xs text-white/50">
                No matching suggestions. Press Enter to search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
