import { Card, SectionHeader, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import Link from "next/link";

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

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("DASHBOARD", "VIEW");
  const session = await requireSession();
  if (session.roleKey !== "ADMIN") redirect("/students");
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [students, teachers, pendingFees, posts, school, perms, quickSearchStudents, quickSearchTeachers] = await Promise.all([
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
    }),
    prisma.student.findMany({
      where: { schoolId: session.schoolId },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        admissionNo: true,
        rollNumber: true,
        class: { select: { name: true, section: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 220
    }),
    prisma.user.findMany({
      where: {
        schoolId: session.schoolId,
        schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
      },
      select: {
        id: true,
        name: true,
        email: true,
        schoolRole: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 180
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
  const normalizedQuery = query.toLowerCase();
  const matchedStudents = query
    ? quickSearchStudents
        .filter((s) =>
          `${s.fullName} ${s.studentId} ${s.admissionNo ?? ""} ${s.rollNumber ?? ""} ${s.class ? `${s.class.name} ${s.class.section ?? ""}` : ""}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 12)
    : [];
  const matchedTeachers = query
    ? quickSearchTeachers
        .filter((t) =>
          `${t.name} ${t.email} ${t.schoolRole.name}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 12)
    : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader title="Dashboard" subtitle={`Welcome back — ${school?.name ?? "your school"}`} />

      <Card>
        <form action="/dashboard" method="get" className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[12px] font-medium text-white/70">Global Search (teachers + students)</label>
            <input
              name="q"
              defaultValue={query}
              list="school-dashboard-global-search"
              placeholder="Search teacher name/email or student name/ID"
              className="mt-1 w-full rounded-xl bg-black/25 border border-white/10 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition text-sm"
            />
            <datalist id="school-dashboard-global-search">
              {quickSearchStudents.map((s) => (
                <option key={`student-name-${s.id}`} value={s.fullName}>{`Student · ${s.studentId}`}</option>
              ))}
              {quickSearchStudents.map((s) => (
                <option key={`student-id-${s.id}`} value={s.studentId}>{`Student ID · ${s.fullName}`}</option>
              ))}
              {quickSearchTeachers.map((t) => (
                <option key={`teacher-email-${t.id}`} value={t.email}>{`Teacher · ${t.name}`}</option>
              ))}
              {quickSearchTeachers.map((t) => (
                <option key={`teacher-name-${t.id}`} value={t.name}>{`Teacher · ${t.email}`}</option>
              ))}
            </datalist>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            <Link href="/dashboard"><Button type="button" variant="secondary">Clear</Button></Link>
          </div>
        </form>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥" label="Students" value={students}
          color="indigo" delay="stagger-1" href="/students"
        />
        <StatCard
          icon="🏫" label="Teachers" value={teachers}
          color="teal" delay="stagger-2" href="/admin/users"
        />
        <StatCard
          icon="💳" label="Pending Fees" value={pendingFees}
          color={pendingFees > 0 ? "amber" : "emerald"} delay="stagger-3" href="/fees"
        />
        <StatCard
          icon="📢" label="Feed Posts" value={posts}
          color="violet" delay="stagger-4" href="/feed"
        />
      </div>

      {query && (matchedStudents.length > 0 || matchedTeachers.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title={`Matched Students · ${matchedStudents.length}`} accent="indigo">
            <div className="divide-y divide-white/[0.06]">
              {matchedStudents.map((s) => {
                const classLabel = s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : "No class";
                return (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition rounded-[10px] px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/90 truncate">{s.fullName}</div>
                      <div className="text-xs text-white/45 truncate">
                        {s.studentId} · {s.admissionNo ?? "No admission no."} · {classLabel}
                      </div>
                    </div>
                    <span className="text-xs text-indigo-300/80 shrink-0">Open</span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card title={`Matched Teachers · ${matchedTeachers.length}`} accent="teal">
            <div className="divide-y divide-white/[0.06]">
              {matchedTeachers.map((t) => (
                <Link
                  key={t.id}
                  href="/admin/users"
                  className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition rounded-[10px] px-2 -mx-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{t.name}</div>
                    <div className="text-xs text-white/45 truncate">{t.email} · {t.schoolRole.name}</div>
                  </div>
                  <span className="text-xs text-teal-300/80 shrink-0">Manage</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {query && matchedStudents.length === 0 && matchedTeachers.length === 0 && (
        <Card title="Search Results">
          <p className="text-sm text-white/50">
            No teachers or students matched <span className="text-white/75">&quot;{query}&quot;</span>.
          </p>
        </Card>
      )}

      {/* School info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="School" accent="indigo">
          <div className="space-y-3">
            <Link href="/admin/settings" className="block rounded-[10px] px-2 py-1.5 -mx-2 hover:bg-white/[0.05] transition-colors">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Name</p>
              <p className="text-[15px] font-semibold text-white/90">{school?.name ?? "—"}</p>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/admin/settings" className="block rounded-[10px] px-2 py-1.5 -mx-2 hover:bg-white/[0.05] transition-colors">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Plan</p>
                <Badge tone={plan === "TRIAL" ? "warning" : "success"}>{plan}</Badge>
              </Link>
              <Link href="/admin/settings" className="block rounded-[10px] px-2 py-1.5 -mx-2 hover:bg-white/[0.05] transition-colors">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Status</p>
                <Badge tone={isActive ? "success" : "danger"} dot>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </Link>
            </div>
          </div>
        </Card>

        <Card title="Quick Access" accent="teal">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
              <Metric label="In Scope" value={scopedStudentIds.length} tone="text-white/85" href="/students" />
              <Metric label="Marked Today" value={todayPoint.marked} tone="text-indigo-300" href="/attendance" />
              <Metric label="Present" value={todayPoint.present} tone="text-emerald-300" href="/attendance" />
              <Metric label="Absent" value={todayPoint.absent} tone="text-rose-300" href="/attendance" />
              <Metric label="Late / Leave" value={todayPoint.late + todayPoint.leave} tone="text-amber-300" href="/attendance" />
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

            <div className="text-xs text-white/40">
              Teachers see assigned-class students; parents see linked children; admins and leadership see school-wide scope.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, tone, href }: { label: string; value: number; tone: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150"
    >
      <div className={`text-lg sm:text-xl font-bold ${tone}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] text-white/35 font-medium uppercase tracking-wider">{label}</div>
    </Link>
  );
}

function StatCard({
  icon, label, value, color, delay, href
}: {
  icon: string;
  label: string;
  value: number;
  color: "indigo" | "teal" | "amber" | "emerald" | "violet";
  delay: string;
  href: string;
}) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    teal:    { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"  },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20"},
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20" },
  }[color];

  return (
    <Link
      href={href}
      className={`block animate-fade-up ${delay} rounded-[16px] sm:rounded-[18px] border border-white/[0.08] bg-white/[0.04]
                  p-3.5 sm:p-5 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-200
                  shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}
    >
      <div className={`mb-2 sm:mb-3 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[11px] ${colorMap.bg} ${colorMap.border} border`}>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-white/95 tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] font-medium text-white/45 uppercase tracking-wider">{label}</div>
    </Link>
  );
}
