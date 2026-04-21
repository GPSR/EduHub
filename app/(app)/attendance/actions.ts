"use server";

import { prisma } from "@/lib/db";
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

  await prisma.attendanceRecord.upsert({
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

  redirect(`/attendance?date=${parsed.data.date}`);
}
