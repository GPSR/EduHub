"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formatSchoolId } from "@/lib/id-sequence";

const StudentCreateSchema = z.object({
  studentId: z.string().optional(),
  fullName: z.string().min(2),
  className: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionNo: z.string().optional()
});

const StudentUpdateSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  admissionNo: z.string().optional(),
  fullName: z.string().min(2),
  className: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  transportDetails: z.string().optional(),
  medicalNotes: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  parentMobiles: z.string().optional(),
  parentEmails: z.string().optional(),
  parentOccupation: z.string().optional(),
  parentAddress: z.string().optional(),
  emergencyContact: z.string().optional(),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  guardianMobile: z.string().optional(),
  guardianAltContact: z.string().optional(),
  guardianAddress: z.string().optional(),
  pickupAuthDetails: z.string().optional()
});

export async function createStudentAction(formData: FormData) {
  const { session } = await requirePermission("STUDENTS", "EDIT");

  const parsed = StudentCreateSchema.safeParse({
    studentId: String(formData.get("studentId") ?? "").trim() || undefined,
    fullName: formData.get("fullName"),
    className: formData.get("className") || undefined,
    section: formData.get("section") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    admissionNo: String(formData.get("admissionNo") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  let classId: string | null = null;
  if (parsed.data.className) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_name_section: {
          schoolId: session.schoolId,
          name: parsed.data.className,
          section: parsed.data.section ?? ""
        }
      },
      update: {},
      create: {
        schoolId: session.schoolId,
        name: parsed.data.className,
        section: parsed.data.section ?? ""
      }
    });
    classId = cls.id;
  }

  const student = await prisma.$transaction(async (tx) => {
    const school = await tx.school.findUnique({ where: { id: session.schoolId } });
    if (!school) throw new Error("Unable to process request.");

    const needsStudentId = !parsed.data.studentId;
    const needsAdmission = !parsed.data.admissionNo;

    const studentId = parsed.data.studentId
      ? parsed.data.studentId
      : formatSchoolId({ school, format: school.studentIdFormat, seq: school.studentIdNext });
    const admissionNo = parsed.data.admissionNo
      ? parsed.data.admissionNo
      : formatSchoolId({ school, format: school.admissionNoFormat, seq: school.admissionNoNext });

    await tx.school.update({
      where: { id: school.id },
      data: {
        studentIdNext: needsStudentId ? { increment: 1 } : undefined,
        admissionNoNext: needsAdmission ? { increment: 1 } : undefined
      }
    });

    return tx.student.create({
      data: {
        schoolId: session.schoolId,
        studentId,
        fullName: parsed.data.fullName,
        admissionNo,
        rollNumber: parsed.data.rollNumber,
        classId
      }
    });
  });

  redirect(`/students/${student.id}`);
}

function normalizeOptional(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  return v.length ? v : null;
}

function parseDateInput(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function updateStudentAction(formData: FormData) {
  const { session } = await requirePermission("STUDENTS", "EDIT");

  const parsed = StudentUpdateSchema.safeParse({
    id: formData.get("id"),
    studentId: String(formData.get("studentId") ?? "").trim(),
    admissionNo: String(formData.get("admissionNo") ?? "").trim() || undefined,
    fullName: formData.get("fullName"),
    className: String(formData.get("className") ?? "").trim() || undefined,
    section: String(formData.get("section") ?? "").trim() || undefined,
    rollNumber: String(formData.get("rollNumber") ?? "").trim() || undefined,
    gender: String(formData.get("gender") ?? "").trim() || undefined,
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || undefined,
    bloodGroup: String(formData.get("bloodGroup") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    transportDetails: String(formData.get("transportDetails") ?? "").trim() || undefined,
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim() || undefined,
    fatherName: String(formData.get("fatherName") ?? "").trim() || undefined,
    motherName: String(formData.get("motherName") ?? "").trim() || undefined,
    parentMobiles: String(formData.get("parentMobiles") ?? "").trim() || undefined,
    parentEmails: String(formData.get("parentEmails") ?? "").trim() || undefined,
    parentOccupation: String(formData.get("parentOccupation") ?? "").trim() || undefined,
    parentAddress: String(formData.get("parentAddress") ?? "").trim() || undefined,
    emergencyContact: String(formData.get("emergencyContact") ?? "").trim() || undefined,
    guardianName: String(formData.get("guardianName") ?? "").trim() || undefined,
    guardianRelationship: String(formData.get("guardianRelationship") ?? "").trim() || undefined,
    guardianMobile: String(formData.get("guardianMobile") ?? "").trim() || undefined,
    guardianAltContact: String(formData.get("guardianAltContact") ?? "").trim() || undefined,
    guardianAddress: String(formData.get("guardianAddress") ?? "").trim() || undefined,
    pickupAuthDetails: String(formData.get("pickupAuthDetails") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to update student.");

  const existing = await prisma.student.findFirst({
    where: { id: parsed.data.id, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!existing) redirect("/students");

  let classId: string | null = null;
  if (parsed.data.className) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_name_section: {
          schoolId: session.schoolId,
          name: parsed.data.className,
          section: parsed.data.section ?? ""
        }
      },
      update: {},
      create: {
        schoolId: session.schoolId,
        name: parsed.data.className,
        section: parsed.data.section ?? ""
      }
    });
    classId = cls.id;
  }

  await prisma.student.update({
    where: { id: parsed.data.id },
    data: {
      studentId: parsed.data.studentId,
      admissionNo: normalizeOptional(formData.get("admissionNo")),
      fullName: parsed.data.fullName,
      classId,
      rollNumber: normalizeOptional(formData.get("rollNumber")),
      gender: normalizeOptional(formData.get("gender")),
      dateOfBirth: parseDateInput(normalizeOptional(formData.get("dateOfBirth"))),
      bloodGroup: normalizeOptional(formData.get("bloodGroup")),
      address: normalizeOptional(formData.get("address")),
      transportDetails: normalizeOptional(formData.get("transportDetails")),
      medicalNotes: normalizeOptional(formData.get("medicalNotes")),
      fatherName: normalizeOptional(formData.get("fatherName")),
      motherName: normalizeOptional(formData.get("motherName")),
      parentMobiles: normalizeOptional(formData.get("parentMobiles")),
      parentEmails: normalizeOptional(formData.get("parentEmails")),
      parentOccupation: normalizeOptional(formData.get("parentOccupation")),
      parentAddress: normalizeOptional(formData.get("parentAddress")),
      emergencyContact: normalizeOptional(formData.get("emergencyContact")),
      guardianName: normalizeOptional(formData.get("guardianName")),
      guardianRelationship: normalizeOptional(formData.get("guardianRelationship")),
      guardianMobile: normalizeOptional(formData.get("guardianMobile")),
      guardianAltContact: normalizeOptional(formData.get("guardianAltContact")),
      guardianAddress: normalizeOptional(formData.get("guardianAddress")),
      pickupAuthDetails: normalizeOptional(formData.get("pickupAuthDetails"))
    }
  });

  redirect(`/students/${parsed.data.id}`);
}
