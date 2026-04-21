import Link from "next/link";
import { Badge, Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";
import { ImpersonateLauncher } from "./ui";
import { PlatformControls, PlatformRowActions } from "./ui-controls";
import type { Plan } from "@prisma/client";

export default async function PlatformHomePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const { user } = await requirePlatformUser();
  const { q, status, plan } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = status === "active" ? true : status === "inactive" ? false : null;
  const customPlanIdFilter = plan?.startsWith("CUSTOM:") ? plan.slice("CUSTOM:".length) : null;
  const planFilter: Plan | null =
    plan && ["PREMIUM", "DEFAULT", "UNLIMITED", "BETA", "CUSTOM"].includes(plan)
      ? (plan as Plan)
      : null;

  const customPlans = await prisma.customSubscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true }
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const assignedSchoolIds =
    user.role === "SUPER_ADMIN"
      ? null
      : (
          await prisma.platformUserSchoolAssignment.findMany({
            where: { platformUserId: user.id },
            select: { schoolId: true }
          })
        ).map((a) => a.schoolId);

  const [schools, totalSchools, totalStudents, totalTeachers, totalRevenueAgg, monthlyRevenueAgg, last30RevenueAgg, pendingOnboarding] =
    await Promise.all([
      prisma.school.findMany({
        where: {
          ...(query
            ? {
                OR: [
                  { name: { contains: query } },
                  { slug: { contains: query } }
                ]
              }
            : {}),
          ...(statusFilter === null ? {} : { isActive: statusFilter }),
          ...(assignedSchoolIds ? { id: { in: assignedSchoolIds } } : {}),
          ...(customPlanIdFilter
            ? { subscription: { is: { plan: "CUSTOM", customPlanId: customPlanIdFilter } } }
            : planFilter
              ? { subscription: { is: { plan: planFilter } } }
              : {})
        },
        include: { subscription: { include: { customPlan: true } }, users: { select: { id: true } }, students: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
        take: 200
      }),
      prisma.school.count(assignedSchoolIds ? { where: { id: { in: assignedSchoolIds } } } : undefined),
      prisma.student.count(assignedSchoolIds ? { where: { schoolId: { in: assignedSchoolIds } } } : undefined),
      prisma.user.count({
        where: {
          ...(assignedSchoolIds ? { schoolId: { in: assignedSchoolIds } } : {}),
          schoolRole: {
            key: { in: ["TEACHER", "CLASS_TEACHER"] }
          }
        }
      }),
      prisma.feePayment.aggregate({
        where: assignedSchoolIds ? { invoice: { schoolId: { in: assignedSchoolIds } } } : undefined,
        _sum: { amountCents: true }
      }),
      prisma.feePayment.aggregate({
        where: {
          ...(assignedSchoolIds ? { invoice: { schoolId: { in: assignedSchoolIds } } } : {}),
          paidAt: { gte: monthStart }
        },
        _sum: { amountCents: true }
      }),
      prisma.feePayment.aggregate({
        where: {
          ...(assignedSchoolIds ? { invoice: { schoolId: { in: assignedSchoolIds } } } : {}),
          paidAt: { gte: last30Days }
        },
        _sum: { amountCents: true }
      }),
      user.role === "SUPER_ADMIN" ? prisma.schoolOnboardingRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0)
    ]);
  const totalRevenueCents = totalRevenueAgg._sum.amountCents ?? 0;
  const monthlyRevenueCents = monthlyRevenueAgg._sum.amountCents ?? 0;
  const last30RevenueCents = last30RevenueAgg._sum.amountCents ?? 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-blue-500/10 p-6 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.45)]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Platform Dashboard</div>
          <div className="text-sm text-white/70">Manage schools, plans, revenue, and support operations from one place.</div>
        </div>
        {user.role === "SUPER_ADMIN" ? (
          <Link href="/platform/schools/new">
            <Button>+ Add school</Button>
          </Link>
        ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-fr">
        <div className="md:col-span-2 md:row-span-2 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/[0.13]">
          <div className="text-sm text-white/70">Total Revenue</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight">{centsToUsd(totalRevenueCents)}</div>
          <div className="mt-2 text-xs text-white/70">All schools combined</div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-3">
              <div className="text-xs text-white/60">This Month</div>
              <div className="mt-1 text-xl font-semibold">{centsToUsd(monthlyRevenueCents)}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-3">
              <div className="text-xs text-white/60">Last 30 Days</div>
              <div className="mt-1 text-xl font-semibold">{centsToUsd(last30RevenueCents)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/[0.13]">
          <div className="text-sm text-white/70">Total Schools</div>
          <div className="mt-2 text-3xl font-semibold">{totalSchools}</div>
          <div className="mt-1 text-xs text-white/70">Platform-wide schools</div>
          <Link href="/platform/schools" className="mt-3 inline-flex text-xs text-cyan-200 hover:text-cyan-100">
            Open schools →
          </Link>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/[0.13]">
          <div className="text-sm text-white/70">Total Students</div>
          <div className="mt-2 text-3xl font-semibold">{totalStudents}</div>
          <div className="mt-1 text-xs text-white/70">Across all schools</div>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/[0.13]">
          <div className="text-sm text-white/70">Total Teachers</div>
          <div className="mt-2 text-3xl font-semibold">{totalTeachers}</div>
          <div className="mt-1 text-xs text-white/70">Teacher + Class Teacher roles</div>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/[0.13]">
          <div className="text-sm text-white/70">Pending Onboarding</div>
          <div className="mt-2 text-3xl font-semibold">{pendingOnboarding}</div>
          {user.role === "SUPER_ADMIN" ? (
            <Link href="/platform/onboarding-requests" className="mt-3 inline-flex text-xs text-cyan-200 hover:text-cyan-100">
              Open approvals →
            </Link>
          ) : null}
        </div>
      </div>

      <PlatformControls q={query} status={status ?? ""} plan={plan ?? ""} customPlans={customPlans} />

      <Card title="Schools">
        <div className="text-sm text-white/60">{schools.length} schools</div>
        <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {schools.map((s) => (
            <div key={s.id} className="px-4 py-3 transition duration-200 hover:bg-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Link href={user.role === "SUPER_ADMIN" ? `/platform/schools/${s.id}` : "/platform"} className="min-w-0 flex-1">
                  <div className="font-medium flex flex-wrap items-center gap-2 min-w-0">
                    <span className="truncate max-w-[18rem] sm:max-w-[26rem]">{s.name}</span>
                    <span className="text-xs text-white/50 truncate max-w-[10rem]">({s.slug})</span>
                    <Badge tone={s.isActive ? "success" : "danger"}>
                      {s.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Plan: {s.subscription?.plan === "CUSTOM" ? (s.subscription.customPlan?.name ?? "Custom") : (s.subscription?.plan ?? "TRIAL")} • Ends:{" "}
                    {s.subscription?.endsAt ? s.subscription.endsAt.toDateString() : "—"} • Amount: {centsToUsd(s.subscription?.amountCents ?? 0)} • Users:{" "}
                    {s.users.length} • Students: {s.students.length}
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Link href={`/login?schoolSlug=${encodeURIComponent(s.slug)}`} className="shrink-0">
                    <Button variant="secondary">School login</Button>
                  </Link>
                  <div className="shrink-0">
                    <ImpersonateLauncher schoolId={s.id} schoolName={s.name} />
                  </div>
                  {user.role === "SUPER_ADMIN" ? (
                    <PlatformRowActions
                      schoolId={s.id}
                      isActive={s.isActive}
                      currentPlan={
                        s.subscription?.plan === "CUSTOM" && s.subscription.customPlanId
                          ? `CUSTOM:${s.subscription.customPlanId}`
                          : (s.subscription?.plan ?? "TRIAL")
                      }
                      customPlans={customPlans}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {schools.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No schools onboarded yet.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function centsToUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(cents / 100);
}
