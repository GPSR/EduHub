"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { parseDateOnlyInput } from "@/lib/leave-utils";

const UpsertTeacherSalarySchema = z.object({
  teacherUserId: z.string().min(1),
  payCycle: z.enum(["MONTHLY", "YEARLY"]),
  grossAmount: z.coerce.number().min(0).max(10_000_000),
  leaveAllowanceDays: z.coerce.number().int().min(0).max(366),
  deductionPerLeaveDay: z.coerce.number().min(0).max(1_000_000),
  effectiveFrom: z.string().optional(),
  notes: z.string().trim().max(600).optional()
});

const RecordTeacherSalaryPayoutSchema = z.object({
  teacherUserId: z.string().min(1),
  payCycle: z.enum(["MONTHLY", "YEARLY"]),
  periodKey: z.string().trim().min(4).max(16),
  paidAmount: z.coerce.number().min(0).max(10_000_000),
  paidOn: z.string().trim().min(1),
  paymentMode: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(600).optional()
});

export async function upsertTeacherSalaryProfileAction(formData: FormData) {
  const { session } = await requirePermission("TEACHER_SALARY", "ADMIN");
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can manage teacher salary.");

  const parsed = UpsertTeacherSalarySchema.safeParse({
    teacherUserId: formData.get("teacherUserId"),
    payCycle: formData.get("payCycle"),
    grossAmount: formData.get("grossAmount"),
    leaveAllowanceDays: formData.get("leaveAllowanceDays"),
    deductionPerLeaveDay: formData.get("deductionPerLeaveDay"),
    effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const teacherUser = await prisma.user.findFirst({
    where: {
      id: parsed.data.teacherUserId,
      schoolId: session.schoolId,
      isActive: true,
      schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
    },
    select: { id: true }
  });
  if (!teacherUser) throw new Error("Invalid teacher selected.");

  const effectiveFrom = parsed.data.effectiveFrom ? parseDateOnlyInput(parsed.data.effectiveFrom) : null;
  if (parsed.data.effectiveFrom && !effectiveFrom) throw new Error("Invalid effective-from date.");

  await prisma.teacherSalaryProfile.upsert({
    where: {
      schoolId_teacherUserId: {
        schoolId: session.schoolId,
        teacherUserId: teacherUser.id
      }
    },
    update: {
      payCycle: parsed.data.payCycle,
      grossAmountCents: Math.round(parsed.data.grossAmount * 100),
      leaveAllowanceDays: parsed.data.leaveAllowanceDays,
      deductionPerLeaveDayCents: Math.round(parsed.data.deductionPerLeaveDay * 100),
      effectiveFrom,
      notes: parsed.data.notes,
      isActive: true
    },
    create: {
      schoolId: session.schoolId,
      teacherUserId: teacherUser.id,
      payCycle: parsed.data.payCycle,
      grossAmountCents: Math.round(parsed.data.grossAmount * 100),
      leaveAllowanceDays: parsed.data.leaveAllowanceDays,
      deductionPerLeaveDayCents: Math.round(parsed.data.deductionPerLeaveDay * 100),
      effectiveFrom,
      notes: parsed.data.notes,
      isActive: true
    }
  });

  redirect("/admin/teacher-salary");
}

export async function recordTeacherSalaryPayoutAction(formData: FormData) {
  const { session } = await requirePermission("TEACHER_SALARY", "ADMIN");
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can manage teacher salary.");

  const parsed = RecordTeacherSalaryPayoutSchema.safeParse({
    teacherUserId: formData.get("teacherUserId"),
    payCycle: formData.get("payCycle"),
    periodKey: formData.get("periodKey"),
    paidAmount: formData.get("paidAmount"),
    paidOn: formData.get("paidOn"),
    paymentMode: String(formData.get("paymentMode") ?? "").trim() || undefined,
    reference: String(formData.get("reference") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const teacherUser = await prisma.user.findFirst({
    where: {
      id: parsed.data.teacherUserId,
      schoolId: session.schoolId,
      schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
    },
    select: { id: true }
  });
  if (!teacherUser) throw new Error("Invalid teacher selected.");

  const paidOn = parseDateOnlyInput(parsed.data.paidOn);
  if (!paidOn) throw new Error("Invalid payout date.");

  await prisma.teacherSalaryPayout.create({
    data: {
      schoolId: session.schoolId,
      teacherUserId: teacherUser.id,
      payCycle: parsed.data.payCycle,
      periodKey: parsed.data.periodKey,
      paidAmountCents: Math.round(parsed.data.paidAmount * 100),
      paidOn,
      paymentMode: parsed.data.paymentMode,
      reference: parsed.data.reference,
      notes: parsed.data.notes
    }
  });

  const cycleQuery = parsed.data.payCycle === "MONTHLY"
    ? `cycle=MONTHLY&month=${encodeURIComponent(parsed.data.periodKey)}`
    : `cycle=YEARLY&year=${encodeURIComponent(parsed.data.periodKey)}`;
  redirect(`/admin/teacher-salary?${cycleQuery}&teacherId=${encodeURIComponent(teacherUser.id)}&payout=saved`);
}
