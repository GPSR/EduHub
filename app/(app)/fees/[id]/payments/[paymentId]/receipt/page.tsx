import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { ReceiptShareActions } from "@/components/receipt-share-actions";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";
import { getSchoolProfile } from "@/lib/school-profile";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function receiptNumber(paymentId: string, reference?: string | null) {
  const ref = String(reference ?? "").trim();
  if (ref) return ref;
  return `RCPT-${paymentId.slice(-8).toUpperCase()}`;
}

function splitCsv(raw?: string | null) {
  return String(raw ?? "")
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueList(items: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function classLabel(input: { name: string; section: string } | null) {
  if (!input) return "—";
  return input.section ? `${input.name}-${input.section}` : input.name;
}

function formatReceiptDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function parentDisplayNames(args: {
  fatherName?: string | null;
  motherName?: string | null;
  linkedParentNames: string[];
}) {
  const lines: string[] = [];
  if (args.fatherName) lines.push(`Father: ${args.fatherName}`);
  if (args.motherName) lines.push(`Mother: ${args.motherName}`);
  if (lines.length === 0 && args.linkedParentNames.length > 0) {
    lines.push(...args.linkedParentNames.map((name) => `Parent: ${name}`));
  }
  if (lines.length === 0) lines.push("Parent information not available");
  return lines;
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
          school: { select: { name: true, slug: true, brandingLogoUrl: true } },
          student: {
            select: {
              fullName: true,
              studentId: true,
              admissionNo: true,
              fatherName: true,
              motherName: true,
              parentMobiles: true,
              parentEmails: true,
              parentAddress: true,
              class: { select: { name: true, section: true } },
              parents: {
                orderBy: { createdAt: "asc" },
                select: { user: { select: { name: true, email: true, phoneNumber: true } } }
              }
            }
          },
          payments: { select: { amountCents: true } },
        },
      },
    },
  });
  if (!payment) return notFound();

  const schoolProfile = await getSchoolProfile(session.schoolId);
  const totalPaidCents = payment.invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = Math.max(0, payment.invoice.amountCents - totalPaidCents);
  const generatedReceiptNo = receiptNumber(payment.id, payment.reference);
  const receiptPath = withAcademicYearParam(`/fees/${payment.invoice.id}/payments/${payment.id}/receipt`, selectedYear.id);

  const linkedParents = payment.invoice.student.parents.map((p) => p.user);
  const linkedParentNames = uniqueList(
    linkedParents.map((parent) => parent.name.trim()).filter(Boolean)
  );
  const parentNameLines = parentDisplayNames({
    fatherName: payment.invoice.student.fatherName,
    motherName: payment.invoice.student.motherName,
    linkedParentNames
  });
  const parentEmailLines = uniqueList([
    ...linkedParents.map((parent) => String(parent.email ?? "").trim()),
    ...splitCsv(payment.invoice.student.parentEmails)
  ]).filter(Boolean);
  const parentMobileLines = uniqueList([
    ...linkedParents.map((parent) => String(parent.phoneNumber ?? "").trim()),
    ...splitCsv(payment.invoice.student.parentMobiles)
  ]).filter(Boolean);
  const studentClass = classLabel(payment.invoice.student.class);

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href={withAcademicYearParam(`/fees/${payment.invoice.id}`, selectedYear.id)} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Back to invoice
      </Link>

      <Card
        title="School Payment Receipt"
        description="Standard receipt generated from recorded payment"
        accent="emerald"
        action={
          <ReceiptShareActions
            receiptPath={receiptPath}
            receiptTitle={payment.invoice.title}
            studentName={payment.invoice.student.fullName}
          />
        }
      >
        <div className="rounded-[16px] border border-white/[0.10] bg-[#0f1728]/72 p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {payment.invoice.school.brandingLogoUrl ? (
                <Image
                  src={payment.invoice.school.brandingLogoUrl}
                  alt={payment.invoice.school.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-white/20 bg-white/[0.04] object-contain p-0.5"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full border border-white/[0.14] bg-white/[0.04] text-[11px] font-semibold text-white/75">
                  LOGO
                </div>
              )}
              <div>
                <p className="text-[18px] font-semibold text-white/95">{payment.invoice.school.name}</p>
                <p className="text-[12px] text-white/60">Academic Year: {selectedYear.name}</p>
                <p className="mt-1 max-w-[560px] whitespace-pre-wrap text-[12px] text-white/65">
                  {schoolProfile.address || "School address not configured"}
                </p>
              </div>
            </div>

            <div className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-right">
              <Badge tone="success">Payment Received</Badge>
              <p className="mt-2 text-2xl font-bold text-emerald-300 tabular-nums">{fmt(payment.amountCents)}</p>
              <p className="text-[11px] text-emerald-100/80">Received amount</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Info label="Receipt Number" value={generatedReceiptNo} />
            <Info label="Receipt Date" value={formatReceiptDate(payment.paidAt)} />
            <Info label="Payment Method" value={payment.method ?? "Payment"} />
            <Info label="Reference" value={payment.reference ?? "—"} />
            <Info label="Invoice Status" value={payment.invoice.status} />
            <Info label="Due Date" value={payment.invoice.dueOn ? formatReceiptDate(payment.invoice.dueOn) : "—"} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Student Information</p>
              <div className="mt-2 space-y-1.5 text-[13px] text-white/82">
                <p><span className="text-white/55">Student name:</span> {payment.invoice.student.fullName}</p>
                <p><span className="text-white/55">Student ID:</span> {payment.invoice.student.studentId}</p>
                <p><span className="text-white/55">Admission No:</span> {payment.invoice.student.admissionNo ?? "—"}</p>
                <p><span className="text-white/55">Class:</span> {studentClass}</p>
                <p><span className="text-white/55">Invoice:</span> {payment.invoice.title}</p>
              </div>
            </div>

            <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Parent Information</p>
              <div className="mt-2 space-y-1.5 text-[13px] text-white/82">
                <p className="text-white/55">Parent names:</p>
                <ul className="list-disc pl-4 text-[13px] text-white/85">
                  {parentNameLines.map((line) => <li key={line}>{line}</li>)}
                </ul>
                <p className="pt-1 text-white/55">Parent mobiles:</p>
                <p>{parentMobileLines.length ? parentMobileLines.join(", ") : "—"}</p>
                <p className="pt-1 text-white/55">Parent emails:</p>
                <p className="break-all">{parentEmailLines.length ? parentEmailLines.join(", ") : "—"}</p>
                <p className="pt-1 text-white/55">Parent address:</p>
                <p>{payment.invoice.student.parentAddress ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[12px] border border-white/[0.08]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Particulars</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Amount</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Invoice Total" value={fmt(payment.invoice.amountCents)} />
                <Row label="Received This Payment" value={fmt(payment.amountCents)} highlight />
                <Row label="Total Received So Far" value={fmt(totalPaidCents)} />
                <Row label="Pending Balance" value={fmt(balanceCents)} warning={balanceCents > 0} />
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/[0.08] pt-3 text-[12px] text-white/58 sm:grid-cols-2">
            <p>Receipt generated on {formatReceiptDate(new Date())}.</p>
            <p className="sm:text-right">This is a system-generated payment receipt.</p>
          </div>
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

function Row({ label, value, highlight = false, warning = false }: { label: string; value: string; highlight?: boolean; warning?: boolean }) {
  return (
    <tr className="border-t border-white/[0.08]">
      <td className="px-3 py-2 text-[13px] text-white/78">{label}</td>
      <td className={`px-3 py-2 text-right text-[13px] font-semibold tabular-nums ${warning ? "text-amber-300" : highlight ? "text-emerald-300" : "text-white/88"}`}>
        {value}
      </td>
    </tr>
  );
}
