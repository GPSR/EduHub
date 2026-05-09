"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const ACADEMIC_YEAR_QUERY_PARAM = "ay";
const ACADEMIC_YEAR_COOKIE = "eduhub_ay";

type AcademicYearSwitcherOption = {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  isActive: boolean;
};

export function AcademicYearSwitcher({
  years,
  selectedYearId,
  className,
  label = "Academic year"
}: {
  years: AcademicYearSwitcherOption[];
  selectedYearId: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextYearId: string) => {
    if (!nextYearId) return;

    document.cookie = `${ACADEMIC_YEAR_COOKIE}=${encodeURIComponent(nextYearId)}; Path=/; Max-Age=31536000; SameSite=Lax`;

    const params = new URLSearchParams(searchParams.toString());
    params.set(ACADEMIC_YEAR_QUERY_PARAM, nextYearId);
    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    startTransition(() => {
      router.replace(nextHref);
      router.refresh();
    });
  };

  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <select
        value={selectedYearId}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending || years.length === 0}
        className="w-full rounded-[11px] border border-white/[0.14] bg-[#101b30]/85 px-3 py-2 text-[12px] font-medium text-white/90 outline-none transition focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22 disabled:opacity-60"
        aria-label={label}
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
            {year.status === "CLOSED"
              ? " - Closed"
              : year.isActive
                ? " - Current"
                : " - Open"}
          </option>
        ))}
      </select>
    </label>
  );
}
