import { Card, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

function centsToDollars(cents: number) {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ReportsPage() {
  const session = await requireSession();

  const [students, users, feeAgg, paidAgg, absentToday, presentToday] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({ where: { schoolId: session.schoolId } }),
    prisma.feeInvoice.aggregate({
      where: { schoolId: session.schoolId },
      _sum: { amountCents: true },
    }),
    prisma.feeInvoice.aggregate({
      where: { schoolId: session.schoolId, status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.attendanceRecord.count({
      where: {
        schoolId: session.schoolId,
        date: new Date(new Date().toISOString().slice(0, 10)),
        status: { in: ["ABSENT", "LEAVE"] },
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        schoolId: session.schoolId,
        date: new Date(new Date().toISOString().slice(0, 10)),
        status: "PRESENT",
      },
    }),
  ]);

  const totalCents = feeAgg._sum.amountCents ?? 0;
  const paidCents  = paidAgg._sum.amountCents ?? 0;
  const collectionRate = totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Reports" subtitle="High-level overview of your school" />

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon="👥" label="Students" value={students.toLocaleString()} color="indigo" />
        <MetricCard icon="🏫" label="Staff & Users" value={users.toLocaleString()} color="teal" />
        <MetricCard icon="✅" label="Present Today" value={presentToday.toLocaleString()} color="emerald" />
        <MetricCard icon="❌" label="Absent / Leave" value={absentToday.toLocaleString()} color={absentToday > 0 ? "rose" : "neutral"} />
      </div>

      {/* Fee overview */}
      <Card title="Fee Collection" accent="indigo">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-1">
          <FinancialMetric label="Total Invoiced" value={`$${centsToDollars(totalCents)}`} />
          <FinancialMetric label="Amount Collected" value={`$${centsToDollars(paidCents)}`} highlight />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-2">Collection Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white/90">{collectionRate}%</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance overview */}
      <Card title="Today's Attendance" accent="teal">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-1">
          <FinancialMetric label="Present" value={presentToday.toLocaleString()} />
          <FinancialMetric label="Absent / Leave" value={absentToday.toLocaleString()} />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-2">Attendance Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white/90">
                {presentToday + absentToday > 0
                  ? `${Math.round((presentToday / (presentToday + absentToday)) * 100)}%`
                  : "—"}
              </span>
            </div>
            {presentToday + absentToday > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                  style={{ width: `${Math.round((presentToday / (presentToday + absentToday)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Roadmap note */}
      <Card title="Coming soon" accent="amber">
        <p className="text-sm text-white/55 leading-relaxed">
          More reports are on the roadmap: monthly revenue, class-wise strength, fee aging,
          exam analytics, and staff activity logs.
        </p>
      </Card>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: {
  icon: string; label: string; value: string;
  color: "indigo" | "teal" | "emerald" | "rose" | "neutral";
}) {
  const bg = {
    indigo:  "bg-indigo-500/10 border-indigo-500/20",
    teal:    "bg-teal-500/10   border-teal-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    rose:    "bg-rose-500/10   border-rose-500/20",
    neutral: "bg-white/[0.04]  border-white/[0.08]",
  }[color];

  return (
    <div className={`rounded-[18px] border ${bg} p-5`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white/90">{value}</div>
      <div className="text-[12px] font-medium text-white/40 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function FinancialMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-emerald-300" : "text-white/85"}`}>{value}</p>
    </div>
  );
}
