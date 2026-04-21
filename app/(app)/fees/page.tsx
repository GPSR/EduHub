import Link from "next/link";
import { Card, Button, Badge, Label, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function statusTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "PENDING") return "warning";
  return "neutral";
}

export default async function FeesPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false;

  const invoices =
    session.roleKey === "PARENT"
      ? await prisma.feeInvoice.findMany({
          where: { schoolId: session.schoolId, student: { parents: { some: { userId: session.userId } } } },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : await prisma.feeInvoice.findMany({
          where: { schoolId: session.schoolId },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

  const totalCents = invoices.reduce((sum, inv) => sum + inv.amountCents, 0);
  const paidCents = invoices.filter(i => i.status === "PAID").reduce((sum, inv) => sum + inv.amountCents, 0);
  const pendingCount = invoices.filter(i => i.status !== "PAID").length;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Fee Invoices" subtitle={`${invoices.length} total invoices`} />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Invoiced", value: `$${centsToDollars(totalCents)}`, color: "text-white/85" },
          { label: "Collected",      value: `$${centsToDollars(paidCents)}`,  color: "text-emerald-300" },
          { label: "Pending",        value: pendingCount,                     color: pendingCount > 0 ? "text-amber-300" : "text-white/85" },
        ].map(s => (
          <div key={s.label} className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-white/40 mt-1 font-medium uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      <Card>
        {invoices.length === 0 ? (
          <EmptyState icon="💳" title="No invoices yet" description="Create your first invoice to get started." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {invoices.map((inv, i) => (
              <Link
                key={inv.id}
                href={`/fees/${inv.id}`}
                className={`flex items-center gap-4 px-4 py-4 hover:bg-white/[0.04] transition-colors
                            ${i === 0 ? "rounded-t-[14px]" : ""}
                            ${i === invoices.length - 1 ? "rounded-b-[14px]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-white/90">{inv.title}</span>
                    <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                  </div>
                  <div className="text-[12px] text-white/45 mt-1">
                    {inv.student.fullName} · {inv.createdAt.toDateString()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[15px] font-bold text-white/85">${centsToDollars(inv.amountCents)}</div>
                  {inv.dueOn && (
                    <div className="text-[11px] text-white/35 mt-0.5">
                      Due {inv.dueOn.toDateString()}
                    </div>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/20 shrink-0">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {canWrite && <CreateInvoiceCard students={students} />}
    </div>
  );
}

async function CreateInvoiceCard({ students }: { students: { id: string; fullName: string }[] }) {
  const { createInvoiceAction } = await import("./actions");
  return (
    <Card title="New Invoice" description="Create a fee invoice for a student" accent="indigo">
      <form action={createInvoiceAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Student</Label>
          <select
            name="studentId"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            required
          >
            <option value="" disabled>Select student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Title</Label>
          <input
            name="title"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            placeholder="Tuition fee – April"
            required
          />
        </div>
        <div>
          <Label>Amount ($)</Label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            placeholder="100.00"
            required
          />
        </div>
        <div>
          <Label>Due date</Label>
          <input
            name="dueOn"
            type="date"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Create invoice</Button>
        </div>
      </form>
    </Card>
  );
}
