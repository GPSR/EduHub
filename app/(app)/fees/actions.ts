"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { getAcademicYearContext, requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { resolveSchoolAppBaseUrl } from "@/lib/app-env";
import { sendTransactionalEmail } from "@/lib/mailer";
import { redirect } from "next/navigation";
import { z } from "zod";

async function notifyParentsForStudent(
  schoolId: string,
  studentId: string,
  payload: { title: string; body?: string }
) {
  const links = await db.studentParent.findMany({
    where: { schoolId, studentId },
    select: { userId: true }
  });
  if (!links.length) return;
  await db.notification.createMany({
    data: links.map((p) => ({
      schoolId,
      userId: p.userId,
      title: payload.title,
      body: payload.body ?? null
    }))
  });
}

function centsToUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function appendQuery(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function normalizeReturnPath(raw: string | undefined, fallback: string) {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return fallback;
  return trimmed;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitEmailCsv(raw?: string | null) {
  return String(raw ?? "")
    .split(/[,\n;]+/)
    .map((item) => normalizeEmail(item))
    .filter((item) => item.length > 0 && isValidEmail(item));
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function getParentReminderEmails(schoolId: string, studentId: string) {
  const [links, student] = await Promise.all([
    db.studentParent.findMany({
      where: { schoolId, studentId },
      select: { user: { select: { email: true } } }
    }),
    db.student.findFirst({
      where: { id: studentId, schoolId },
      select: { parentEmails: true }
    })
  ]);

  const emails = new Set<string>();
  for (const link of links) {
    const email = normalizeEmail(link.user.email);
    if (isValidEmail(email)) emails.add(email);
  }
  for (const email of splitEmailCsv(student?.parentEmails)) {
    emails.add(email);
  }
  return Array.from(emails);
}

function buildFeeReminderEmail(args: {
  schoolName: string;
  studentName: string;
  invoiceTitle: string;
  invoiceCount?: number;
  totalAmountCents: number;
  paidAmountCents: number;
  balanceAmountCents: number;
  dueOn?: Date | null;
  detailsUrl: string;
}) {
  const dueText = args.dueOn ? args.dueOn.toDateString() : "Not specified";
  const invoiceLabel =
    args.invoiceCount && args.invoiceCount > 1
      ? `${args.invoiceCount} invoices`
      : args.invoiceTitle;
  const subject = `Fee Reminder | ${args.studentName} | ${invoiceLabel}`;

  const text = [
    `School: ${args.schoolName}`,
    `Student: ${args.studentName}`,
    `Fee details: ${invoiceLabel}`,
    `Total amount: ${centsToUsd(args.totalAmountCents)}`,
    `Amount paid: ${centsToUsd(args.paidAmountCents)}`,
    `Balance amount: ${centsToUsd(args.balanceAmountCents)}`,
    `Due date: ${dueText}`,
    "",
    `Open details: ${args.detailsUrl}`
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:640px;margin:0 auto;">
    <h2 style="margin:0 0 10px;">Fee Reminder</h2>
    <p style="margin:0 0 14px;">Please review the latest fee summary for your child.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 14px;">
      <tr><td style="padding:6px 0;color:#475569;">School</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(args.schoolName)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Student</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(args.studentName)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Fee details</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(invoiceLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Total amount</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(centsToUsd(args.totalAmountCents))}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Amount paid</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(centsToUsd(args.paidAmountCents))}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Balance amount</td><td style="padding:6px 0;font-weight:700;color:#b45309;">${escapeHtml(centsToUsd(args.balanceAmountCents))}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Due date</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(dueText)}</td></tr>
    </table>
    <p style="margin:0 0 14px;">
      <a href="${escapeHtml(args.detailsUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
        Open Fee Details
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#64748b;">If payment is already completed, please ignore this reminder.</p>
  </div>`;

  return { subject, text, html };
}

async function sendFeeReminderEmailToParents(args: {
  schoolId: string;
  studentId: string;
  schoolName: string;
  studentName: string;
  invoiceTitle: string;
  invoiceCount?: number;
  totalAmountCents: number;
  paidAmountCents: number;
  balanceAmountCents: number;
  dueOn?: Date | null;
  detailsPath: string;
}) {
  const recipients = await getParentReminderEmails(args.schoolId, args.studentId);
  if (!recipients.length) return;

  const detailsUrl = `${resolveSchoolAppBaseUrl()}${args.detailsPath}`;
  const emailContent = buildFeeReminderEmail({
    schoolName: args.schoolName,
    studentName: args.studentName,
    invoiceTitle: args.invoiceTitle,
    invoiceCount: args.invoiceCount,
    totalAmountCents: args.totalAmountCents,
    paidAmountCents: args.paidAmountCents,
    balanceAmountCents: args.balanceAmountCents,
    dueOn: args.dueOn,
    detailsUrl
  });

  await Promise.all(
    recipients.map((to) =>
      sendTransactionalEmail({
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      })
    )
  );
}

const CreateInvoiceSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  dueOn: z.string().optional(),
  academicYearId: z.string().optional()
});

export async function createInvoiceAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");

  const parsed = CreateInvoiceSchema.safeParse({
    studentId: formData.get("studentId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    dueOn: formData.get("dueOn") || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });

  const student = await db.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { id: true, fullName: true }
  });
  if (!student) throw new Error("Student not found.");

  const invoice = await db.feeInvoice.create({
    data: {
      schoolId: session.schoolId,
      academicYearId: year.id,
      studentId: student.id,
      title: parsed.data.title,
      amountCents: Math.round(parsed.data.amount * 100),
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null
    }
  });

  await notifyParentsForStudent(session.schoolId, student.id, {
    title: `Fee reminder: ${invoice.title}`,
    body: `New fee invoice created for ${student.fullName}.\nLINK:${withAcademicYearParam(`/fees/${invoice.id}`, year.id)}`
  });

  redirect(withAcademicYearParam(`/fees/${invoice.id}`, year.id));
}

const AddPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional()
});

export async function addPaymentAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");

  const parsed = AddPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    method: formData.get("method") || undefined,
    reference: formData.get("reference") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const invoice = await db.feeInvoice.findFirst({
    where: { id: parsed.data.invoiceId, schoolId: session.schoolId },
    include: { payments: true, academicYear: { select: { id: true, name: true, status: true } } }
  });
  if (!invoice) throw new Error("Unable to process request.");
  if (invoice.academicYear.status === "CLOSED") {
    throw new Error(`Academic year ${invoice.academicYear.name} is closed and this invoice is read-only.`);
  }

  await db.feePayment.create({
    data: {
      invoiceId: invoice.id,
      amountCents: Math.round(parsed.data.amount * 100),
      method: parsed.data.method,
      reference: parsed.data.reference
    }
  });

  const paidCents =
    invoice.payments.reduce((acc, p) => acc + p.amountCents, 0) + Math.round(parsed.data.amount * 100);
  const newStatus = paidCents >= invoice.amountCents ? "PAID" : "PARTIAL";

  await db.feeInvoice.update({
    where: { id: invoice.id },
    data: { status: newStatus }
  });

  await notifyParentsForStudent(session.schoolId, invoice.studentId, {
    title: newStatus === "PAID" ? "Fee payment completed" : "Fee payment updated",
    body: `Invoice ${invoice.title} is now ${newStatus}.\nLINK:${withAcademicYearParam(`/fees/${invoice.id}`, invoice.academicYearId)}`
  });

  redirect(withAcademicYearParam(`/fees/${invoice.id}`, invoice.academicYearId));
}

const SendInvoiceReminderSchema = z.object({
  invoiceId: z.string().min(1),
  returnTo: z.string().optional()
});

export async function sendInvoiceReminderAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");
  const parsed = SendInvoiceReminderSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    returnTo: formData.get("returnTo") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process reminder.");

  const invoice = await db.feeInvoice.findFirst({
    where: { id: parsed.data.invoiceId, schoolId: session.schoolId },
    include: {
      school: { select: { name: true } },
      student: { select: { id: true, fullName: true } },
      payments: { select: { amountCents: true } }
    }
  });
  if (!invoice) throw new Error("Invoice not found.");

  const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingCents = Math.max(0, invoice.amountCents - paidCents);
  const returnTo = normalizeReturnPath(parsed.data.returnTo, withAcademicYearParam(`/fees/${invoice.id}`, invoice.academicYearId));
  const detailPath = withAcademicYearParam(`/fees/${invoice.id}`, invoice.academicYearId);

  if (pendingCents <= 0) {
    redirect(appendQuery(returnTo, "reminder", "already_paid"));
  }

  await notifyParentsForStudent(session.schoolId, invoice.student.id, {
    title: `Fee reminder: ${invoice.title}`,
    body: `Pending amount ${centsToUsd(pendingCents)} for ${invoice.student.fullName}.\nLINK:${detailPath}`
  });
  await sendFeeReminderEmailToParents({
    schoolId: session.schoolId,
    studentId: invoice.student.id,
    schoolName: invoice.school.name,
    studentName: invoice.student.fullName,
    invoiceTitle: invoice.title,
    totalAmountCents: invoice.amountCents,
    paidAmountCents: paidCents,
    balanceAmountCents: pendingCents,
    dueOn: invoice.dueOn,
    detailsPath: detailPath
  });

  redirect(appendQuery(returnTo, "reminder", "sent"));
}

const SendPendingFeeRemindersSchema = z.object({
  returnTo: z.string().optional(),
  academicYearId: z.string().optional()
});

export async function sendPendingFeeRemindersAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");
  const parsed = SendPendingFeeRemindersSchema.safeParse({
    returnTo: formData.get("returnTo") || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process reminder.");

  const context = await getAcademicYearContext({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });
  const selectedYearId = context.selectedYear.id;
  const returnTo = normalizeReturnPath(parsed.data.returnTo, withAcademicYearParam("/fees", selectedYearId));
  const pendingInvoices = await db.feeInvoice.findMany({
    where: { schoolId: session.schoolId, academicYearId: selectedYearId, status: { not: "PAID" } },
    include: {
      student: { select: { id: true, fullName: true } },
      payments: { select: { amountCents: true } }
    },
    take: 600
  });

  if (!pendingInvoices.length) {
    redirect(appendQuery(returnTo, "reminder", "none"));
  }

  const byStudent = new Map<
    string,
    { studentName: string; pendingCents: number; invoiceCount: number; totalAmountCents: number; paidAmountCents: number }
  >();

  for (const invoice of pendingInvoices) {
    const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const pendingCents = Math.max(0, invoice.amountCents - paidCents);
    if (pendingCents <= 0) continue;
    const existing = byStudent.get(invoice.student.id);
    if (!existing) {
      byStudent.set(invoice.student.id, {
        studentName: invoice.student.fullName,
        pendingCents,
        invoiceCount: 1,
        totalAmountCents: invoice.amountCents,
        paidAmountCents: paidCents
      });
      continue;
    }
    existing.pendingCents += pendingCents;
    existing.invoiceCount += 1;
    existing.totalAmountCents += invoice.amountCents;
    existing.paidAmountCents += paidCents;
  }

  if (byStudent.size === 0) {
    redirect(appendQuery(returnTo, "reminder", "none"));
  }

  const studentIds = Array.from(byStudent.keys());
  const parentLinks = await db.studentParent.findMany({
    where: { schoolId: session.schoolId, studentId: { in: studentIds } },
    select: { userId: true, studentId: true }
  });

  const notifications = parentLinks
    .map((link) => {
      const info = byStudent.get(link.studentId);
      if (!info) return null;
      return {
        schoolId: session.schoolId,
        userId: link.userId,
        title: `Fee reminder: ${info.studentName}`,
        body: `${info.invoiceCount} pending invoice${info.invoiceCount > 1 ? "s" : ""}. Pending amount ${centsToUsd(info.pendingCents)}.\nLINK:${withAcademicYearParam("/fees", selectedYearId)}`
      };
    })
    .filter((item): item is { schoolId: string; userId: string; title: string; body: string } => Boolean(item));

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications });
  }

  const school = await db.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true }
  });
  const schoolName = school?.name ?? "School";
  await Promise.all(
    Array.from(byStudent.entries()).map(([studentId, info]) =>
      sendFeeReminderEmailToParents({
        schoolId: session.schoolId,
        studentId,
        schoolName,
        studentName: info.studentName,
        invoiceTitle: "Pending fee summary",
        invoiceCount: info.invoiceCount,
        totalAmountCents: info.totalAmountCents,
        paidAmountCents: info.paidAmountCents,
        balanceAmountCents: info.pendingCents,
        detailsPath: withAcademicYearParam("/fees", selectedYearId)
      })
    )
  );

  let target = appendQuery(returnTo, "reminder", "bulk_sent");
  target = appendQuery(target, "count", String(byStudent.size));
  redirect(target);
}

const SendStudentFeeReminderSchema = z.object({
  studentId: z.string().min(1),
  returnTo: z.string().optional(),
  academicYearId: z.string().optional()
});

export async function sendStudentFeeReminderAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");
  const parsed = SendStudentFeeReminderSchema.safeParse({
    studentId: formData.get("studentId"),
    returnTo: formData.get("returnTo") || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process reminder.");

  const context = await getAcademicYearContext({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });
  const selectedYearId = context.selectedYear.id;
  const returnTo = normalizeReturnPath(
    parsed.data.returnTo,
    withAcademicYearParam(`/students/${parsed.data.studentId}`, selectedYearId)
  );
  const [student, school] = await Promise.all([
    db.student.findFirst({
      where: { id: parsed.data.studentId, schoolId: session.schoolId },
      select: { id: true, fullName: true }
    }),
    db.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true }
    })
  ]);
  if (!student) throw new Error("Student not found.");
  const schoolName = school?.name ?? "School";

  const pendingInvoices = await db.feeInvoice.findMany({
    where: { schoolId: session.schoolId, studentId: student.id, academicYearId: selectedYearId, status: { not: "PAID" } },
    include: { payments: { select: { amountCents: true } } },
    take: 200
  });

  let pendingTotal = 0;
  let totalAmountCents = 0;
  let totalPaidCents = 0;
  for (const invoice of pendingInvoices) {
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    totalAmountCents += invoice.amountCents;
    totalPaidCents += paid;
    pendingTotal += Math.max(0, invoice.amountCents - paid);
  }

  if (pendingTotal <= 0) {
    redirect(appendQuery(returnTo, "reminder", "none"));
  }

  await notifyParentsForStudent(session.schoolId, student.id, {
    title: `Fee reminder: ${student.fullName}`,
    body: `${pendingInvoices.length} pending invoice${pendingInvoices.length > 1 ? "s" : ""}. Pending amount ${centsToUsd(pendingTotal)}.\nLINK:${withAcademicYearParam("/fees", selectedYearId)}`
  });
  await sendFeeReminderEmailToParents({
    schoolId: session.schoolId,
    studentId: student.id,
    schoolName,
    studentName: student.fullName,
    invoiceTitle: "Pending fee summary",
    invoiceCount: pendingInvoices.length,
    totalAmountCents,
    paidAmountCents: totalPaidCents,
    balanceAmountCents: pendingTotal,
    detailsPath: withAcademicYearParam("/fees", selectedYearId)
  });

  redirect(appendQuery(returnTo, "reminder", "sent"));
}
