"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { auditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { redirect } from "next/navigation";
import { z } from "zod";

export type StudentUpdateState = { ok: boolean; message?: string };

const PayloadSchema = z.object({
  address: z.string().max(500).optional(),
  parentMobiles: z.string().max(200).optional(),
  parentEmails: z.string().max(200).optional(),
  parentAddress: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  guardianName: z.string().max(200).optional(),
  guardianRelationship: z.string().max(100).optional(),
  guardianMobile: z.string().max(200).optional(),
  guardianAddress: z.string().max(500).optional(),
  pickupAuthDetails: z.string().max(500).optional(),
  medicalNotes: z.string().max(500).optional()
});

const RequestSchema = z.object({
  studentId: z.string().min(1)
});

export async function createStudentUpdateRequestAction(
  _prev: StudentUpdateState,
  formData: FormData
): Promise<StudentUpdateState> {
  const session = await requireSession();
  if (session.roleKey !== "PARENT") return { ok: false, message: "Only parents can submit profile update requests." };

  const parsed = RequestSchema.safeParse({
    studentId: formData.get("studentId")
  });
  if (!parsed.success) return { ok: false, message: "Please check your inputs." };

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId, parents: { some: { userId: session.userId } } }
  });
  if (!student) return { ok: false, message: "Student not found." };

  const payload = PayloadSchema.safeParse({
    address: emptyToUndef(formData.get("address")),
    parentMobiles: emptyToUndef(formData.get("parentMobiles")),
    parentEmails: emptyToUndef(formData.get("parentEmails")),
    parentAddress: emptyToUndef(formData.get("parentAddress")),
    emergencyContact: emptyToUndef(formData.get("emergencyContact")),
    guardianName: emptyToUndef(formData.get("guardianName")),
    guardianRelationship: emptyToUndef(formData.get("guardianRelationship")),
    guardianMobile: emptyToUndef(formData.get("guardianMobile")),
    guardianAddress: emptyToUndef(formData.get("guardianAddress")),
    pickupAuthDetails: emptyToUndef(formData.get("pickupAuthDetails")),
    medicalNotes: emptyToUndef(formData.get("medicalNotes"))
  });
  if (!payload.success) return { ok: false, message: "Please check the entered details." };

  const req = await prisma.studentUpdateRequest.create({
    data: {
      schoolId: session.schoolId,
      studentId: student.id,
      requestedByUserId: session.userId,
      payloadJson: JSON.stringify(payload.data)
    }
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "STUDENT_UPDATE_REQUEST_CREATED",
    entityType: "StudentUpdateRequest",
    entityId: req.id,
    schoolId: session.schoolId,
    metadata: { studentId: student.id }
  });

  // Notify admins/principals.
  const reviewers = await prisma.user.findMany({
    where: { schoolId: session.schoolId, schoolRole: { key: { in: ["ADMIN", "PRINCIPAL"] } } },
    select: { id: true }
  });
  await Promise.all(
    reviewers.map((u) =>
      notifyUser({
        schoolId: session.schoolId,
        userId: u.id,
        title: "Profile update request",
        body: `A parent requested updates for ${student.fullName}. Review in Admin → Approvals.`
      })
    )
  );

  redirect("/requests/student-profile?submitted=1");
}

function emptyToUndef(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}
