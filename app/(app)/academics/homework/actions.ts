"use server";

import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateHomeworkSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().optional(),
  title: z.string().min(2),
  details: z.string().optional(),
  dueOn: z.string().optional(),
  academicYearId: z.string().optional()
});

export async function createHomeworkAction(formData: FormData) {
  const { session } = await requireAnyPermission(["HOMEWORK", "ACADEMICS"], "EDIT");

  const parsed = CreateHomeworkSchema.safeParse({
    classId: formData.get("classId"),
    studentId: String(formData.get("studentId") ?? "").trim() || undefined,
    title: formData.get("title"),
    details: formData.get("details") || undefined,
    dueOn: formData.get("dueOn") || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });
  const cls = await db.class.findFirst({
    where: { id: parsed.data.classId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!cls) throw new Error("Selected class is invalid.");

  const dueOn = parsed.data.dueOn ? new Date(parsed.data.dueOn) : null;

  if (parsed.data.studentId) {
    const student = await db.student.findFirst({
      where: {
        id: parsed.data.studentId,
        schoolId: session.schoolId,
        classId: parsed.data.classId
      },
      select: { id: true }
    });
    if (!student) throw new Error("Selected student does not belong to the selected class.");

    await db.homework.create({
      data: {
        schoolId: session.schoolId,
        academicYearId: year.id,
        studentId: parsed.data.studentId,
        title: parsed.data.title,
        details: parsed.data.details,
        dueOn
      }
    });
    redirect(withAcademicYearParam(`/academics/homework?classId=${encodeURIComponent(parsed.data.classId)}`, year.id));
  }

  const classStudents = await db.student.findMany({
    where: {
      schoolId: session.schoolId,
      classId: parsed.data.classId
    },
    select: { id: true }
  });
  if (classStudents.length === 0) throw new Error("No students found in the selected class.");

  await db.homework.createMany({
    data: classStudents.map((student) => ({
      schoolId: session.schoolId,
      academicYearId: year.id,
      studentId: student.id,
      title: parsed.data.title,
      details: parsed.data.details,
      dueOn
    }))
  });
  redirect(withAcademicYearParam(`/academics/homework?classId=${encodeURIComponent(parsed.data.classId)}`, year.id));
}
