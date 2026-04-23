"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formatSchoolId } from "@/lib/id-sequence";
import { deleteUploadedImageByUrl, saveUploadedImage } from "@/lib/uploads";

const StudentCreateSchema = z.object({
  fullName: z.string().min(2),
  classId: z.string().optional(),
  className: z.string().optional(),
  section: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentMobile: z.string().optional(),
  transportDetails: z.string().optional(),
  medicalNotes: z.string().optional()
});

const StudentUpdateSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().optional(),
  admissionNo: z.string().optional(),
  fullName: z.string().optional(),
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
    fullName: formData.get("fullName"),
    classId: String(formData.get("classId") ?? "").trim() || undefined,
    className: formData.get("className") || undefined,
    section: formData.get("section") || undefined,
    gender: String(formData.get("gender") ?? "").trim() || undefined,
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || undefined,
    bloodGroup: String(formData.get("bloodGroup") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    parentName: String(formData.get("parentName") ?? "").trim() || undefined,
    parentMobile: String(formData.get("parentMobile") ?? "").trim() || undefined,
    transportDetails: String(formData.get("transportDetails") ?? "").trim() || undefined,
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  let classId: string | null = null;
  if (parsed.data.classId) {
    const cls = await prisma.class.findFirst({
      where: { id: parsed.data.classId, schoolId: session.schoolId },
      select: { id: true }
    });
    classId = cls?.id ?? null;
  } else if (parsed.data.className) {
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

    const studentId = formatSchoolId({ school, format: school.studentIdFormat, seq: school.studentIdNext });
    const admissionNo = formatSchoolId({ school, format: school.admissionNoFormat, seq: school.admissionNoNext });

    await tx.school.update({
      where: { id: school.id },
      data: {
        studentIdNext: { increment: 1 },
        admissionNoNext: { increment: 1 }
      }
    });

    let rollNumber: string | undefined;
    if (classId) {
      const classStrength = await tx.student.count({ where: { schoolId: session.schoolId, classId } });
      rollNumber = String(classStrength + 1);
    }

    return tx.student.create({
      data: {
        schoolId: session.schoolId,
        studentId,
        fullName: parsed.data.fullName,
        admissionNo,
        rollNumber,
        classId,
        gender: parsed.data.gender || undefined,
        dateOfBirth: parseDateInput(parsed.data.dateOfBirth ?? null),
        bloodGroup: parsed.data.bloodGroup || undefined,
        address: parsed.data.address || undefined,
        fatherName: parsed.data.parentName || undefined,
        parentMobiles: parsed.data.parentMobile || undefined,
        transportDetails: parsed.data.transportDetails || undefined,
        medicalNotes: parsed.data.medicalNotes || undefined
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
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canEditStudents = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;

  const parsed = StudentUpdateSchema.safeParse({
    id: formData.get("id"),
    studentId: String(formData.get("studentId") ?? "").trim() || undefined,
    admissionNo: String(formData.get("admissionNo") ?? "").trim() || undefined,
    fullName: String(formData.get("fullName") ?? "").trim() || undefined,
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
    where:
      canEditStudents
        ? { id: parsed.data.id, schoolId: session.schoolId }
        : {
            id: parsed.data.id,
            schoolId: session.schoolId,
            parents: { some: { userId: session.userId } }
          },
    select: {
      id: true,
      studentId: true,
      admissionNo: true,
      fullName: true,
      classId: true,
      rollNumber: true,
      address: true,
      parentAddress: true
    }
  });
  if (!existing) redirect("/students");

  let classId: string | null = existing.classId;
  if (canEditStudents) {
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
    } else {
      classId = null;
    }
  }

  let rollNumber = existing.rollNumber ?? undefined;
  if (canEditStudents && !rollNumber && classId) {
    const classStrength = await prisma.student.count({
      where: { schoolId: session.schoolId, classId, id: { not: existing.id } }
    });
    rollNumber = String(classStrength + 1);
  }

  const useStudentAddressForParent = Boolean(formData.get("parentAddressSameAsStudent"));
  const parentAddressValue = useStudentAddressForParent
    ? (canEditStudents
        ? (normalizeOptional(formData.get("address")) ?? existing.address ?? null)
        : (existing.address ?? null))
    : normalizeOptional(formData.get("parentAddress"));

  await prisma.student.update({
    where: { id: parsed.data.id },
    data: {
      // Identity + academic fields are admin-controlled.
      studentId: existing.studentId,
      admissionNo: existing.admissionNo,
      fullName: canEditStudents ? (parsed.data.fullName ?? existing.fullName) : existing.fullName,
      classId: canEditStudents ? classId : existing.classId,
      rollNumber: canEditStudents ? (rollNumber ?? null) : existing.rollNumber,
      gender: canEditStudents ? normalizeOptional(formData.get("gender")) : undefined,
      dateOfBirth: canEditStudents ? parseDateInput(normalizeOptional(formData.get("dateOfBirth"))) : undefined,
      bloodGroup: canEditStudents ? normalizeOptional(formData.get("bloodGroup")) : undefined,
      address: canEditStudents ? normalizeOptional(formData.get("address")) : undefined,
      transportDetails: canEditStudents ? normalizeOptional(formData.get("transportDetails")) : undefined,
      medicalNotes: canEditStudents ? normalizeOptional(formData.get("medicalNotes")) : undefined,
      fatherName: normalizeOptional(formData.get("fatherName")),
      motherName: normalizeOptional(formData.get("motherName")),
      parentMobiles: normalizeOptional(formData.get("parentMobiles")),
      parentEmails: normalizeOptional(formData.get("parentEmails")),
      parentOccupation: normalizeOptional(formData.get("parentOccupation")),
      parentAddress: parentAddressValue,
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

export async function uploadStudentPhotoAction(formData: FormData) {
  const session = await requireSession();
  const studentId = String(formData.get("id") ?? "").trim();
  const file = formData.get("photo");
  if (!studentId || !(file instanceof File)) redirect("/students");

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canEditStudents = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;

  const student = await prisma.student.findFirst({
    where: canEditStudents
      ? { id: studentId, schoolId: session.schoolId }
      : {
          id: studentId,
          schoolId: session.schoolId,
          parents: { some: { userId: session.userId } }
        },
    select: { id: true, photoUrl: true }
  });
  if (!student) redirect("/students");

  const saved = await saveUploadedImage({
    file,
    folder: `schools/${session.schoolId}/students/${student.id}`,
    prefix: "student-photo"
  });
  if (!saved.ok) redirect(`/students/${student.id}/edit`);

  await prisma.student.update({
    where: { id: student.id },
    data: { photoUrl: saved.url }
  });
  await deleteUploadedImageByUrl(student.photoUrl);

  redirect(`/students/${student.id}/edit`);
}
