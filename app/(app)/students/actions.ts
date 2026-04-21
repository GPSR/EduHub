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
