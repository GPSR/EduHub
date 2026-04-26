import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { formatMonthKey, monthWindow, parseMonthKey } from "@/lib/leave-utils";

const EVENT_TYPE_META = {
  HOLIDAY: { label: "Holiday", tone: "success" as const, icon: "🌴" },
  FUNCTION: { label: "Function", tone: "info" as const, icon: "🎉" },
  EXAM: { label: "Exam", tone: "warning" as const, icon: "📝" },
  OTHER: { label: "Other", tone: "neutral" as const, icon: "📌" }
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatRange(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission("SCHOOL_CALENDAR", "VIEW");
  const session = await requireSession();
  const { month } = await searchParams;

  const monthStart = parseMonthKey(month) ?? startOfMonth(new Date());
  const activeMonthKey = formatMonthKey(monthStart);
  const previousMonth = formatMonthKey(addMonths(monthStart, -1));
  const nextMonth = formatMonthKey(addMonths(monthStart, 1));

  const { start: monthRangeStart, end: monthRangeEnd } = monthWindow(monthStart);

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const calendarLevel = perms.SCHOOL_CALENDAR;
  const canManage = calendarLevel ? atLeastLevel(calendarLevel, "EDIT") : false;

  const [monthEvents, upcomingEvents] = await Promise.all([
    prisma.schoolCalendarEvent.findMany({
      where: {
        schoolId: session.schoolId,
        startsOn: { lte: monthRangeEnd },
        endsOn: { gte: monthRangeStart }
      },
      include: {
        createdByUser: { select: { name: true } }
      },
      orderBy: [{ startsOn: "asc" }, { createdAt: "asc" }],
      take: 300
    }),
    prisma.schoolCalendarEvent.findMany({
      where: {
        schoolId: session.schoolId,
        startsOn: { gte: new Date() }
      },
      orderBy: [{ startsOn: "asc" }],
      take: 12
    })
  ]);

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="School Calendar"
        subtitle="School-level holidays, functions, exams, and important events"
      />

      <Card accent="indigo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white/92">
              {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <p className="text-[12px] text-white/50">{monthEvents.length} event(s) this month</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/calendar?month=${encodeURIComponent(previousMonth)}`}>
              <Button type="button" variant="secondary" size="sm">← Prev</Button>
            </Link>
            <Link href="/calendar">
              <Button type="button" variant="secondary" size="sm">Today</Button>
            </Link>
            <Link href={`/calendar?month=${encodeURIComponent(nextMonth)}`}>
              <Button type="button" variant="secondary" size="sm">Next →</Button>
            </Link>
          </div>
        </div>
      </Card>

      {canManage ? <CreateCalendarEventCard monthKey={activeMonthKey} /> : null}

      <Card
        title="Monthly Timeline"
        description={`Events overlapping ${monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
        accent="teal"
      >
        {monthEvents.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="No events in this month"
            description="Add holidays, functions, and exam schedules to keep everyone informed."
          />
        ) : (
          <div className="space-y-2.5">
            {monthEvents.map((event) => {
              const meta = EVENT_TYPE_META[event.eventType];
              return (
                <article
                  key={event.id}
                  className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <p className="text-[14px] font-semibold text-white/90">{event.title}</p>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 text-[12px] text-white/55">{formatRange(event.startsOn, event.endsOn)}</p>
                      {event.description ? (
                        <p className="mt-1.5 text-[12px] text-white/65 leading-relaxed whitespace-pre-wrap">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-white/35">By {event.createdByUser.name}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Upcoming Events" description="Next scheduled items" accent="indigo">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-white/50">No upcoming events scheduled yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {upcomingEvents.map((event) => {
              const meta = EVENT_TYPE_META[event.eventType];
              return (
                <div
                  key={event.id}
                  className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-white/88 truncate">{event.title}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">{formatRange(event.startsOn, event.endsOn)}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

async function CreateCalendarEventCard({ monthKey }: { monthKey: string }) {
  const { createSchoolCalendarEventAction } = await import("./actions");

  return (
    <Card
      title="Add Calendar Event"
      description="School admin and leadership can publish holidays, functions, exams, and notices"
      accent="indigo"
    >
      <form action={createSchoolCalendarEventAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <div>
          <Label required>Title</Label>
          <Input name="title" placeholder="Quarterly Exams" required />
        </div>

        <div>
          <Label>Event type</Label>
          <select
            name="eventType"
            defaultValue="HOLIDAY"
            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
          >
            <option value="HOLIDAY">Holiday</option>
            <option value="FUNCTION">Function</option>
            <option value="EXAM">Exam</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>Start date</Label>
            <Input name="startsOn" type="date" defaultValue={`${monthKey}-01`} required />
          </div>
          <div>
            <Label>End date</Label>
            <Input name="endsOn" type="date" />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={3} placeholder="Additional event details for school community" />
        </div>

        <div className="flex justify-end">
          <Button type="submit">Add event</Button>
        </div>
      </form>
    </Card>
  );
}
