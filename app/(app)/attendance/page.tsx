import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireSession();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);

  if (session.roleKey === "PARENT") {
    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      orderBy: { fullName: "asc" },
      include: {
        attendance: { where: { date }, orderBy: { date: "desc" } }
      }
    });
    return (
      <Card title="Attendance (Parent view)">
        <div className="text-sm text-white/60">
          Date: {isoDate(date)} •{" "}
          <Link href={`/attendance?date=${isoDate(new Date())}`} className="underline">
            today
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {students.map((s) => (
            <div key={s.id} className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="font-semibold">{s.fullName}</div>
              <div className="text-sm text-white/70 mt-1">
                Status: {s.attendance[0]?.status ?? "NOT_MARKED"}
              </div>
            </div>
          ))}
          {students.length === 0 ? <div className="text-sm text-white/60">No linked students.</div> : null}
        </div>
      </Card>
    );
  }

  const students = await prisma.student.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { fullName: "asc" },
    take: 200
  });
  const existing = await prisma.attendanceRecord.findMany({
    where: { schoolId: session.schoolId, date },
    select: { studentId: true, status: true }
  });
  const map = new Map(existing.map((r) => [r.studentId, r.status]));
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canMark = perms["ATTENDANCE"] ? atLeastLevel(perms["ATTENDANCE"], "EDIT") : false;

  return (
    <div className="space-y-6">
      <Card title="Daily Attendance">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-white/60">Date: {isoDate(date)}</div>
          <form className="flex items-center gap-2" action="/attendance" method="get">
            <input
              type="date"
              name="date"
              defaultValue={isoDate(date)}
              className="rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400 text-sm"
            />
            <Button type="submit" variant="secondary">
              Go
            </Button>
          </form>
        </div>
        {!canMark ? (
          <div className="mt-4 text-sm text-white/60">You don’t have permission to mark attendance.</div>
        ) : (
          <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            {students.map((s) => (
              <AttendanceRow
                key={s.id}
                date={isoDate(date)}
                studentId={s.id}
                name={s.fullName}
                current={map.get(s.id) ?? "NOT_MARKED"}
              />
            ))}
            {students.length === 0 ? (
              <div className="px-4 py-8 text-sm text-white/60">No students yet.</div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}

async function AttendanceRow({
  date,
  studentId,
  name,
  current
}: {
  date: string;
  studentId: string;
  name: string;
  current: string;
}) {
  const { markAttendanceAction } = await import("./actions");
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-white/60">Current: {current}</div>
      </div>
      <form action={markAttendanceAction} className="flex items-center gap-2">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="studentId" value={studentId} />
        <select
          name="status"
          defaultValue={current === "NOT_MARKED" ? "PRESENT" : current}
          className="rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400 text-sm"
        >
          <option value="PRESENT">PRESENT</option>
          <option value="ABSENT">ABSENT</option>
          <option value="LATE">LATE</option>
          <option value="LEAVE">LEAVE</option>
        </select>
        <Button type="submit" variant="secondary">
          Save
        </Button>
      </form>
    </div>
  );
}
