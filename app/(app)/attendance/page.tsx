import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { eachDayInclusive, formatMonthKey, monthWindow, parseDateOnlyInput, parseMonthKey } from "@/lib/leave-utils";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

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
function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}
function buildAttendanceHref(args: { date?: string; month?: string; classId?: string | null }) {
  const params = new URLSearchParams();
  if (args.date) params.set("date", args.date);
  if (args.month) params.set("month", args.month);
  if (args.classId) params.set("classId", args.classId);
  const query = params.toString();
  return query ? `/attendance?${query}` : "/attendance";
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
  searchParams: Promise<{ date?: string; month?: string; classId?: string; ay?: string }>;
}) {
  await requirePermission("ATTENDANCE", "VIEW");
  const session = await requireSession();
  const { date: dateParam, month: monthParam, classId: classIdParam, ay } = await searchParams;
  const yearContext = await getAcademicYearContext({
    schoolId: session.schoolId,
    requestedYearId: ay
  });
  const selectedYear = yearContext.selectedYear;
  const isYearWritable = selectedYear.status !== "CLOSED";
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
      include: { attendance: { where: { date, academicYearId: selectedYear.id }, orderBy: { date: "desc" } } },
    });
    const studentIds = students.map((s) => s.id);
    const monthRecords =
      studentIds.length > 0
        ? await db.attendanceRecord.findMany({
            where: {
              schoolId: session.schoolId,
              academicYearId: selectedYear.id,
              studentId: { in: studentIds },
              date: { gte: monthRangeStart, lte: monthRangeEnd }
            },
            select: { studentId: true, date: true, status: true }
          })
        : [];
    const monthStatusMap = new Map(monthRecords.map((record) => [`${record.studentId}:${isoDate(record.date)}`, record.status]));

    return (
      <div className="space-y-5 animate-fade-up">
        {!isYearWritable ? (
          <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Academic year {selectedYear.name} is closed. Attendance is read-only.
          </div>
        ) : null}
        <DateHeader
          date={date}
          isToday={isToday}
          academicYearName={selectedYear.name}
          academicYearId={selectedYear.id}
          selectedClassId={null}
        />
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
          academicYearId={selectedYear.id}
          selectedClassId={null}
          monthStart={monthStart}
          monthDays={monthDays}
          students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
          statusByStudentDay={monthStatusMap}
        />
      </div>
    );
  }

  /* Staff / Admin view */
  const classes = await db.class.findMany({
    where: { schoolId: session.schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: "asc" }, { section: "asc" }]
  });
  const selectedClassId = classes.some((cls) => cls.id === classIdParam) ? classIdParam ?? null : (classes[0]?.id ?? null);
  const selectedClass = selectedClassId ? classes.find((cls) => cls.id === selectedClassId) ?? null : null;
  const selectedClassLabel = selectedClass ? classLabel(selectedClass.name, selectedClass.section) : "all students";

  const students = await db.student.findMany({
    where: {
      schoolId: session.schoolId,
      ...(selectedClassId ? { classId: selectedClassId } : {})
    },
    orderBy: { fullName: "asc" },
    take: 200
  });
  const existing =
    students.length > 0
      ? await db.attendanceRecord.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            date,
            studentId: { in: students.map((student) => student.id) }
          },
          select: { studentId: true, status: true }
        })
      : [];
  const statusMap = new Map(existing.map(r => [r.studentId, r.status]));

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canMark = isYearWritable && (perms["ATTENDANCE"] ? atLeastLevel(perms["ATTENDANCE"], "EDIT") : false);

  const markedCount = existing.length;
  const presentCount = existing.filter(r => r.status === "PRESENT").length;
  const leaveCount   = existing.filter(r => r.status === "LEAVE").length;
  const scopedStudentIds = students.map((s) => s.id);

  const trendDays: TrendPoint[] = [];
  const trendEnd = startOfDay(date);
  const trendStart = addDays(trendEnd, -13);
  if (scopedStudentIds.length > 0) {
    const records = await db.attendanceRecord.findMany({
      where: {
        schoolId: session.schoolId,
        academicYearId: selectedYear.id,
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
            academicYearId: selectedYear.id,
            studentId: { in: scopedStudentIds },
            date: { gte: monthRangeStart, lte: monthRangeEnd }
          },
          select: { studentId: true, date: true, status: true }
        })
      : [];
  const monthStatusMap = new Map(monthRecords.map((record) => [`${record.studentId}:${isoDate(record.date)}`, record.status]));

  return (
    <div className="space-y-5 animate-fade-up">
      {!isYearWritable ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Academic year {selectedYear.name} is closed. Attendance is read-only.
        </div>
      ) : null}
      <DateHeader
        date={date}
        isToday={isToday}
        academicYearName={selectedYear.name}
        academicYearId={selectedYear.id}
        selectedClassId={selectedClassId}
      />

      <Card title="Class-wise Attendance" description="Select a class and mark only leave students. Others stay Present by default." accent="indigo">
        {classes.length === 0 ? (
          <p className="text-sm text-white/50">No classes configured yet. Add classes in settings first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => {
              const active = cls.id === selectedClassId;
              return (
                <Link
                  key={cls.id}
                  href={withAcademicYearParam(buildAttendanceHref({ date: dateStr, month: formatMonthKey(monthStart), classId: cls.id }), selectedYear.id)}
                >
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                      active
                        ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                        : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                    ].join(" ")}
                  >
                    {classLabel(cls.name, cls.section)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total",   value: students.length, color: "text-white/80" },
          { label: "Marked",  value: markedCount,     color: "text-white/80" },
          { label: "Present", value: presentCount,    color: "text-emerald-300" },
          { label: "Leave",   value: leaveCount,      color: "text-amber-300" },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-white/35 mt-0.5 font-medium uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <MonthlyAttendanceGrid
        title="Monthly Attendance Grid"
        description={`Monthly view for ${selectedClassLabel} and all days.`}
        previousMonthKey={previousMonthKey}
        nextMonthKey={nextMonthKey}
        academicYearId={selectedYear.id}
        selectedClassId={selectedClassId}
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
          <ClassAttendanceLeaveForm
            date={dateStr}
            classId={selectedClassId}
            academicYearId={selectedYear.id}
            students={students.map((student) => ({
              id: student.id,
              name: student.fullName,
              status: statusMap.get(student.id) ?? "NOT_MARKED"
            }))}
          />
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
  academicYearId,
  selectedClassId,
  monthStart,
  monthDays,
  students,
  statusByStudentDay
}: {
  title: string;
  description: string;
  previousMonthKey: string;
  nextMonthKey: string;
  academicYearId: string;
  selectedClassId: string | null;
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
          <Link href={withAcademicYearParam(buildAttendanceHref({ month: previousMonthKey, date: `${previousMonthKey}-01`, classId: selectedClassId }), academicYearId)}>
            <Button variant="secondary" size="sm">← Prev</Button>
          </Link>
          <Link href={withAcademicYearParam(buildAttendanceHref({ month: formatMonthKey(new Date()), date: isoDate(new Date()), classId: selectedClassId }), academicYearId)}>
            <Button variant="secondary" size="sm">Today</Button>
          </Link>
          <Link href={withAcademicYearParam(buildAttendanceHref({ month: nextMonthKey, date: `${nextMonthKey}-01`, classId: selectedClassId }), academicYearId)}>
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

function DateHeader({
  date,
  isToday,
  academicYearName,
  academicYearId,
  selectedClassId
}: {
  date: Date;
  isToday: boolean;
  academicYearName: string;
  academicYearId: string;
  selectedClassId: string | null;
}) {
  const dateStr = isoDate(date);
  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const today = isoDate(new Date());

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <SectionHeader
        title="Daily Attendance"
        subtitle={`${date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${isToday ? " · Today" : ""} · ${academicYearName}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={withAcademicYearParam(buildAttendanceHref({ date: isoDate(prev), classId: selectedClassId }), academicYearId)}>
          <Button variant="secondary" size="sm">←</Button>
        </Link>
        <form action="/attendance" method="get" className="flex items-center gap-2">
          <input type="hidden" name="ay" value={academicYearId} />
          {selectedClassId ? <input type="hidden" name="classId" value={selectedClassId} /> : null}
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="rounded-[11px] bg-black/25 border border-white/[0.09] px-3 py-1.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 transition"
          />
          <Button type="submit" variant="secondary" size="sm">Go</Button>
        </form>
        {!isToday && (
          <Link href={withAcademicYearParam(buildAttendanceHref({ date: today, classId: selectedClassId }), academicYearId)}>
            <Button variant="secondary" size="sm">Today</Button>
          </Link>
        )}
        <Link href={withAcademicYearParam(buildAttendanceHref({ date: isoDate(next), classId: selectedClassId }), academicYearId)}>
          <Button variant="secondary" size="sm">→</Button>
        </Link>
      </div>
    </div>
  );
}

async function ClassAttendanceLeaveForm({
  date,
  classId,
  academicYearId,
  students
}: {
  date: string;
  classId: string | null;
  academicYearId: string;
  students: Array<{ id: string; name: string; status: string }>;
}) {
  const { markClassAttendanceAction } = await import("./actions");

  if (!classId) {
    return <p className="px-4 py-4 text-sm text-white/55">Select a class to mark attendance.</p>;
  }

  return (
    <form action={markClassAttendanceAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="academicYearId" value={academicYearId} />

      <div className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12px] text-emerald-100">
        Present is default for all students. Select only students on leave, then save once for the whole class.
      </div>

      <div className="divide-y divide-white/[0.05] rounded-[14px] border border-white/[0.08] bg-white/[0.02]">
        {students.map((student, index) => (
          <label
            key={student.id}
            className={[
              "flex items-center justify-between gap-3 px-3.5 py-3 hover:bg-white/[0.03] transition",
              index === 0 ? "rounded-t-[14px]" : "",
              index === students.length - 1 ? "rounded-b-[14px]" : ""
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white/88">{student.name}</p>
              <p className="text-[11px] text-white/45">Default: Present</p>
            </div>
            <span className="inline-flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                name="leaveStudentIds"
                value={student.id}
                defaultChecked={student.status === "LEAVE"}
                className="h-[16px] w-[16px] rounded-[4px] accent-indigo-500"
              />
              Leave
            </span>
          </label>
        ))}
      </div>

      <div className="flex justify-end px-1">
        <Button type="submit" variant="secondary">Save Class Attendance</Button>
      </div>
    </form>
  );
}
