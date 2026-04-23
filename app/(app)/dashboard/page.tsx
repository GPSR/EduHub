import { Card, SectionHeader, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";

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

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

type TrendPoint = {
  day: Date;
  marked: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
};

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.roleKey !== "ADMIN") redirect("/students");
  const [students, teachers, pendingFees, posts, school, perms] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({
      where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } }
    }),
    prisma.feeInvoice.count({ where: { schoolId: session.schoolId, status: { not: "PAID" } } }),
    prisma.feedPost.count({ where: { schoolId: session.schoolId } }),
    prisma.school.findUnique({
      where: { id: session.schoolId },
      include: { subscription: true }
    }),
    getEffectivePermissions({
      schoolId: session.schoolId,
      userId: session.userId,
      roleId: session.roleId
    })
  ]);

  const plan = school?.subscription?.plan ?? "TRIAL";
  const isActive = school?.isActive ?? false;
  const canViewAttendance = perms["ATTENDANCE"] ? atLeastLevel(perms["ATTENDANCE"], "VIEW") : false;

  const attendanceScopeLabel = "School-wide students";
  const scopedStudentIds = (
    await prisma.student.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true }
    })
  ).map((s) => s.id);

  const trendDays: TrendPoint[] = [];
  const today = startOfDay(new Date());
  const trendStart = addDays(today, -13);

  if (canViewAttendance && scopedStudentIds.length > 0) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: session.schoolId,
        studentId: { in: scopedStudentIds },
        date: { gte: trendStart, lte: addDays(today, 1) }
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

  const todayPoint = trendDays.find((d) => dayKey(d.day) === dayKey(today)) ?? {
    day: today,
    marked: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader title="Dashboard" subtitle={`Welcome back — ${school?.name ?? "your school"}`} />

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥" label="Students" value={students}
          color="indigo" delay="stagger-1"
        />
        <StatCard
          icon="🏫" label="Teachers" value={teachers}
          color="teal" delay="stagger-2"
        />
        <StatCard
          icon="💳" label="Pending Fees" value={pendingFees}
          color={pendingFees > 0 ? "amber" : "emerald"} delay="stagger-3"
        />
        <StatCard
          icon="📢" label="Feed Posts" value={posts}
          color="violet" delay="stagger-4"
        />
      </div>

      {/* School info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="School" accent="indigo">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Name</p>
              <p className="text-[15px] font-semibold text-white/90">{school?.name ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Plan</p>
                <Badge tone={plan === "TRIAL" ? "warning" : "success"}>{plan}</Badge>
              </div>
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Status</p>
                <Badge tone={isActive ? "success" : "danger"} dot>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Quick Access" accent="teal">
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/students",   icon: "👥", label: "Students"   },
              { href: "/fees",       icon: "💳", label: "Fees"       },
              { href: "/attendance", icon: "✅", label: "Attendance" },
              { href: "/feed",       icon: "📢", label: "Feed"       },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[13px] border border-white/[0.07] bg-white/[0.03]
                           px-3.5 py-3 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[13px] font-medium text-white/80">{item.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Attendance Trend (Last 14 Days)"
        description={`Scope: ${attendanceScopeLabel}`}
        accent="emerald"
      >
        {!canViewAttendance ? (
          <p className="text-sm text-white/50">Attendance access is not enabled for your role.</p>
        ) : scopedStudentIds.length === 0 ? (
          <p className="text-sm text-white/50">No students are currently in your attendance scope.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Metric label="In Scope" value={scopedStudentIds.length} tone="text-white/85" />
              <Metric label="Marked Today" value={todayPoint.marked} tone="text-indigo-300" />
              <Metric label="Present" value={todayPoint.present} tone="text-emerald-300" />
              <Metric label="Absent" value={todayPoint.absent} tone="text-rose-300" />
              <Metric label="Late / Leave" value={todayPoint.late + todayPoint.leave} tone="text-amber-300" />
            </div>

            <div className="rounded-[16px] border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-end gap-1 h-36">
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

            <div className="text-xs text-white/40">
              Teachers see assigned-class students; parents see linked children; admins and leadership see school-wide scope.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center">
      <div className={`text-xl font-bold ${tone}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] text-white/35 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, delay
}: {
  icon: string;
  label: string;
  value: number;
  color: "indigo" | "teal" | "amber" | "emerald" | "violet";
  delay: string;
}) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    teal:    { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"  },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20"},
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20" },
  }[color];

  return (
    <div className={`animate-fade-up ${delay} rounded-[18px] border border-white/[0.08] bg-white/[0.04]
                     p-5 hover:bg-white/[0.06] transition-all duration-200
                     shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}>
      <div className={`mb-3 inline-flex items-center justify-center w-10 h-10 rounded-[11px] ${colorMap.bg} ${colorMap.border} border`}>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white/95 tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] font-medium text-white/45 uppercase tracking-wider">{label}</div>
    </div>
  );
}
