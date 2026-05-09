"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type CalendarMonthNavProps = {
  previousMonth: string;
  nextMonth: string;
  academicYearId: string;
};

function monthHref(monthKey: string, academicYearId: string) {
  return `/calendar?month=${encodeURIComponent(monthKey)}&ay=${encodeURIComponent(academicYearId)}`;
}

export function CalendarMonthNav({ previousMonth, nextMonth, academicYearId }: CalendarMonthNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const previousHref = useMemo(() => monthHref(previousMonth, academicYearId), [previousMonth, academicYearId]);
  const nextHref = useMemo(() => monthHref(nextMonth, academicYearId), [nextMonth, academicYearId]);
  const todayHref = useMemo(() => `/calendar?ay=${encodeURIComponent(academicYearId)}`, [academicYearId]);

  useEffect(() => {
    router.prefetch(previousHref);
    router.prefetch(nextHref);
    router.prefetch(todayHref);
  }, [router, previousHref, nextHref, todayHref]);

  const goTo = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onMouseEnter={() => router.prefetch(previousHref)}
        onFocus={() => router.prefetch(previousHref)}
        onClick={() => goTo(previousHref)}
      >
        ← Prev
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onMouseEnter={() => router.prefetch(todayHref)}
        onFocus={() => router.prefetch(todayHref)}
        onClick={() => goTo(todayHref)}
      >
        Today
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onMouseEnter={() => router.prefetch(nextHref)}
        onFocus={() => router.prefetch(nextHref)}
        onClick={() => goTo(nextHref)}
      >
        Next →
      </Button>
    </div>
  );
}
