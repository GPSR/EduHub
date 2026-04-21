import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function ReportsPage() {
  const session = await requireSession();

  const [students, users, feeAgg, absentToday] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({ where: { schoolId: session.schoolId } }),
    prisma.feeInvoice.aggregate({
      where: { schoolId: session.schoolId },
      _sum: { amountCents: true }
    }),
    prisma.attendanceRecord.count({
      where: {
        schoolId: session.schoolId,
        date: new Date(new Date().toISOString().slice(0, 10)),
        status: { in: ["ABSENT", "LEAVE"] }
      }
    })
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="High-level reports">
        <div className="space-y-2 text-sm">
          <div>Total students: {students}</div>
          <div>Total users: {users}</div>
          <div>Total invoiced: ${centsToDollars(feeAgg._sum.amountCents ?? 0)}</div>
          <div>Absent/leave today: {absentToday}</div>
        </div>
      </Card>
      <Card title="Notes">
        <div className="text-sm text-white/70">
          This MVP report is intentionally simple. Next: monthly revenue, class-wise strength, fee aging,
          exam analytics, and staff activity.
        </div>
      </Card>
    </div>
  );
}

