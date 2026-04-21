import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

export default async function PlatformSchoolDashboardPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const school = await prisma.school.findUnique({
    where: { id },
    include: { subscription: { include: { customPlan: true } } }
  });
  if (!school) return notFound();

  const [students, teachers, users, invoices, payments] = await Promise.all([
    prisma.student.count({ where: { schoolId: id } }),
    prisma.user.count({ where: { schoolId: id, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } } }),
    prisma.user.count({ where: { schoolId: id } }),
    prisma.feeInvoice.aggregate({ where: { schoolId: id }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.feePayment.aggregate({
      where: { invoice: { schoolId: id } },
      _sum: { amountCents: true },
      _count: { _all: true }
    })
  ]);

  const invoiced = invoices._sum.amountCents ?? 0;
  const collected = payments._sum.amountCents ?? 0;
  const pending = Math.max(0, invoiced - collected);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{school.name} Dashboard</div>
          <div className="text-sm text-white/60">
            {school.slug} • Plan:{" "}
            {school.subscription?.plan === "CUSTOM" ? (school.subscription.customPlan?.name ?? "Custom") : (school.subscription?.plan ?? "N/A")}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/platform/schools" className="text-sm text-white/70 hover:text-white">
            ← Schools list
          </Link>
          <Link href={`/platform/schools/${school.id}`} className="text-sm text-indigo-300 hover:text-indigo-200">
            Manage school →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Students">
          <div className="text-2xl font-semibold">{students}</div>
        </Card>
        <Card title="Teachers">
          <div className="text-2xl font-semibold">{teachers}</div>
        </Card>
        <Card title="Users">
          <div className="text-2xl font-semibold">{users}</div>
        </Card>
        <Card title="Invoices">
          <div className="text-2xl font-semibold">{invoices._count._all}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Invoiced">
          <div className="text-xl font-semibold">{centsToUsd(invoiced)}</div>
        </Card>
        <Card title="Collected Revenue">
          <div className="text-xl font-semibold">{centsToUsd(collected)}</div>
          <div className="text-xs text-white/60 mt-1">{payments._count._all} payments</div>
        </Card>
        <Card title="Pending Amount">
          <div className="text-xl font-semibold">{centsToUsd(pending)}</div>
        </Card>
      </div>
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
