"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

type StudentSuggestion = {
  id: string;
  fullName: string;
  studentId: string;
  admissionNo: string | null;
  rollNumber: string | null;
  classLabel: string | null;
};

type TeacherSuggestion = {
  id: string;
  name: string;
  email: string;
  roleName: string;
};

type SuggestionItem = {
  key: string;
  value: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "student" | "teacher";
};

export function DashboardGlobalSearch({
  initialQuery,
  searchPath = "/dashboard",
  students,
  teachers,
  variant = "default",
  showLabel = true,
  placeholderOverride,
  showMicIcon = false
}: {
  initialQuery: string;
  searchPath?: string;
  students: StudentSuggestion[];
  teachers: TeacherSuggestion[];
  variant?: "default" | "hero" | "heroCompact";
  showLabel?: boolean;
  placeholderOverride?: string;
  showMicIcon?: boolean;
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

    const studentItems = students
      .filter((s) =>
        `${s.fullName} ${s.studentId} ${s.admissionNo ?? ""} ${s.rollNumber ?? ""} ${s.classLabel ?? ""}`
          .toLowerCase()
          .includes(normalized)
      )
      .slice(0, 6)
      .map((s) => ({
        key: `student-${s.id}`,
        value: s.fullName,
        title: s.fullName,
        subtitle: `${s.studentId}${s.classLabel ? ` · ${s.classLabel}` : ""}`,
        href: `/students/${s.id}`,
        kind: "student" as const
      }));

    const teacherItems = teachers
      .filter((t) =>
        `${t.name} ${t.email} ${t.roleName}`
          .toLowerCase()
          .includes(normalized)
      )
      .slice(0, 6)
      .map((t) => ({
        key: `teacher-${t.id}`,
        value: t.email,
        title: t.name,
        subtitle: `${t.email} · ${t.roleName}`,
        href: `/admin/users#user-${t.id}`,
        kind: "teacher" as const
      }));

    return [...studentItems, ...teacherItems].slice(0, 10);
  }, [normalized, students, teachers]);

  const submitSearch = (value: string) => {
    const q = value.trim();
    router.push(q ? `${searchPath}?q=${encodeURIComponent(q)}` : searchPath);
    setOpen(false);
  };

  const label =
    teachers.length > 0 ? "Global Search (teachers + students)" : "Global Search (students)";
  const placeholder =
    placeholderOverride ??
    (teachers.length > 0
      ? "Search teacher name/email or student name/ID"
      : "Search student name, ID, admission no, or roll no");
  const hero = variant === "hero";
  const heroCompact = variant === "heroCompact";

  return (
    <div className={clsx("relative space-y-2", open && "z-[120]")} ref={boxRef}>
      {showLabel ? <label className="text-[12px] font-medium text-white/70">{label}</label> : null}
      <div className="relative">
        <span
          className={clsx(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2",
            hero ? "text-[#1f4ea7]/75" : heroCompact ? "text-white/45" : "text-white/45"
          )}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          name="q"
          value={query}
          autoComplete="off"
          placeholder={placeholder}
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
          className={clsx(
            "w-full outline-none transition",
            hero
              ? "h-[54px] rounded-[18px] bg-white border border-white/35 pl-10 pr-12 text-[15px] text-[#1f2a3a] placeholder:text-[#6c7687] focus:border-blue-300/80 focus:ring-4 focus:ring-blue-500/24"
              : heroCompact
                ? "h-[42px] rounded-[12px] border border-white/[0.14] bg-[#0f1728]/90 pl-10 pr-10 text-[13px] text-white/92 placeholder:text-white/40 focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
              : "rounded-full bg-[#0f1728]/90 border border-white/[0.14] pl-10 pr-4 py-2.5 text-sm focus:border-blue-300 focus:ring-4 focus:ring-blue-500/24"
          )}
        />
        {showMicIcon ? (
          <span
            className={clsx(
              "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2",
              hero ? "text-[#5f6978]" : heroCompact ? "text-white/40" : "text-white/40"
            )}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6.5 10.5a5.5 5.5 0 1 0 11 0M12 19v2.5M9 21.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}

        {open && normalized && (
          <div
            className={clsx(
              "absolute z-[130] mt-2 w-full max-h-[55vh] overflow-y-auto rounded-[16px] border backdrop-blur-2xl shadow-[0_16px_50px_-20px_rgba(0,0,0,0.8)]",
              hero
                ? "border-[#dfe6f2] bg-white/95"
                : heroCompact
                  ? "border-white/[0.14] bg-[#111a2d]/95"
                : "border-white/[0.14] bg-[#111a2d]/95"
            )}
          >
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
                  className={clsx(
                    "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition border-b last:border-b-0",
                    hero
                      ? "hover:bg-[#f4f7fc] border-[#edf2f8]"
                      : heroCompact
                        ? "hover:bg-white/[0.06] border-white/[0.06]"
                      : "hover:bg-white/[0.06] border-white/[0.06]"
                  )}
                >
                  <div className="min-w-0">
                    <div className={clsx("truncate", hero ? "text-[#1f2a3a]" : heroCompact ? "text-white/90" : "text-white/90")}>{item.title}</div>
                    <div className={clsx("text-xs truncate", hero ? "text-[#6d7787]" : heroCompact ? "text-white/45" : "text-white/45")}>{item.subtitle}</div>
                  </div>
                  <span className={clsx("text-[10px] font-semibold uppercase tracking-wider", hero ? "text-[#687487]" : heroCompact ? "text-white/45" : "text-white/45")}>
                    {item.kind}
                  </span>
                </button>
              ))
            ) : (
              <div className={clsx("px-3.5 py-3 text-xs", hero ? "text-[#6d7787]" : heroCompact ? "text-white/50" : "text-white/50")}>
                No matching suggestions. Press Enter to search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
