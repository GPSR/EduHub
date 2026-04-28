import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function PlatformSchoolDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const school = await db.school.findUnique({
    where: { id },
    include: { subscription: { include: { customPlan: true } } },
  });
  if (!school) return notFound();

  const [students, teachers, users, invoices, payments] = await Promise.all([
    db.student.count({ where: { schoolId: id } }),
    db.user.count({ where: { schoolId: id, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } } }),
    db.user.count({ where: { schoolId: id } }),
    db.feeInvoice.aggregate({ where: { schoolId: id }, _sum: { amountCents: true }, _count: { _all: true } }),
    db.feePayment.aggregate({ where: { invoice: { schoolId: id } }, _sum: { amountCents: true }, _count: { _all: true } }),
  ]);

  const invoiced  = invoices._sum.amountCents ?? 0;
  const collected = payments._sum.amountCents ?? 0;
  const pending   = Math.max(0, invoiced - collected);
  const collectPct = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
  const plan = school.subscription?.plan === "CUSTOM"
    ? (school.subscription.customPlan?.name ?? "Custom")
    : (school.subscription?.plan ?? "N/A");

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <SectionHeader title={`${school.name}`} subtitle={`${school.slug} · Plan: ${plan}`} />
          <div className="flex items-center gap-2 mt-2">
            <Badge tone={school.isActive ? "success" : "danger"} dot>{school.isActive ? "Active" : "Inactive"}</Badge>
            <Badge tone="neutral">{plan}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/platform/schools" className="text-sm text-white/40 hover:text-white/75 transition">← Schools</Link>
          <Link href={`/platform/schools/${school.id}`}>
            <span className="text-sm text-indigo-300 hover:text-indigo-200 transition">Manage →</span>
          </Link>
          <Link href={`/platform/schools/${school.id}/gallery`}>
            <span className="text-sm text-cyan-300 hover:text-cyan-200 transition">Gallery →</span>
          </Link>
        </div>
      </div>

      {/* People stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: "👥", label: "Students",  value: students,  color: "text-indigo-300",  bg: "bg-indigo-500/10 border-indigo-500/20" },
          { icon: "📚", label: "Teachers",  value: teachers,  color: "text-teal-300",    bg: "bg-teal-500/10 border-teal-500/20"   },
          { icon: "🏫", label: "All Users", value: users,     color: "text-violet-300",  bg: "bg-violet-500/10 border-violet-500/20"},
        ].map(s => (
          <div key={s.label} className={`rounded-[20px] border ${s.bg} p-5`}>
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color} tabular-nums`}>{s.value.toLocaleString()}</div>
            <div className="text-[12px] font-medium text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue stats */}
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-5">Revenue Overview</p>
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-[11px] text-white/35 uppercase tracking-wider mb-1">Invoiced</p>
            <p className="text-2xl font-bold text-white/85 tabular-nums">{fmt(invoiced)}</p>
            <p className="text-[12px] text-white/35 mt-0.5">{invoices._count._all} invoices</p>
          </div>
          <div>
            <p className="text-[11px] text-white/35 uppercase tracking-wider mb-1">Collected</p>
            <p className="text-2xl font-bold text-emerald-300 tabular-nums">{fmt(collected)}</p>
            <p className="text-[12px] text-white/35 mt-0.5">{payments._count._all} payments</p>
          </div>
          <div>
            <p className="text-[11px] text-white/35 uppercase tracking-wider mb-1">Pending</p>
            <p className={`text-2xl font-bold tabular-nums ${pending > 0 ? "text-amber-300" : "text-white/50"}`}>{fmt(pending)}</p>
            <p className="text-[12px] text-white/35 mt-0.5">{collectPct}% collected</p>
          </div>
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[11px] text-white/30 mb-1.5">
            <span>Collection rate</span>
            <span>{collectPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${collectPct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
              style={{ width: `${collectPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
