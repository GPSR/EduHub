import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function FeesPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canWrite = perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false;

  const invoices =
    session.roleKey === "PARENT"
      ? await prisma.feeInvoice.findMany({
          where: {
            schoolId: session.schoolId,
            student: { parents: { some: { userId: session.userId } } }
          },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        })
      : await prisma.feeInvoice.findMany({
          where: { schoolId: session.schoolId },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

  return (
    <div className="space-y-6">
      <Card title="Fee Invoices">
        <div className="text-sm text-white/60">{invoices.length} invoices</div>
        <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/fees/${inv.id}`} className="block px-4 py-3 hover:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{inv.title}</div>
                  <div className="text-xs text-white/60">
                    {inv.student.fullName} • ${centsToDollars(inv.amountCents)} • {inv.status}
                  </div>
                </div>
                <div className="text-xs text-white/50">{inv.createdAt.toDateString()}</div>
              </div>
            </Link>
          ))}
          {invoices.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No invoices yet.</div>
          ) : null}
        </div>
      </Card>

      {canWrite ? <CreateInvoiceCard students={students} /> : null}
    </div>
  );
}

async function CreateInvoiceCard({ students }: { students: { id: string; fullName: string }[] }) {
  const { createInvoiceAction } = await import("./actions");
  return (
    <Card title="Create Invoice">
      <form action={createInvoiceAction} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-sm text-white/70">Student</label>
          <select
            name="studentId"
            className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
            required
          >
            <option value="" disabled>
              Select student
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-white/70">Title</label>
          <input
            name="title"
            className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
            placeholder="Tuition fee - April"
            required
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Amount</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
            placeholder="100.00"
            required
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Due date</label>
          <input
            name="dueOn"
            type="date"
            className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <Button type="submit">Create invoice</Button>
        </div>
      </form>
    </Card>
  );
}
