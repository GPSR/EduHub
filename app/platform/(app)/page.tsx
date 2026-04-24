import Link from "next/link";
import { Badge, Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";
import { ImpersonateLauncher } from "./ui";
import { PlatformGlobalSearch } from "./platform-global-search";

function centsToUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function planTone(plan: string): "success" | "info" | "warning" | "neutral" {
  if (plan === "PREMIUM" || plan === "UNLIMITED") return "success";
  if (plan === "BETA")    return "info";
  if (plan === "TRIAL")   return "warning";
  return "neutral";
}

export default async function PlatformHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requirePlatformUser();
  const { q } = await searchParams;
  const query         = (q ?? "").trim();

  const customPlans = await prisma.customSubscriptionPlan.findMany({
    where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, code: true },
  });

  const monthStart  = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const last30Days  = new Date(Date.now() - 30 * 86400000);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const assignedIds = (await prisma.platformUserSchoolAssignment.findMany({
    where: { platformUserId: user.id }, select: { schoolId: true },
  })).map(a => a.schoolId);

  const schoolFilter = {
    ...(query ? { OR: [{ name: { contains: query } }, { slug: { contains: query } }] } : {}),
    ...(!isSuperAdmin ? { id: { in: assignedIds } } : {}),
  };

  const [schools, totalSchools, totalStudents, totalTeachers, totalRev, monthlyRev, last30Rev, pendingOnboarding] =
    await Promise.all([
      prisma.school.findMany({
        where: schoolFilter,
        include: { subscription: { include: { customPlan: true } }, users: { select: { id: true } }, students: { select: { id: true } } },
        orderBy: { createdAt: "desc" }, take: 200,
      }),
      prisma.school.count({ where: !isSuperAdmin ? { id: { in: assignedIds } } : undefined }),
      prisma.student.count({ where: !isSuperAdmin ? { schoolId: { in: assignedIds } } : undefined }),
      prisma.user.count({ where: { ...(!isSuperAdmin ? { schoolId: { in: assignedIds } } : {}), schoolRole: { key: { in: ["TEACHER","CLASS_TEACHER"] } } } }),
      prisma.feePayment.aggregate({ where: { ...(!isSuperAdmin ? { invoice: { schoolId: { in: assignedIds } } } : {}) }, _sum: { amountCents: true } }),
      prisma.feePayment.aggregate({ where: { ...(!isSuperAdmin ? { invoice: { schoolId: { in: assignedIds } } } : {}), paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
      prisma.feePayment.aggregate({ where: { ...(!isSuperAdmin ? { invoice: { schoolId: { in: assignedIds } } } : {}), paidAt: { gte: last30Days } }, _sum: { amountCents: true } }),
      0,
    ]);

  const quickSearchSchools = await prisma.school.findMany({
    where: !isSuperAdmin ? { id: { in: assignedIds } } : undefined,
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
    take: 120
  });
  const quickSearchUserWhere = {
    ...(!isSuperAdmin ? { schoolId: { in: assignedIds } } : {}),
    schoolRole: { key: "ADMIN" as const }
  };
  const quickSearchSchoolUsers = await prisma.user.findMany({
    where: quickSearchUserWhere,
    select: { id: true, name: true, email: true, schoolId: true },
    orderBy: { createdAt: "desc" },
    take: 160
  });

  const matchedSchoolUsers = query
    ? quickSearchSchoolUsers.filter((u) =>
        `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="relative z-[110] overflow-visible">
        <PlatformGlobalSearch
          initialQuery={query}
          schools={quickSearchSchools}
          users={quickSearchSchoolUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, schoolId: u.schoolId }))}
        />
      </Card>

      {query && matchedSchoolUsers.length > 0 && (
        <Card title={`Matched School Admins · ${matchedSchoolUsers.length}`}>
          <div className="divide-y divide-white/[0.06]">
            {matchedSchoolUsers.map((u) => {
              const school = quickSearchSchools.find((s) => s.id === u.schoolId);
              return (
                <Link
                  key={u.id}
                  href={`/platform/schools/${u.schoolId}#school-admin-${u.id}`}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.03] transition rounded-[10px] px-2 -mx-2"
                >
                  <div className="min-w-0 text-sm text-white/85">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-white/45 truncate">{u.email}</div>
                  </div>
                  <div className="text-xs text-indigo-300/80 shrink-0">
                    {school ? `${school.name} (${school.slug})` : "Open school"}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Hero ── */}
      <div className="rounded-[24px] border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white/95">Platform Dashboard</h1>
            <p className="mt-1.5 text-sm text-white/50 max-w-xl">
              Manage schools, subscriptions, and support operations across EduHub.
            </p>
          </div>
          <div />
        </div>
      </div>

      {/* ── Revenue + stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue hero card */}
        <div className="col-span-2 lg:col-span-2 rounded-[22px] border border-emerald-500/20 bg-emerald-500/[0.06] p-4 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-2">Total Revenue</p>
          <p className="text-3xl sm:text-4xl font-bold text-emerald-300 tabular-nums">{centsToUsd(totalRev._sum.amountCents ?? 0)}</p>
          <p className="text-[12px] text-white/35 mt-1 mb-6">All time · all schools</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
              <p className="text-[11px] text-white/35">This month</p>
              <p className="text-lg font-bold text-white/85 tabular-nums mt-0.5">{centsToUsd(monthlyRev._sum.amountCents ?? 0)}</p>
            </div>
            <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
              <p className="text-[11px] text-white/35">Last 30 days</p>
              <p className="text-lg font-bold text-white/85 tabular-nums mt-0.5">{centsToUsd(last30Rev._sum.amountCents ?? 0)}</p>
            </div>
          </div>
        </div>

        {[
          { label: "Schools",           value: totalSchools,       icon: "🏫", color: "text-indigo-300",  href: "/platform/schools" },
          { label: "Students",          value: totalStudents,      icon: "👥", color: "text-sky-300",     href: null },
          { label: "Teachers",          value: totalTeachers,      icon: "📚", color: "text-violet-300",  href: null },
          { label: "Pending Approvals", value: pendingOnboarding,  icon: "📋", color: pendingOnboarding > 0 ? "text-amber-300" : "text-white/60", href: null },
          { label: "Custom Plans",      value: customPlans.length, icon: "💎", color: "text-teal-300",    href: null },
        ].map(s => (
          <div key={s.label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5 hover:bg-white/[0.06] transition-all">
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className={`text-xl sm:text-2xl font-bold tabular-nums ${s.color}`}>{s.value.toLocaleString()}</div>
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
            {s.href && (
              <Link href={s.href} className="mt-3 inline-flex text-[11px] text-indigo-300/70 hover:text-indigo-200 transition">
                View →
              </Link>
            )}
          </div>
        ))}
      </div>

      {isSuperAdmin && (
        <Card title="Quick Access" accent="teal">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { href: "/platform/schools/new", icon: "➕", label: "Add School" },
              { href: "/platform/subscriptions", icon: "💎", label: "Subscriptions" },
              { href: "/platform/audit", icon: "🧾", label: "Audit Logs" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[13px] border border-white/[0.07] bg-white/[0.03]
                           px-3.5 py-3 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[13px] font-medium text-white/80">{item.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card title={`Schools${schools.length > 0 ? ` · ${schools.length} shown` : ""}`}>
          {schools.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/40">No schools match your filters.</div>
          ) : (
            <div className="divide-y divide-white/[0.06] mt-2">
              {schools.map((s, i) => {
                const planLabel = s.subscription?.plan === "CUSTOM"
                  ? (s.subscription.customPlan?.name ?? "Custom") : (s.subscription?.plan ?? "TRIAL");
                return (
                  <div key={s.id} className={`flex flex-col sm:flex-row sm:flex-wrap items-start gap-3 sm:gap-4 px-2 py-4 hover:bg-white/[0.03] transition
                                               ${i === 0 ? "rounded-t-[14px]" : ""}
                                               ${i === schools.length-1 ? "rounded-b-[14px]" : ""}`}>
                    {/* Info */}
                    <Link href={`/platform/schools/${s.id}`} className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-white/90">{s.name}</span>
                        <span className="text-[12px] text-white/35">({s.slug})</span>
                        <Badge tone={s.isActive ? "success" : "danger"} dot>{s.isActive ? "Active" : "Inactive"}</Badge>
                        <Badge tone={planTone(planLabel)}>{planLabel}</Badge>
                      </div>
                      <div className="text-[12px] text-white/40 mt-1 flex flex-wrap gap-3">
                        <span>💳 {centsToUsd(s.subscription?.amountCents ?? 0)}</span>
                        <span>👥 {s.students.length} students</span>
                        <span>🏫 {s.users.length} users</span>
                        {s.subscription?.endsAt && <span>Expires {s.subscription.endsAt.toDateString()}</span>}
                      </div>
                    </Link>
                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                      <Link href={`/login?schoolSlug=${encodeURIComponent(s.slug)}`}>
                        <Button variant="secondary" size="sm" className="w-full sm:w-auto">School login</Button>
                      </Link>
                      <ImpersonateLauncher schoolId={s.id} schoolName={s.name} />
                      
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
