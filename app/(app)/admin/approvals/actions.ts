"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { auditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { redirect } from "next/navigation";
import { z } from "zod";

const DecisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(300).optional()
});

export async function decideStudentUpdateRequestAction(formData: FormData) {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const parsed = DecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: (formData.get("note") as string) || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const req = await db.studentUpdateRequest.findFirst({
    where: { id: parsed.data.requestId, schoolId: session.schoolId },
    include: { student: true, requestedBy: true }
  });
  if (!req || req.status !== "PENDING") throw new Error("Unable to process request.");

  if (parsed.data.decision === "REJECT") {
    await db.studentUpdateRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewedByUserId: session.userId,
        reviewedAt: new Date(),
        decisionNote: parsed.data.note ?? null
      }
    });
    await auditLog({
      actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
      action: "STUDENT_UPDATE_REQUEST_REJECTED",
      entityType: "StudentUpdateRequest",
      entityId: req.id,
      metadata: { studentId: req.studentId }
    });
    await notifyUser({
      schoolId: session.schoolId,
      userId: req.requestedByUserId,
      title: "Profile update rejected",
      body: `Your request for ${req.student.fullName} was rejected.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`
    });
    redirect("/admin/approvals");
  }

  const payload = JSON.parse(req.payloadJson) as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "address",
    "parentMobiles",
    "parentEmails",
    "parentAddress",
    "emergencyContact",
    "guardianName",
    "guardianRelationship",
    "guardianMobile",
    "guardianAddress",
    "pickupAuthDetails",
    "medicalNotes"
  ]) {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  }

  await db.$transaction([
    db.student.update({ where: { id: req.studentId }, data: allowed }),
    db.studentUpdateRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewedByUserId: session.userId,
        reviewedAt: new Date(),
        decisionNote: parsed.data.note ?? null
      }
    })
  ]);

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "STUDENT_UPDATE_REQUEST_APPROVED",
    entityType: "StudentUpdateRequest",
    entityId: req.id,
    metadata: { studentId: req.studentId, appliedKeys: Object.keys(allowed) }
  });
  await notifyUser({
    schoolId: session.schoolId,
    userId: req.requestedByUserId,
    title: "Profile update approved",
    body: `Your request for ${req.student.fullName} was approved.`
  });

  redirect("/admin/approvals");
}
