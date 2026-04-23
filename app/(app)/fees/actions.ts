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
