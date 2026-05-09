"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { redirect } from "next/navigation";
import { z } from "zod";

const MarkSchema = z.object({
  date: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
  academicYearId: z.string().optional()
});

export async function markAttendanceAction(formData: FormData) {
  const { session } = await requirePermission("ATTENDANCE", "EDIT");

  const parsed = MarkSchema.safeParse({
    date: formData.get("date"),
    studentId: formData.get("studentId"),
    status: formData.get("status"),
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });

  const date = new Date(parsed.data.date);
  date.setHours(0, 0, 0, 0);

  await db.attendanceRecord.upsert({
    where: { studentId_academicYearId_date: { studentId: parsed.data.studentId, academicYearId: year.id, date } },
    update: { status: parsed.data.status, notedById: session.userId, schoolId: session.schoolId, academicYearId: year.id },
    create: {
      schoolId: session.schoolId,
      academicYearId: year.id,
      studentId: parsed.data.studentId,
      date,
      status: parsed.data.status,
      notedById: session.userId
    }
  });

  const student = await db.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { fullName: true, parents: { select: { userId: true } } }
  });
  if (student?.parents?.length) {
    await db.notification.createMany({
      data: student.parents.map((p) => ({
        schoolId: session.schoolId,
        userId: p.userId,
        title: `Attendance updated: ${student.fullName}`,
        body: `Status: ${parsed.data.status} on ${parsed.data.date}.\nLINK:${withAcademicYearParam(`/attendance?date=${encodeURIComponent(parsed.data.date)}`, year.id)}`
      }))
    });
  }

  redirect(withAcademicYearParam(`/attendance?date=${parsed.data.date}`, year.id));
}
