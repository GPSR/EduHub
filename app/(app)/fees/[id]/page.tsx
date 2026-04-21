import { notFound } from "next/navigation";
import { Card, Button, Input, Label } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canWrite = perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false;

  const invoice = await prisma.feeInvoice.findFirst({
    where:
      session.roleKey === "PARENT"
        ? { id, schoolId: session.schoolId, student: { parents: { some: { userId: session.userId } } } }
        : { id, schoolId: session.schoolId },
    include: { student: true, payments: true }
  });
  if (!invoice) return notFound();

  const paidCents = invoice.payments.reduce((acc, p) => acc + p.amountCents, 0);
  const balanceCents = Math.max(0, invoice.amountCents - paidCents);

  return (
    <div className="space-y-6">
      <Card title="Invoice">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Field label="Student" value={invoice.student.fullName} />
          <Field label="Title" value={invoice.title} />
          <Field label="Status" value={invoice.status} />
          <Field label="Amount" value={`$${centsToDollars(invoice.amountCents)}`} />
          <Field label="Paid" value={`$${centsToDollars(paidCents)}`} />
          <Field label="Balance" value={`$${centsToDollars(balanceCents)}`} />
        </div>
      </Card>

      <Card title="Payments">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {invoice.payments.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">${centsToDollars(p.amountCents)}</div>
                <div className="text-xs text-white/60">
                  {p.method ?? "—"} {p.reference ? `• ${p.reference}` : ""}
                </div>
              </div>
              <div className="text-xs text-white/50">{p.paidAt.toDateString()}</div>
            </div>
          ))}
          {invoice.payments.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No payments recorded yet.</div>
          ) : null}
        </div>
      </Card>

      {canWrite ? (
        <AddPaymentCard invoiceId={invoice.id} defaultAmount={balanceCents / 100} />
      ) : null}
    </div>
  );
}

async function AddPaymentCard({ invoiceId, defaultAmount }: { invoiceId: string; defaultAmount: number }) {
  const { addPaymentAction } = await import("../actions");
  return (
    <Card title="Add Payment">
      <form action={addPaymentAction} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div>
          <Label>Amount</Label>
          <Input name="amount" type="number" step="0.01" defaultValue={defaultAmount.toFixed(2)} required />
        </div>
        <div>
          <Label>Method</Label>
          <Input name="method" placeholder="CASH / CARD / ONLINE" />
        </div>
        <div>
          <Label>Reference</Label>
          <Input name="reference" placeholder="Txn ID / receipt no." />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <Button type="submit">Record payment</Button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
      <div className="text-white/60">{label}</div>
      <div className="mt-1 text-white/90 break-words">{value}</div>
    </div>
  );
}
