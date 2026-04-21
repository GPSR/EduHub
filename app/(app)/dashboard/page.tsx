import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function DashboardPage() {
  const session = await requireSession();
  const [students, teachers, pendingFees, posts, school] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({
      where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } }
    }),
    prisma.feeInvoice.count({ where: { schoolId: session.schoolId, status: { not: "PAID" } } }),
    prisma.feedPost.count({ where: { schoolId: session.schoolId } }),
    prisma.school.findUnique({
      where: { id: session.schoolId },
      include: { subscription: true }
    })
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="School">
        <div className="text-white/80">{school?.name}</div>
        <div className="text-sm text-white/60 mt-1">
          Plan: {school?.subscription?.plan ?? "TRIAL"} • Status:{" "}
          {school?.isActive ? "Active" : "Inactive"}
        </div>
      </Card>
      <Card title="Quick stats">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Students" value={students} />
          <Stat label="Teachers" value={teachers} />
          <Stat label="Pending fees" value={pendingFees} />
          <Stat label="Feed posts" value={posts} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
      <div className="text-white/60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
