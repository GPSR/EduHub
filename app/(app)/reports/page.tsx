import Link from "next/link";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export default async function ReportsPage() {
  await requirePermission("REPORTS", "VIEW");
  const session = await requireSession();
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const yearStart  = new Date(today.getFullYear(), 0, 1);

  // ── Core counts ──────────────────────────────────────
  const [
    totalStudents, totalTeachers, totalUsers,
    presentToday, absentToday, lateToday,
    // Fees
    feeAll, feePaid, feeOverdue,
    feeMonthCollected, feeYearCollected,
    overdueInvoices,
    // Attendance monthly (last 30 days)
    attendanceLast30,
    // Class-wise student counts
    classCounts,
    // Recent exam results for score distribution
    examResults,
    // Gender breakdown
    genderCounts,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({ where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER","CLASS_TEACHER"] } } } }),
    prisma.user.count({ where: { schoolId: session.schoolId } }),

    prisma.attendanceRecord.count({ where: { schoolId: session.schoolId, date: today, status: "PRESENT" } }),
    prisma.attendanceRecord.count({ where: { schoolId: session.schoolId, date: today, status: "ABSENT" } }),
    prisma.attendanceRecord.count({ where: { schoolId: session.schoolId, date: today, status: "LATE" } }),

    prisma.feeInvoice.aggregate({ where: { schoolId: session.schoolId }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.feeInvoice.aggregate({ where: { schoolId: session.schoolId, status: "PAID" }, _sum: { amountCents: true } }),
    prisma.feeInvoice.aggregate({ where: { schoolId: session.schoolId, status: "OVERDUE" }, _sum: { amountCents: true }, _count: { _all: true } }),

    prisma.feePayment.aggregate({ where: { invoice: { schoolId: session.schoolId }, paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
    prisma.feePayment.aggregate({ where: { invoice: { schoolId: session.schoolId }, paidAt: { gte: yearStart } }, _sum: { amountCents: true } }),

    prisma.feeInvoice.findMany({
      where: { schoolId: session.schoolId, status: "OVERDUE" },
      include: { student: true },
      orderBy: { dueOn: "asc" },
      take: 10,
    }),

    prisma.attendanceRecord.groupBy({
      by: ["date", "status"],
      where: { schoolId: session.schoolId, date: { gte: new Date(Date.now() - 30 * 86400000) } },
      _count: { _all: true },
      orderBy: { date: "asc" },
    }),

    prisma.student.groupBy({
      by: ["classId"],
      where: { schoolId: session.schoolId },
      _count: { _all: true },
    }),

    prisma.examResult.findMany({
      where:   { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take:    200,
    }),

    prisma.student.groupBy({
      by: ["gender"],
      where: { schoolId: session.schoolId },
      _count: { _all: true },
    }),
  ]);

  // ── Class names lookup ────────────────────────────────
  const classIds   = classCounts.map(c => c.classId).filter(Boolean) as string[];
  const classes    = classIds.length
    ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true, section: true } })
    : [];
  const classById  = new Map(classes.map(c => [c.id, `${c.name}${c.section ? `-${c.section}` : ""}`]));

  // ── Derived stats ─────────────────────────────────────
  const totalInvoicedCents  = feeAll._sum.amountCents ?? 0;
  const totalPaidCents      = feePaid._sum.amountCents ?? 0;
  const totalOverdueCents   = feeOverdue._sum.amountCents ?? 0;
  const collectionRate      = pct(totalPaidCents, totalInvoicedCents);
  const monthCollectedCents = feeMonthCollected._sum.amountCents ?? 0;
  const yearCollectedCents  = feeYearCollected._sum.amountCents ?? 0;

  // ── Attendance 30-day summary ─────────────────────────
  const attendMap = new Map<string, { present: number; absent: number; late: number }>();
  for (const r of attendanceLast30) {
    const key   = r.date.toISOString().slice(0, 10);
    const entry = attendMap.get(key) ?? { present: 0, absent: 0, late: 0 };
    if (r.status === "PRESENT") entry.present += r._count._all;
    if (r.status === "ABSENT")  entry.absent  += r._count._all;
    if (r.status === "LATE")    entry.late    += r._count._all;
    attendMap.set(key, entry);
  }
  const attendDays = Array.from(attendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);
  const avgAttendPct = attendDays.length > 0
    ? Math.round(attendDays.reduce((sum, [, v]) => sum + pct(v.present, v.present + v.absent + v.late), 0) / attendDays.length)
    : null;

  // ── Exam score distribution ───────────────────────────
  const buckets = { "90-100": 0, "75-89": 0, "50-74": 0, "Below 50": 0 };
  for (const e of examResults) {
    const p = e.maxScore > 0 ? (e.score / e.maxScore) * 100 : 0;
    if (p >= 90) buckets["90-100"]++;
    else if (p >= 75) buckets["75-89"]++;
    else if (p >= 50) buckets["50-74"]++;
    else buckets["Below 50"]++;
  }
  const totalExams = examResults.length;

  // ── Class-wise sorted ─────────────────────────────────
  const classData = classCounts
    .map(c => ({ label: c.classId ? (classById.get(c.classId) ?? "Unknown class") : "No class", count: c._count._all }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const maxClassCount = Math.max(...classData.map(c => c.count), 1);

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Reports" subtitle="Analytics and insights across your school" />

      {/* ── Top metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "👥", label: "Students",      value: totalStudents,  color: "indigo"  },
          { icon: "📚", label: "Teachers",      value: totalTeachers,  color: "teal"    },
          { icon: "✅", label: "Present today", value: presentToday,   color: "emerald" },
          { icon: "❌", label: "Absent today",  value: absentToday + lateToday, color: absentToday > 0 ? "rose" : "neutral" },
        ].map(m => (
          <div key={m.label} className={`rounded-[18px] border p-5
            ${{ indigo: "bg-indigo-500/10 border-indigo-500/20", teal: "bg-teal-500/10 border-teal-500/20",
                emerald: "bg-emerald-500/10 border-emerald-500/20", rose: "bg-rose-500/10 border-rose-500/20",
                neutral: "bg-white/[0.04] border-white/[0.08]" }[m.color]}`}>
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-2xl font-bold text-white/90">{m.value.toLocaleString()}</div>
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Fee collection ── */}
      <Card title="Fee Collection" accent="indigo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
          <Metric label="Total Invoiced"  value={fmt(totalInvoicedCents)} />
          <Metric label="Collected"       value={fmt(totalPaidCents)}    highlight />
          <Metric label="This Month"      value={fmt(monthCollectedCents)} />
          <Metric label="This Year"       value={fmt(yearCollectedCents)} />
        </div>

        {/* Collection rate bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[12px] text-white/45 mb-1.5">
            <span>Collection rate</span>
            <span className="font-semibold text-white/70">{collectionRate}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${collectionRate}%` }} />
          </div>
        </div>

        {/* Overdue summary */}
        {feeOverdue._count._all > 0 && (
          <div className="flex items-center justify-between rounded-[13px] border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-[13px] font-semibold text-amber-200">{feeOverdue._count._all} overdue invoice{feeOverdue._count._all !== 1 ? "s" : ""}</p>
                <p className="text-[11px] text-amber-300/60">{fmt(totalOverdueCents)} outstanding</p>
              </div>
            </div>
            <Link href="/fees" className="text-[12px] font-semibold text-amber-300 hover:text-amber-200 transition">
              View →
            </Link>
          </div>
        )}
      </Card>

      {/* ── Overdue invoices list ── */}
      {overdueInvoices.length > 0 && (
        <Card title="Fee Aging (Overdue)" accent="rose">
          <div className="space-y-2 mt-1">
            {overdueInvoices.map(inv => {
              const daysOverdue = inv.dueOn
                ? Math.floor((Date.now() - inv.dueOn.getTime()) / 86400000)
                : null;
              return (
                <Link key={inv.id} href={`/fees/${inv.id}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 hover:bg-white/[0.07] transition">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/85 truncate">{inv.student.fullName}</p>
                    <p className="text-[11px] text-white/40 truncate">{inv.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-rose-300">{fmt(inv.amountCents)}</p>
                    {daysOverdue !== null && (
                      <Badge tone="danger">{daysOverdue}d overdue</Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Attendance 14-day trend ── */}
      <Card title="Attendance Trend (Last 14 Days)" accent="teal">
        <div className="flex items-end gap-1 mb-3" style={{ height: "80px" }}>
          {attendDays.map(([date, v]) => {
            const total = v.present + v.absent + v.late;
            const p     = pct(v.present, total);
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block
                                bg-[#0c1121] border border-white/[0.10] rounded-[8px] px-2 py-1
                                text-[10px] text-white/80 whitespace-nowrap z-10 shadow-lg">
                  {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  <br />{v.present}P {v.absent}A {v.late}L
                </div>
                <div className="w-full rounded-t-[4px] transition-all"
                  style={{
                    height: `${Math.max(4, p)}%`,
                    background: p >= 90 ? "rgb(52 211 153)" : p >= 75 ? "rgb(99 102 241)" : p >= 50 ? "rgb(251 191 36)" : "rgb(248 113 113)",
                  }} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[12px] text-white/45">
          <span>{attendDays[0]?.[0] ? new Date(attendDays[0][0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
          <span className="text-white/70 font-semibold">
            {avgAttendPct !== null ? `${avgAttendPct}% avg attendance` : "No data"}
          </span>
          <span>{attendDays.at(-1)?.[0] ? new Date(attendDays.at(-1)![0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Class-wise strength ── */}
        <Card title="Class-wise Strength" accent="violet">
          {classData.length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No classes set up yet.</p>
          ) : (
            <div className="space-y-2 mt-1">
              {classData.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-[12px] font-medium text-white/65 truncate">{c.label}</div>
                  <div className="flex-1 h-5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                      style={{ width: `${pct(c.count, maxClassCount)}%` }} />
                  </div>
                  <div className="w-8 text-right text-[12px] font-bold text-white/70">{c.count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Exam score distribution ── */}
        <Card title="Exam Score Distribution" accent="amber">
          {totalExams === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No exam results recorded yet.</p>
          ) : (
            <div className="space-y-3 mt-1">
              {(Object.entries(buckets) as [string, number][]).map(([range, count]) => {
                const p = pct(count, totalExams);
                const color = range === "90-100" ? "from-emerald-500 to-teal-500"
                  : range === "75-89"  ? "from-indigo-500 to-violet-500"
                  : range === "50-74"  ? "from-amber-500 to-orange-500"
                  : "from-rose-500 to-red-500";
                return (
                  <div key={range} className="flex items-center gap-3">
                    <div className="w-20 shrink-0 text-[12px] font-medium text-white/60">{range}%</div>
                    <div className="flex-1 h-5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`}
                        style={{ width: `${p}%` }} />
                    </div>
                    <div className="w-16 text-right text-[12px] text-white/55">{count} ({p}%)</div>
                  </div>
                );
              })}
              <p className="text-[11px] text-white/30 pt-1">{totalExams} total results</p>
            </div>
          )}
        </Card>

        {/* ── Gender breakdown ── */}
        {genderCounts.some(g => g.gender) && (
          <Card title="Student Gender Breakdown" accent="teal">
            <div className="space-y-2 mt-1">
              {genderCounts
                .filter(g => g.gender)
                .sort((a, b) => b._count._all - a._count._all)
                .map(g => {
                  const p = pct(g._count._all, totalStudents);
                  return (
                    <div key={g.gender} className="flex items-center gap-3">
                      <div className="w-24 shrink-0 text-[12px] font-medium text-white/65">{g.gender}</div>
                      <div className="flex-1 h-5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                          style={{ width: `${p}%` }} />
                      </div>
                      <div className="w-16 text-right text-[12px] text-white/55">{g._count._all} ({p}%)</div>
                    </div>
                  );
                })}
              {genderCounts.some(g => !g.gender) && (
                <p className="text-[11px] text-white/30">
                  + {genderCounts.find(g => !g.gender)?._count._all ?? 0} not specified
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ── Staff summary ── */}
        <Card title="School Overview" accent="indigo">
          <div className="grid grid-cols-2 gap-4 mt-1">
            <Metric label="Total Students" value={totalStudents.toLocaleString()} />
            <Metric label="Teachers"       value={totalTeachers.toLocaleString()} />
            <Metric label="Total Users"    value={totalUsers.toLocaleString()} />
            <Metric label="Classes"        value={classData.length.toLocaleString()} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-emerald-300" : "text-white/85"}`}>{value}</p>
    </div>
  );
}
