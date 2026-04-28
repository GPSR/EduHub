"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type CalendarMonthNavProps = {
  previousMonth: string;
  nextMonth: string;
};

function monthHref(monthKey: string) {
  return `/calendar?month=${encodeURIComponent(monthKey)}`;
}

export function CalendarMonthNav({ previousMonth, nextMonth }: CalendarMonthNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const previousHref = useMemo(() => monthHref(previousMonth), [previousMonth]);
  const nextHref = useMemo(() => monthHref(nextMonth), [nextMonth]);
  const todayHref = "/calendar";

  useEffect(() => {
    router.prefetch(previousHref);
    router.prefetch(nextHref);
    router.prefetch(todayHref);
  }, [router, previousHref, nextHref]);

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

