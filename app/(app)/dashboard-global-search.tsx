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
  teachers
}: {
  initialQuery: string;
  searchPath?: string;
  students: StudentSuggestion[];
  teachers: TeacherSuggestion[];
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
    teachers.length > 0
      ? "Search teacher name/email or student name/ID"
      : "Search student name, ID, admission no, or roll no";

  return (
    <div className={clsx("relative space-y-2", open && "z-[120]")} ref={boxRef}>
      <label className="text-[12px] font-medium text-white/70">{label}</label>
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
          className="w-full rounded-full bg-[#0f1728]/90 border border-white/[0.14] pl-10 pr-4 py-2.5 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/24 transition text-sm"
        />

        {open && normalized && (
          <div className="absolute z-[130] mt-2 w-full max-h-[55vh] overflow-y-auto rounded-[16px] border border-white/[0.14] bg-[#111a2d]/95 backdrop-blur-2xl shadow-[0_16px_50px_-20px_rgba(0,0,0,0.8)]">
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
