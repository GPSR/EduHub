import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

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
  searchParams: Promise<{ date?: string }>;
}) {
  await requirePermission("ATTENDANCE", "VIEW");
  const session = await requireSession();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);
  const today = isoDate(new Date());
  const dateStr = isoDate(date);
  const isToday = dateStr === today;

  /* Parent view */
  if (session.roleKey === "PARENT") {
    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      orderBy: { fullName: "asc" },
      include: { attendance: { where: { date }, orderBy: { date: "desc" } } },
    });
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
      </div>
    );
  }

  /* Staff / Admin view */
  const students = await prisma.student.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { fullName: "asc" },
    take: 200,
  });
  const existing = await prisma.attendanceRecord.findMany({
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

  return (
    <div className="space-y-5 animate-fade-up">
      <DateHeader date={date} isToday={isToday} />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
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

function DateHeader({ date, isToday }: { date: Date; isToday: boolean }) {
  const dateStr = isoDate(date);
  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const today = isoDate(new Date());

  return (
    <div className="flex items-center justify-between gap-4">
      <SectionHeader
        title="Daily Attendance"
        subtitle={`${date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${isToday ? " · Today" : ""}`}
      />
      <div className="flex items-center gap-2 shrink-0">
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
    <div className={`flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors
                     ${isFirst ? "rounded-t-[16px]" : ""}
                     ${isLast  ? "rounded-b-[16px]" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white/85">{name}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge tone={cfg.tone}>{cfg.emoji} {cfg.label}</Badge>
        </div>
      </div>
      <form action={markAttendanceAction} className="flex items-center gap-2 shrink-0">
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
