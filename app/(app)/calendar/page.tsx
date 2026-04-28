import { Badge, Button, Card, EmptyState, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { eachDayInclusive, formatMonthKey, monthWindow, parseDateOnlyInput, parseMonthKey } from "@/lib/leave-utils";
import { CalendarMonthGrid } from "./calendar-month-grid";
import { CalendarMonthNav } from "./calendar-month-nav";

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

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthGrid(monthStart: Date) {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  return eachDayInclusive(gridStart, gridEnd);
}

function isSameMonth(date: Date, monthStart: Date) {
  return date.getFullYear() === monthStart.getFullYear() && date.getMonth() === monthStart.getMonth();
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
  searchParams: Promise<{ month?: string; add?: string }>;
}) {
  const { session, level } = await requirePermission("SCHOOL_CALENDAR", "VIEW");
  const { month, add } = await searchParams;

  const monthStart = parseMonthKey(month) ?? startOfMonth(new Date());
  const activeMonthKey = formatMonthKey(monthStart);
  const previousMonth = formatMonthKey(addMonths(monthStart, -1));
  const nextMonth = formatMonthKey(addMonths(monthStart, 1));
  const createPrefillDate = parseDateOnlyInput(String(add ?? "").trim());
  const createPrefillDateKey = createPrefillDate ? formatDateKey(createPrefillDate) : undefined;

  const { start: monthRangeStart, end: monthRangeEnd } = monthWindow(monthStart);
  const monthGridDays = getMonthGrid(monthStart);

  const canManage = atLeastLevel(level, "EDIT");
  const canAdminManage = session.roleKey === "ADMIN";
  const canViewAllClassEvents = new Set(["ADMIN", "HEAD_MASTER", "PRINCIPAL", "CORRESPONDENT"]).has(session.roleKey);
  const isTeacherRole = session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER";

  const [teacherAssignments, parentStudents] = await Promise.all([
    isTeacherRole
      ? db.teacherClassAssignment.findMany({
          where: {
            schoolId: session.schoolId,
            userId: session.userId
          },
          select: { classId: true }
        })
      : Promise.resolve([]),
    session.roleKey === "PARENT"
      ? db.student.findMany({
          where: {
            schoolId: session.schoolId,
            parents: { some: { userId: session.userId } }
          },
          select: { classId: true }
        })
      : Promise.resolve([])
  ]);

  const teacherClassIds = [...new Set(teacherAssignments.map((row) => row.classId).filter(Boolean))];
  const parentClassIds = [...new Set(parentStudents.map((row) => row.classId).filter(Boolean) as string[])];
  const viewerClassIds = isTeacherRole ? teacherClassIds : session.roleKey === "PARENT" ? parentClassIds : [];

  const audienceFilter = canViewAllClassEvents
    ? null
    : {
        OR: [
          { audienceScope: "SCHOOL_WIDE" as const },
          ...(viewerClassIds.length > 0
            ? [
                {
                  classTargets: {
                    some: {
                      classId: { in: viewerClassIds }
                    }
                  }
                }
              ]
            : [])
        ]
      };

  const [createClasses, monthEvents, upcomingEvents] = await Promise.all([
    canManage
      ? isTeacherRole
        ? teacherClassIds.length > 0
          ? db.class.findMany({
              where: {
                schoolId: session.schoolId,
                id: { in: teacherClassIds }
              },
              orderBy: [{ name: "asc" }, { section: "asc" }],
              select: { id: true, name: true, section: true }
            })
          : Promise.resolve([])
        : db.class.findMany({
            where: { schoolId: session.schoolId },
            orderBy: [{ name: "asc" }, { section: "asc" }],
            select: { id: true, name: true, section: true }
          })
      : Promise.resolve([]),
    db.schoolCalendarEvent.findMany({
      where: {
        schoolId: session.schoolId,
        startsOn: { lte: monthRangeEnd },
        endsOn: { gte: monthRangeStart },
        ...(audienceFilter ?? {})
      },
      include: {
        createdByUser: { select: { name: true } },
        classTargets: {
          include: {
            class: {
              select: { id: true, name: true, section: true }
            }
          },
          orderBy: [{ classId: "asc" }]
        }
      },
      orderBy: [{ startsOn: "asc" }, { createdAt: "asc" }],
      take: 300
    }),
    db.schoolCalendarEvent.findMany({
      where: {
        schoolId: session.schoolId,
        startsOn: { gte: new Date() },
        ...(audienceFilter ?? {})
      },
      include: {
        classTargets: {
          include: {
            class: {
              select: { id: true, name: true, section: true }
            }
          },
          orderBy: [{ classId: "asc" }]
        }
      },
      orderBy: [{ startsOn: "asc" }],
      take: 12
    })
  ]);

  const eventsByDay = new Map<string, typeof monthEvents>();
  for (const event of monthEvents) {
    const overlapStart = event.startsOn > monthRangeStart ? event.startsOn : monthRangeStart;
    const overlapEnd = event.endsOn < monthRangeEnd ? event.endsOn : monthRangeEnd;
    for (const day of eachDayInclusive(overlapStart, overlapEnd)) {
      const key = formatDateKey(day);
      const existing = eventsByDay.get(key);
      if (existing) {
        existing.push(event);
      } else {
        eventsByDay.set(key, [event]);
      }
    }
  }
  const monthGridDayData = monthGridDays.map((day) => {
    const key = formatDateKey(day);
    return {
      key,
      dayNumber: day.getDate(),
      inMonth: isSameMonth(day, monthStart),
      events: (eventsByDay.get(key) ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description ?? "",
        eventType: event.eventType,
        audienceScope: event.audienceScope,
        startsOn: formatDateKey(event.startsOn),
        endsOn: formatDateKey(event.endsOn),
        classIds: event.classTargets.map((target) => target.class.id),
        classLabels: event.classTargets.map((target) =>
          `${target.class.name}${target.class.section ? `-${target.class.section}` : ""}`
        )
      }))
    };
  });

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

          <CalendarMonthNav previousMonth={previousMonth} nextMonth={nextMonth} />
        </div>
      </Card>

      <CalendarMonthGrid
        canManage={canManage}
        canAdminManage={canAdminManage}
        activeMonthKey={activeMonthKey}
        monthLabel={monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        initialAddDate={createPrefillDateKey}
        days={monthGridDayData}
        classes={createClasses}
      />

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
                        {event.audienceScope === "SCHOOL_WIDE" ? (
                          <Badge tone="info">School wide</Badge>
                        ) : (
                          <Badge tone="neutral">Class wise</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-white/55">{formatRange(event.startsOn, event.endsOn)}</p>
                      {event.audienceScope === "CLASS_WISE" ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {event.classTargets.length > 0 ? (
                            event.classTargets.map((target) => (
                              <span
                                key={target.id}
                                className="inline-flex rounded-full border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/70"
                              >
                                {target.class.name}
                                {target.class.section ? `-${target.class.section}` : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-white/45">No class target configured</span>
                          )}
                        </div>
                      ) : null}
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
                  <p className="mt-0.5 text-[11px] text-white/45">
                    {event.audienceScope === "SCHOOL_WIDE"
                      ? "School wide"
                      : event.classTargets.length > 0
                        ? event.classTargets
                            .map((target) => `${target.class.name}${target.class.section ? `-${target.class.section}` : ""}`)
                            .join(", ")
                        : "Class wise"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
