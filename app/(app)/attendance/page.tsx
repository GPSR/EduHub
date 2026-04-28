import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { eachDayInclusive, formatMonthKey, monthWindow, parseDateOnlyInput, parseMonthKey } from "@/lib/leave-utils";

function isoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
function dayKey(d: Date) { return isoDate(d); }
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function statusCellConfig(status: string) {
  switch (status) {
    case "PRESENT":
      return { short: "P", label: "Present", className: "border-emerald-400/35 bg-emerald-500/20 text-emerald-100" };
    case "ABSENT":
      return { short: "A", label: "Absent", className: "border-rose-400/35 bg-rose-500/20 text-rose-100" };
    case "LATE":
      return { short: "L", label: "Late", className: "border-amber-400/35 bg-amber-500/20 text-amber-100" };
    case "LEAVE":
      return { short: "V", label: "Leave", className: "border-slate-300/28 bg-slate-500/20 text-slate-100" };
    default:
      return { short: "•", label: "Not marked", className: "border-white/[0.14] bg-white/[0.04] text-white/45" };
  }
}

type TrendPoint = {
  day: Date;
  marked: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
};

function statusConfig(status: string) {
  switch (status) {
    case "PRESENT":     return { tone: "success" as const, emoji: "✅", label: "Present" };
    case "ABSENT":      return { tone: "danger"  as const, emoji: "❌", label: "Absent"  };
    case "LATE":        return { tone: "warning" as const, emoji: "🕐", label: "Late"    };
    case "LEAVE":       return { tone: "neutral" as const, emoji: "🏠", label: "Leave"   };
    default:            return { tone: "neutral" as const, emoji: "○",  label: "Not Marked" };
  }
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  await requirePermission("ATTENDANCE", "VIEW");
  const session = await requireSession();
  const { date: dateParam, month: monthParam } = await searchParams;
  const date = parseDateOnlyInput(String(dateParam ?? "").trim()) ?? startOfDay(new Date());
  const monthStart = parseMonthKey(monthParam) ?? startOfMonth(date);
  const previousMonthKey = formatMonthKey(addMonths(monthStart, -1));
  const nextMonthKey = formatMonthKey(addMonths(monthStart, 1));
  const { start: monthRangeStart, end: monthRangeEnd } = monthWindow(monthStart);
  const monthLastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const monthDays = eachDayInclusive(monthStart, monthLastDay);
  const today = isoDate(new Date());
  const dateStr = isoDate(date);
  const isToday = dateStr === today;

  /* Parent view */
  if (session.roleKey === "PARENT") {
    const students = await db.student.findMany({
      where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      orderBy: { fullName: "asc" },
      include: { attendance: { where: { date }, orderBy: { date: "desc" } } },
    });
    const studentIds = students.map((s) => s.id);
    const monthRecords =
      studentIds.length > 0
        ? await db.attendanceRecord.findMany({
            where: {
              schoolId: session.schoolId,
              studentId: { in: studentIds },
              date: { gte: monthRangeStart, lte: monthRangeEnd }
            },
            select: { studentId: true, date: true, status: true }
          })
        : [];
    const monthStatusMap = new Map(monthRecords.map((record) => [`${record.studentId}:${isoDate(record.date)}`, record.status]));

    return (
      <div className="space-y-5 animate-fade-up">
        <DateHeader date={date} isToday={isToday} />
        <Card title="Attendance" description="Your children's attendance for the selected date">
          {students.length === 0 ? (
            <EmptyState icon="👨‍👩‍👧" title="No linked students" />
          ) : (
            <div className="space-y-3 mt-2">
              {students.map(s => {
                const cfg = statusConfig(s.attendance[0]?.status ?? "NOT_MARKED");
                return (
                  <div key={s.id} className="flex items-center justify-between gap-4
                                              rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
                    <div className="text-[14px] font-semibold text-white/85">{s.fullName}</div>
                    <Badge tone={cfg.tone}>{cfg.emoji} {cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <MonthlyAttendanceGrid
          title="Monthly Attendance Grid"
          description="Full month details for your linked students."
          previousMonthKey={previousMonthKey}
          nextMonthKey={nextMonthKey}
          monthStart={monthStart}
          monthDays={monthDays}
          students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
          statusByStudentDay={monthStatusMap}
        />
      </div>
    );
  }

  /* Staff / Admin view */
  const students = await db.student.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { fullName: "asc" },
    take: 200,
  });
  const existing = await db.attendanceRecord.findMany({
    where: { schoolId: session.schoolId, date },
    select: { studentId: true, status: true },
  });
  const statusMap = new Map(existing.map(r => [r.studentId, r.status]));

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canMark = perms["ATTENDANCE"] ? atLeastLevel(perms["ATTENDANCE"], "EDIT") : false;

  const markedCount = existing.length;
  const presentCount = existing.filter(r => r.status === "PRESENT").length;
  const absentCount  = existing.filter(r => r.status === "ABSENT").length;
  const scopedStudentIds = students.map((s) => s.id);

  const trendDays: TrendPoint[] = [];
  const trendEnd = startOfDay(date);
  const trendStart = addDays(trendEnd, -13);
  if (scopedStudentIds.length > 0) {
    const records = await db.attendanceRecord.findMany({
      where: {
        schoolId: session.schoolId,
        studentId: { in: scopedStudentIds },
        date: { gte: trendStart, lte: addDays(trendEnd, 1) }
      },
      select: { date: true, status: true }
    });

    const byDay = new Map<string, TrendPoint>();
    for (let i = 0; i < 14; i++) {
      const day = addDays(trendStart, i);
      byDay.set(dayKey(day), { day, marked: 0, present: 0, absent: 0, late: 0, leave: 0 });
    }

    for (const r of records) {
      const key = dayKey(startOfDay(r.date));
      const bucket = byDay.get(key);
      if (!bucket) continue;
      bucket.marked += 1;
      if (r.status === "PRESENT") bucket.present += 1;
      if (r.status === "ABSENT") bucket.absent += 1;
      if (r.status === "LATE") bucket.late += 1;
      if (r.status === "LEAVE") bucket.leave += 1;
    }
    trendDays.push(...Array.from(byDay.values()));
  }

  const selectedPoint = trendDays.find((d) => dayKey(d.day) === dayKey(trendEnd)) ?? {
    day: trendEnd,
    marked: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0
  };
  const monthRecords =
    scopedStudentIds.length > 0
      ? await db.attendanceRecord.findMany({
          where: {
            schoolId: session.schoolId,
            studentId: { in: scopedStudentIds },
            date: { gte: monthRangeStart, lte: monthRangeEnd }
          },
          select: { studentId: true, date: true, status: true }
        })
      : [];
  const monthStatusMap = new Map(monthRecords.map((record) => [`${record.studentId}:${isoDate(record.date)}`, record.status]));

  return (
    <div className="space-y-5 animate-fade-up">
      <DateHeader date={date} isToday={isToday} />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total",   value: students.length, color: "text-white/80" },
          { label: "Marked",  value: markedCount,     color: "text-white/80" },
          { label: "Present", value: presentCount,    color: "text-emerald-300" },
          { label: "Absent",  value: absentCount,     color: "text-rose-300" },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-white/35 mt-0.5 font-medium uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <MonthlyAttendanceGrid
        title="Monthly Attendance Grid"
        description="Monthly view across all students and all days."
        previousMonthKey={previousMonthKey}
        nextMonthKey={nextMonthKey}
        monthStart={monthStart}
        monthDays={monthDays}
        students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
        statusByStudentDay={monthStatusMap}
      />

      <Card
        title="Attendance Trend (Last 14 Days)"
        description={`Ending ${trendEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        accent="emerald"
      >
        {scopedStudentIds.length === 0 ? (
          <p className="text-sm text-white/50">No students available to calculate trend.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
              <TrendMetric label="In Scope" value={scopedStudentIds.length} tone="text-white/85" />
              <TrendMetric label="Marked" value={selectedPoint.marked} tone="text-indigo-300" />
              <TrendMetric label="Present" value={selectedPoint.present} tone="text-emerald-300" />
              <TrendMetric label="Absent" value={selectedPoint.absent} tone="text-rose-300" />
              <TrendMetric label="Late / Leave" value={selectedPoint.late + selectedPoint.leave} tone="text-amber-300" />
            </div>

            <div className="rounded-[16px] border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-end gap-0.5 sm:gap-1 h-24 sm:h-36">
                {trendDays.map((d) => {
                  const coverage = scopedStudentIds.length ? Math.round((d.marked / scopedStudentIds.length) * 100) : 0;
                  const presentRate = scopedStudentIds.length ? Math.round((d.present / scopedStudentIds.length) * 100) : 0;
                  const h = Math.max(8, Math.min(100, coverage));
                  return (
                    <div key={dayKey(d.day)} className="group flex-1 min-w-0 flex flex-col items-center justify-end gap-1">
                      <div className="w-full rounded-t-md bg-white/[0.08] relative overflow-hidden" style={{ height: `${h}%` }}>
                        <div className="absolute inset-x-0 bottom-0 bg-emerald-500/80" style={{ height: `${presentRate}%` }} />
                      </div>
                      <span className="text-[10px] text-white/35">{d.day.getDate()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-white/45">
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-white/[0.16] inline-block" /> Marked coverage</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80 inline-block" /> Present share</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        {!canMark ? (
          <EmptyState icon="🔒" title="No permission" description="You don't have permission to mark attendance." />
        ) : students.length === 0 ? (
          <EmptyState icon="👥" title="No students" description="Add students to start marking attendance." />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {students.map((s, i) => (
              <AttendanceRow
                key={s.id}
                date={dateStr}
                studentId={s.id}
                name={s.fullName}
                current={statusMap.get(s.id) ?? "NOT_MARKED"}
                isFirst={i === 0}
                isLast={i === students.length - 1}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MonthlyAttendanceGrid({
  title,
  description,
  previousMonthKey,
  nextMonthKey,
  monthStart,
  monthDays,
  students,
  statusByStudentDay
}: {
  title: string;
  description: string;
  previousMonthKey: string;
  nextMonthKey: string;
  monthStart: Date;
  monthDays: Date[];
  students: Array<{ id: string; fullName: string }>;
  statusByStudentDay: Map<string, string>;
}) {
  const displayedStudents = students.slice(0, 120);
  const hiddenCount = Math.max(0, students.length - displayedStudents.length);

  return (
    <Card title={title} description={description} accent="teal">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-white/90">
            {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <p className="text-[11px] text-white/45">
            {displayedStudents.length} student(s) · {monthDays.length} day(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/attendance?month=${encodeURIComponent(previousMonthKey)}&date=${encodeURIComponent(`${previousMonthKey}-01`)}`}>
            <Button variant="secondary" size="sm">← Prev</Button>
          </Link>
          <Link href={`/attendance?month=${encodeURIComponent(formatMonthKey(new Date()))}&date=${encodeURIComponent(isoDate(new Date()))}`}>
            <Button variant="secondary" size="sm">Today</Button>
          </Link>
          <Link href={`/attendance?month=${encodeURIComponent(nextMonthKey)}&date=${encodeURIComponent(`${nextMonthKey}-01`)}`}>
            <Button variant="secondary" size="sm">Next →</Button>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5">
          <i className="h-2 w-2 rounded-full bg-emerald-300 inline-block" /> P = Present
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5">
          <i className="h-2 w-2 rounded-full bg-rose-300 inline-block" /> A = Absent
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5">
          <i className="h-2 w-2 rounded-full bg-amber-300 inline-block" /> L = Late
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5">
          <i className="h-2 w-2 rounded-full bg-slate-200 inline-block" /> V = Leave
        </span>
      </div>

      {displayedStudents.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">No students available for monthly attendance view.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-[14px] border border-white/[0.08] bg-black/20">
          <table className="min-w-[980px] w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[220px] bg-[#0f1728] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">
                  Student
                </th>
                {monthDays.map((day) => (
                  <th
                    key={dayKey(day)}
                    className="w-[36px] min-w-[36px] border-b border-white/[0.10] px-0.5 py-2 text-center"
                  >
                    <div className="text-[11px] font-semibold text-white/85">{day.getDate()}</div>
                    <div className="text-[9px] text-white/40">
                      {day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedStudents.map((student, rowIndex) => (
                <tr key={student.id} className={rowIndex % 2 === 0 ? "bg-white/[0.01]" : ""}>
                  <td className="sticky left-0 z-10 min-w-[220px] bg-[#0f1728] px-3 py-2 border-b border-white/[0.06]">
                    <p className="truncate text-[12px] font-medium text-white/88">{student.fullName}</p>
                  </td>
                  {monthDays.map((day) => {
                    const status = statusByStudentDay.get(`${student.id}:${dayKey(day)}`) ?? "NOT_MARKED";
                    const cell = statusCellConfig(status);
                    return (
                      <td key={`${student.id}-${dayKey(day)}`} className="border-b border-white/[0.04] px-1 py-1 text-center">
                        <span
                          title={cell.label}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-[8px] border text-[10px] font-semibold ${cell.className}`}
                        >
                          {cell.short}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiddenCount > 0 ? (
        <p className="mt-2 text-[11px] text-white/45">
          Showing first {displayedStudents.length} students in grid for readability. {hiddenCount} more student(s) are hidden.
        </p>
      ) : null}
    </Card>
  );
}

function TrendMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center">
      <div className={`text-lg sm:text-xl font-bold ${tone}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] text-white/35 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

function DateHeader({ date, isToday }: { date: Date; isToday: boolean }) {
  const dateStr = isoDate(date);
  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const today = isoDate(new Date());

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <SectionHeader
        title="Daily Attendance"
        subtitle={`${date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${isToday ? " · Today" : ""}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/attendance?date=${isoDate(prev)}`}>
          <Button variant="secondary" size="sm">←</Button>
        </Link>
        <form action="/attendance" method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="rounded-[11px] bg-black/25 border border-white/[0.09] px-3 py-1.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 transition"
          />
          <Button type="submit" variant="secondary" size="sm">Go</Button>
        </form>
        {!isToday && (
          <Link href={`/attendance?date=${today}`}>
            <Button variant="secondary" size="sm">Today</Button>
          </Link>
        )}
        <Link href={`/attendance?date=${isoDate(next)}`}>
          <Button variant="secondary" size="sm">→</Button>
        </Link>
      </div>
    </div>
  );
}

async function AttendanceRow({
  date, studentId, name, current, isFirst, isLast,
}: {
  date: string; studentId: string; name: string; current: string;
  isFirst: boolean; isLast: boolean;
}) {
  const { markAttendanceAction } = await import("./actions");
  const cfg = statusConfig(current);

  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-4 px-3.5 sm:px-4 py-3.5 hover:bg-white/[0.03] transition-colors
                     ${isFirst ? "rounded-t-[16px]" : ""}
                     ${isLast  ? "rounded-b-[16px]" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white/85">{name}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge tone={cfg.tone}>{cfg.emoji} {cfg.label}</Badge>
        </div>
      </div>
      <form action={markAttendanceAction} className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0 mt-2 sm:mt-0">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="studentId" value={studentId} />
        <select
          name="status"
          defaultValue={current === "NOT_MARKED" ? "PRESENT" : current}
          className="rounded-[11px] bg-black/25 border border-white/[0.09] px-3 py-2 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 transition"
        >
          <option value="PRESENT">✅ Present</option>
          <option value="ABSENT">❌ Absent</option>
          <option value="LATE">🕐 Late</option>
          <option value="LEAVE">🏠 Leave</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">Save</Button>
      </form>
    </div>
  );
}
