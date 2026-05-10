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

const MarkClassSchema = z.object({
  date: z.string().min(1),
  classId: z.string().min(1),
  leaveStudentIds: z.array(z.string().min(1)).default([]),
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

export async function markClassAttendanceAction(formData: FormData) {
  const { session } = await requirePermission("ATTENDANCE", "EDIT");

  const parsed = MarkClassSchema.safeParse({
    date: formData.get("date"),
    classId: formData.get("classId"),
    leaveStudentIds: formData.getAll("leaveStudentIds").map((value) => String(value)).filter(Boolean),
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

  const students = await db.student.findMany({
    where: {
      schoolId: session.schoolId,
      classId: parsed.data.classId
    },
    select: {
      id: true,
      fullName: true,
      parents: { select: { userId: true } }
    },
    orderBy: { fullName: "asc" }
  });

  const date = new Date(parsed.data.date);
  date.setHours(0, 0, 0, 0);

  const studentIdSet = new Set(students.map((student) => student.id));
  const leaveSet = new Set(parsed.data.leaveStudentIds.filter((studentId) => studentIdSet.has(studentId)));

  await db.$transaction(async (tx) => {
    for (const student of students) {
      const status = leaveSet.has(student.id) ? "LEAVE" : "PRESENT";
      await tx.attendanceRecord.upsert({
        where: {
          studentId_academicYearId_date: {
            studentId: student.id,
            academicYearId: year.id,
            date
          }
        },
        update: {
          status,
          notedById: session.userId,
          schoolId: session.schoolId,
          academicYearId: year.id
        },
        create: {
          schoolId: session.schoolId,
          academicYearId: year.id,
          studentId: student.id,
          date,
          status,
          notedById: session.userId
        }
      });
    }
  });

  const leaveStudents = students.filter((student) => leaveSet.has(student.id));
  if (leaveStudents.length > 0) {
    await db.notification.createMany({
      data: leaveStudents.flatMap((student) =>
        student.parents.map((parent) => ({
          schoolId: session.schoolId,
          userId: parent.userId,
          title: `Attendance updated: ${student.fullName}`,
          body: `Status: LEAVE on ${parsed.data.date}.\nLINK:${withAcademicYearParam(`/attendance?date=${encodeURIComponent(parsed.data.date)}&classId=${encodeURIComponent(parsed.data.classId)}`, year.id)}`
        }))
      )
    });
  }

  redirect(withAcademicYearParam(`/attendance?date=${encodeURIComponent(parsed.data.date)}&classId=${encodeURIComponent(parsed.data.classId)}`, year.id));
}
