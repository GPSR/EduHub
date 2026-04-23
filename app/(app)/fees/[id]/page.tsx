import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input, Label, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function statusTone(s: string): "success" | "danger" | "warning" | "neutral" {
  return s === "PAID" ? "success" : s === "OVERDUE" ? "danger" : s === "PENDING" ? "warning" : "neutral";
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("FEES", "VIEW");
  const session = await requireSession();
  const { id } = await params;
  const perms = await getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId });
  const canWrite = perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false;

  const invoice = await prisma.feeInvoice.findFirst({
    where:
      session.roleKey === "PARENT"
        ? { id, schoolId: session.schoolId, student: { parents: { some: { userId: session.userId } } } }
        : { id, schoolId: session.schoolId },
    include: { student: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!invoice) return notFound();

  const paidCents    = invoice.payments.reduce((a, p) => a + p.amountCents, 0);
  const balanceCents = Math.max(0, invoice.amountCents - paidCents);
  const pct          = invoice.amountCents > 0 ? Math.min(100, Math.round((paidCents / invoice.amountCents) * 100)) : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/fees" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
        ← Fee Invoices
      </Link>

      {/* Invoice hero */}
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white/95 tracking-tight">{invoice.title}</h1>
            <p className="text-sm text-white/50 mt-1">{invoice.student.fullName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
              {invoice.dueOn && (
                <Badge tone="neutral">Due {invoice.dueOn.toDateString()}</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold text-white/95 tabular-nums">{fmt(invoice.amountCents)}</p>
            <p className="text-sm text-white/45 mt-0.5">Total amount</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-[12px] text-white/45 mb-1.5">
            <span>{pct}% collected</span>
            <span>{fmt(balanceCents)} remaining</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4 border-t border-white/[0.07] pt-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 font-medium">Invoiced</p>
            <p className="text-[18px] font-bold text-white/85 mt-1 tabular-nums">{fmt(invoice.amountCents)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 font-medium">Paid</p>
            <p className="text-[18px] font-bold text-emerald-300 mt-1 tabular-nums">{fmt(paidCents)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 font-medium">Balance</p>
            <p className={`text-[18px] font-bold mt-1 tabular-nums ${balanceCents > 0 ? "text-amber-300" : "text-white/50"}`}>
              {fmt(balanceCents)}
            </p>
          </div>
        </div>
      </div>

      {/* Payments list */}
      <Card title="Payment History" accent="emerald">
        {invoice.payments.length === 0 ? (
          <EmptyState icon="💳" title="No payments recorded" description="Record the first payment below." />
        ) : (
          <div className="divide-y divide-white/[0.06] mt-2">
            {invoice.payments.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-4 py-3.5 px-1
                             ${i === 0 ? "rounded-t-[12px]" : ""}
                             ${i === invoice.payments.length - 1 ? "rounded-b-[12px]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-emerald-500/15 border border-emerald-500/25">
                    <span className="text-sm">💳</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-emerald-300">{fmt(p.amountCents)}</p>
                    <p className="text-[12px] text-white/40">
                      {p.method ?? "Payment"}{p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-white/35">{p.paidAt.toDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {canWrite && balanceCents > 0 && (
        <AddPaymentCard invoiceId={invoice.id} defaultAmount={balanceCents / 100} />
      )}
    </div>
  );
}

async function AddPaymentCard({ invoiceId, defaultAmount }: { invoiceId: string; defaultAmount: number }) {
  const { addPaymentAction } = await import("../actions");
  return (
    <Card title="Record Payment" accent="indigo">
      <form action={addPaymentAction} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div>
          <Label required>Amount ($)</Label>
          <Input name="amount" type="number" step="0.01" defaultValue={defaultAmount.toFixed(2)} required />
        </div>
        <div>
          <Label>Method</Label>
          <Input name="method" placeholder="Cash / Card / Online" />
        </div>
        <div>
          <Label>Reference</Label>
          <Input name="reference" placeholder="Txn ID or receipt no." />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <Button type="submit">Record payment</Button>
        </div>
      </form>
    </Card>
  );
}
