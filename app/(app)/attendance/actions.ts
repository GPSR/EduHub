"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";

const MarkSchema = z.object({
  date: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"])
});

export async function markAttendanceAction(formData: FormData) {
  const { session } = await requirePermission("ATTENDANCE", "EDIT");

  const parsed = MarkSchema.safeParse({
    date: formData.get("date"),
    studentId: formData.get("studentId"),
    status: formData.get("status")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const date = new Date(parsed.data.date);
  date.setHours(0, 0, 0, 0);

  await db.attendanceRecord.upsert({
    where: { studentId_date: { studentId: parsed.data.studentId, date } },
    update: { status: parsed.data.status, notedById: session.userId, schoolId: session.schoolId },
    create: {
      schoolId: session.schoolId,
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
        body: `Status: ${parsed.data.status} on ${parsed.data.date}.\nLINK:/attendance?date=${encodeURIComponent(parsed.data.date)}`
      }))
    });
  }

  redirect(`/attendance?date=${parsed.data.date}`);
}
