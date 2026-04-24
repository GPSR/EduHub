"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";

async function notifyParentsForStudent(
  schoolId: string,
  studentId: string,
  payload: { title: string; body?: string }
) {
  const links = await prisma.studentParent.findMany({
    where: { schoolId, studentId },
    select: { userId: true }
  });
  if (!links.length) return;
  await prisma.notification.createMany({
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

const CreateInvoiceSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  dueOn: z.string().optional()
});

export async function createInvoiceAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");

  const parsed = CreateInvoiceSchema.safeParse({
    studentId: formData.get("studentId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    dueOn: formData.get("dueOn") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { id: true, fullName: true }
  });
  if (!student) throw new Error("Student not found.");

  const invoice = await prisma.feeInvoice.create({
    data: {
      schoolId: session.schoolId,
      studentId: student.id,
      title: parsed.data.title,
      amountCents: Math.round(parsed.data.amount * 100),
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null
    }
  });

  await notifyParentsForStudent(session.schoolId, student.id, {
    title: `Fee reminder: ${invoice.title}`,
    body: `New fee invoice created for ${student.fullName}.\nLINK:/fees/${invoice.id}`
  });

  redirect(`/fees/${invoice.id}`);
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

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parsed.data.invoiceId, schoolId: session.schoolId },
    include: { payments: true }
  });
  if (!invoice) throw new Error("Unable to process request.");

  await prisma.feePayment.create({
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

  await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: { status: newStatus }
  });

  await notifyParentsForStudent(session.schoolId, invoice.studentId, {
    title: newStatus === "PAID" ? "Fee payment completed" : "Fee payment updated",
    body: `Invoice ${invoice.title} is now ${newStatus}.\nLINK:/fees/${invoice.id}`
  });

  redirect(`/fees/${invoice.id}`);
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

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parsed.data.invoiceId, schoolId: session.schoolId },
    include: { student: { select: { id: true, fullName: true } }, payments: { select: { amountCents: true } } }
  });
  if (!invoice) throw new Error("Invoice not found.");

  const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingCents = Math.max(0, invoice.amountCents - paidCents);
  const returnTo = normalizeReturnPath(parsed.data.returnTo, `/fees/${invoice.id}`);

  if (pendingCents <= 0) {
    redirect(appendQuery(returnTo, "reminder", "already_paid"));
  }

  await notifyParentsForStudent(session.schoolId, invoice.student.id, {
    title: `Fee reminder: ${invoice.title}`,
    body: `Pending amount ${centsToUsd(pendingCents)} for ${invoice.student.fullName}.\nLINK:/fees/${invoice.id}`
  });

  redirect(appendQuery(returnTo, "reminder", "sent"));
}

const SendPendingFeeRemindersSchema = z.object({
  returnTo: z.string().optional()
});

export async function sendPendingFeeRemindersAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");
  const parsed = SendPendingFeeRemindersSchema.safeParse({
    returnTo: formData.get("returnTo") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process reminder.");

  const returnTo = normalizeReturnPath(parsed.data.returnTo, "/fees");
  const pendingInvoices = await prisma.feeInvoice.findMany({
    where: { schoolId: session.schoolId, status: { not: "PAID" } },
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
    { studentName: string; pendingCents: number; invoiceCount: number }
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
        invoiceCount: 1
      });
      continue;
    }
    existing.pendingCents += pendingCents;
    existing.invoiceCount += 1;
  }

  if (byStudent.size === 0) {
    redirect(appendQuery(returnTo, "reminder", "none"));
  }

  const studentIds = Array.from(byStudent.keys());
  const parentLinks = await prisma.studentParent.findMany({
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
        body: `${info.invoiceCount} pending invoice${info.invoiceCount > 1 ? "s" : ""}. Pending amount ${centsToUsd(info.pendingCents)}.\nLINK:/fees`
      };
    })
    .filter((item): item is { schoolId: string; userId: string; title: string; body: string } => Boolean(item));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  let target = appendQuery(returnTo, "reminder", "bulk_sent");
  target = appendQuery(target, "count", String(byStudent.size));
  redirect(target);
}

const SendStudentFeeReminderSchema = z.object({
  studentId: z.string().min(1),
  returnTo: z.string().optional()
});

export async function sendStudentFeeReminderAction(formData: FormData) {
  const { session } = await requirePermission("FEES", "EDIT");
  const parsed = SendStudentFeeReminderSchema.safeParse({
    studentId: formData.get("studentId"),
    returnTo: formData.get("returnTo") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process reminder.");

  const returnTo = normalizeReturnPath(parsed.data.returnTo, `/students/${parsed.data.studentId}`);
  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { id: true, fullName: true }
  });
  if (!student) throw new Error("Student not found.");

  const pendingInvoices = await prisma.feeInvoice.findMany({
    where: { schoolId: session.schoolId, studentId: student.id, status: { not: "PAID" } },
    include: { payments: { select: { amountCents: true } } },
    take: 200
  });

  let pendingTotal = 0;
  for (const invoice of pendingInvoices) {
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    pendingTotal += Math.max(0, invoice.amountCents - paid);
  }

  if (pendingTotal <= 0) {
    redirect(appendQuery(returnTo, "reminder", "none"));
  }

  await notifyParentsForStudent(session.schoolId, student.id, {
    title: `Fee reminder: ${student.fullName}`,
    body: `${pendingInvoices.length} pending invoice${pendingInvoices.length > 1 ? "s" : ""}. Pending amount ${centsToUsd(pendingTotal)}.\nLINK:/fees`
  });

  redirect(appendQuery(returnTo, "reminder", "sent"));
}
