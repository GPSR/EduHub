import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function receiptNumber(paymentId: string, reference?: string | null) {
  const ref = String(reference ?? "").trim();
  if (ref) return ref;
  return `RCPT-${paymentId.slice(-8).toUpperCase()}`;
}

export default async function FeePaymentReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; paymentId: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  await requirePermission("FEES", "VIEW");
  const session = await requireSession();
  const { id: invoiceId, paymentId } = await params;
  const { ay } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;

  const payment = await db.feePayment.findFirst({
    where: {
      id: paymentId,
      invoice:
        session.roleKey === "PARENT"
          ? {
              id: invoiceId,
              schoolId: session.schoolId,
              academicYearId: selectedYear.id,
              student: { parents: { some: { userId: session.userId } } },
            }
          : { id: invoiceId, schoolId: session.schoolId, academicYearId: selectedYear.id },
    },
    include: {
      invoice: {
        include: {
          school: { select: { name: true, slug: true } },
          student: { select: { fullName: true, studentId: true, admissionNo: true } },
          payments: { select: { amountCents: true } },
        },
      },
    },
  });
  if (!payment) return notFound();

  const totalPaidCents = payment.invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = Math.max(0, payment.invoice.amountCents - totalPaidCents);
  const generatedReceiptNo = receiptNumber(payment.id, payment.reference);

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href={withAcademicYearParam(`/fees/${payment.invoice.id}`, selectedYear.id)} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Back to invoice
      </Link>

      <Card title="School Payment Receipt" description="Generated from recorded payment entry" accent="emerald">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] text-white/55">{payment.invoice.school.name}</p>
            <h1 className="mt-0.5 text-lg font-bold text-white/95">{payment.invoice.title}</h1>
            <p className="mt-1 text-sm text-white/55">
              {payment.invoice.student.fullName} · ID {payment.invoice.student.studentId}
              {payment.invoice.student.admissionNo ? ` · ADM ${payment.invoice.student.admissionNo}` : ""}
            </p>
          </div>
          <div className="text-right">
            <Badge tone="success">Payment Received</Badge>
            <p className="mt-2 text-2xl font-bold text-emerald-300 tabular-nums">{fmt(payment.amountCents)}</p>
            <p className="text-[11px] text-white/45">Received amount</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label="Receipt number" value={generatedReceiptNo} />
          <Info label="Payment date" value={payment.paidAt.toDateString()} />
          <Info label="Method" value={payment.method ?? "Payment"} />
          <Info label="Reference" value={payment.reference ?? "—"} />
          <Info label="Total paid (invoice)" value={fmt(totalPaidCents)} />
          <Info label="Remaining balance" value={fmt(balanceCents)} />
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-white/90 break-words">{value}</p>
    </div>
  );
}

