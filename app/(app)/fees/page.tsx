import Link from "next/link";
import { Card, Button, Badge, Label, SectionHeader, EmptyState } from "@/components/ui";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { sendPendingFeeRemindersAction } from "./actions";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function statusTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "PENDING" || status === "DUE" || status === "PARTIAL") return "warning";
  return "neutral";
}

type FeesStatusFilter = "ALL" | "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "DUE";

function normalizeFeesStatusFilter(raw?: string): FeesStatusFilter {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "PENDING") return "PENDING";
  if (value === "PAID") return "PAID";
  if (value === "PARTIAL") return "PARTIAL";
  if (value === "OVERDUE") return "OVERDUE";
  if (value === "DUE") return "DUE";
  return "ALL";
}

function buildFeesListPath(args: {
  academicYearId: string;
  query: string;
  classId: string;
  status: FeesStatusFilter;
}) {
  const params = new URLSearchParams();
  params.set("ay", args.academicYearId);
  if (args.query) params.set("q", args.query);
  if (args.classId) params.set("classId", args.classId);
  if (args.status !== "ALL") params.set("status", args.status);
  return `/fees?${params.toString()}`;
}

export default async function FeesPage({
  searchParams
}: {
  searchParams: Promise<{ reminder?: string; count?: string; ay?: string; q?: string; classId?: string; status?: string }>;
}) {
  await requirePermission("FEES", "VIEW");
  const session = await requireSession();
  const { reminder, count, ay, q, classId, status } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const isYearWritable = selectedYear.status !== "CLOSED";
  const searchQuery = String(q ?? "").trim();
  const selectedClassId = String(classId ?? "").trim();
  const statusFilter = normalizeFeesStatusFilter(status);
  const hasActiveFilters = Boolean(searchQuery || selectedClassId || statusFilter !== "ALL");
  const currentListPath = buildFeesListPath({
    academicYearId: selectedYear.id,
    query: searchQuery,
    classId: selectedClassId,
    status: statusFilter
  });
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = isYearWritable && (perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false);

  const invoiceWhere: Prisma.FeeInvoiceWhereInput = {
    schoolId: session.schoolId,
    academicYearId: selectedYear.id,
  };
  const studentWhere: Prisma.StudentWhereInput = {};
  if (session.roleKey === "PARENT") {
    studentWhere.parents = { some: { userId: session.userId } };
  }
  if (selectedClassId) {
    studentWhere.classId = selectedClassId;
  }
  if (searchQuery) {
    studentWhere.OR = [
      { fullName: { contains: searchQuery, mode: "insensitive" } },
      { studentId: { contains: searchQuery, mode: "insensitive" } },
      { admissionNo: { contains: searchQuery, mode: "insensitive" } }
    ];
  }
  if (Object.keys(studentWhere).length > 0) {
    invoiceWhere.student = studentWhere;
  }
  if (statusFilter === "PENDING") {
    invoiceWhere.status = { not: "PAID" };
  } else if (statusFilter !== "ALL") {
    invoiceWhere.status = statusFilter;
  }

  const invoices = await db.feeInvoice.findMany({
    where: invoiceWhere,
    include: { student: { include: { class: true } }, payments: { select: { amountCents: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const classes =
    session.roleKey !== "PARENT"
      ? await db.class.findMany({
          where: { schoolId: session.schoolId },
          select: { id: true, name: true, section: true },
          orderBy: [{ name: "asc" }, { section: "asc" }]
        })
      : [];

  const paidCents = invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((paymentSum, payment) => paymentSum + payment.amountCents, 0),
    0
  );
  const outstandingCents = invoices.reduce((sum, inv) => {
    const invoicePaid = inv.payments.reduce((paymentSum, payment) => paymentSum + payment.amountCents, 0);
    return sum + Math.max(0, inv.amountCents - invoicePaid);
  }, 0);
  const pendingCount = invoices.reduce((countSum, inv) => {
    const invoicePaid = inv.payments.reduce((paymentSum, payment) => paymentSum + payment.amountCents, 0);
    return countSum + (Math.max(0, inv.amountCents - invoicePaid) > 0 ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-5 animate-fade-up">
      {!isYearWritable ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Academic year {selectedYear.name} is closed. Invoices are read-only.
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <SectionHeader title="Fee Invoices" subtitle={`${invoices.length} ${hasActiveFilters ? "matching" : "total"} invoices · ${selectedYear.name}`} />
        {canWrite && pendingCount > 0 && (
          <form action={sendPendingFeeRemindersAction}>
            <input type="hidden" name="returnTo" value={currentListPath} />
            <input type="hidden" name="academicYearId" value={selectedYear.id} />
            <Button type="submit" variant="secondary" size="sm">Send Pending Reminders</Button>
          </form>
        )}
      </div>

      {reminder === "bulk_sent" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Fee reminders sent successfully{count ? ` for ${count} student${count === "1" ? "" : "s"}` : ""}.
        </div>
      )}
      {reminder === "sent" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Fee reminder sent successfully.
        </div>
      )}
      {reminder === "none" && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No pending fee balances found for reminders.
        </div>
      )}
      {reminder === "already_paid" && (
        <div className="rounded-2xl border border-white/[0.14] bg-white/[0.06] px-4 py-3 text-sm text-white/85">
          This invoice is already paid. Reminder was not sent.
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Invoiced", value: `$${centsToDollars(outstandingCents)}`, color: outstandingCents > 0 ? "text-amber-300" : "text-white/85" },
          { label: "Collected",      value: `$${centsToDollars(paidCents)}`,  color: "text-emerald-300" },
          { label: "Pending",        value: pendingCount,                     color: pendingCount > 0 ? "text-amber-300" : "text-white/85" },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-2.5 sm:px-4 py-3 sm:py-3.5 text-center">
            <div className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-white/40 mt-1 font-medium uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <input type="hidden" name="ay" value={selectedYear.id} />
          <div className="md:col-span-2">
            <Label>Search student or ID</Label>
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Student name, student ID, admission number"
              className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            />
          </div>
          <div>
            <Label>Class</Label>
            <select
              name="classId"
              defaultValue={selectedClassId}
              className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.section ? ` - ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fee status</Label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="DUE">Due</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <Link href={withAcademicYearParam("/fees", selectedYear.id)}>
              <Button type="button" variant="ghost" size="sm">Reset</Button>
            </Link>
            <Button type="submit" variant="secondary" size="sm">Apply Filters</Button>
          </div>
        </form>
      </Card>

      {/* Invoice list */}
      <Card>
        {invoices.length === 0 ? (
          <EmptyState
            icon="💳"
            title={hasActiveFilters ? "No matching invoices" : "No invoices yet"}
            description={hasActiveFilters ? "Try changing search or filters." : "Create your first invoice to get started."}
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {invoices.map((inv, i) => (
              <Link
                key={inv.id}
                href={withAcademicYearParam(`/fees/${inv.id}`, selectedYear.id)}
                className={`flex items-start sm:items-center gap-3 px-3.5 sm:px-4 py-3.5 sm:py-4 hover:bg-white/[0.04] transition-colors
                            ${i === 0 ? "rounded-t-[14px]" : ""}
                            ${i === invoices.length - 1 ? "rounded-b-[14px]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] sm:text-[14px] font-semibold text-white/90 line-clamp-1">{inv.title}</span>
                    <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                  </div>
                  <div className="text-[12px] text-white/45 mt-1">
                    {inv.student.fullName}
                    {` · ID ${inv.student.studentId}`}
                    {inv.student.class ? ` · ${inv.student.class.name}${inv.student.class.section ? `-${inv.student.class.section}` : ""}` : ""}
                    {` · ${inv.createdAt.toDateString()}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] sm:text-[15px] font-bold text-white/85 shrink-0">${centsToDollars(inv.amountCents)}</div>
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

    </div>
  );
}
