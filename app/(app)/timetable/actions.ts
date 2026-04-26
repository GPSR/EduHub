"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";

const CreateTeacherTimetableEntrySchema = z.object({
  teacherUserId: z.string().min(1),
  classId: z.string().min(1),
  subjectName: z.string().trim().min(2).max(120),
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid start time."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid end time."),
  room: z.string().trim().max(80).optional()
});

const DeleteTeacherTimetableEntrySchema = z.object({
  entryId: z.string().min(1)
});

function toMinutes(value: string) {
  const [hh, mm] = value.split(":").map((part) => Number(part));
  return hh * 60 + mm;
}

export async function createTeacherTimetableEntryAction(formData: FormData) {
  const { session } = await requirePermission("TIMETABLE", "EDIT");
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can manage teacher timetable.");

  const parsed = CreateTeacherTimetableEntrySchema.safeParse({
    teacherUserId: formData.get("teacherUserId"),
    classId: formData.get("classId"),
    subjectName: formData.get("subjectName"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    room: String(formData.get("room") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  if (toMinutes(parsed.data.endTime) <= toMinutes(parsed.data.startTime)) {
    throw new Error("End time must be after start time.");
  }

  const [teacher, cls] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: parsed.data.teacherUserId,
        schoolId: session.schoolId,
        isActive: true,
        schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
      },
      select: { id: true }
    }),
    prisma.class.findFirst({
      where: {
        id: parsed.data.classId,
        schoolId: session.schoolId
      },
      select: { id: true }
    })
  ]);

  if (!teacher) throw new Error("Please choose a valid teacher.");
  if (!cls) throw new Error("Please choose a valid class.");

  const overlaps = await prisma.teacherTimetableEntry.findMany({
    where: {
      schoolId: session.schoolId,
      weekday: parsed.data.weekday,
      OR: [{ teacherUserId: teacher.id }, { classId: cls.id }],
      startTime: { lt: parsed.data.endTime },
      endTime: { gt: parsed.data.startTime }
    },
    select: {
      id: true,
      subjectName: true,
      startTime: true,
      endTime: true,
      teacherUser: { select: { name: true } },
      class: { select: { name: true, section: true } }
    },
    take: 1
  });

  if (overlaps.length > 0) {
    const conflict = overlaps[0];
    const classLabel = conflict.class.section ? `${conflict.class.name}-${conflict.class.section}` : conflict.class.name;
    throw new Error(
      `Conflicts with ${conflict.teacherUser.name} · ${classLabel} · ${conflict.subjectName} (${conflict.startTime}-${conflict.endTime}).`
    );
  }

  await prisma.teacherTimetableEntry.create({
    data: {
      schoolId: session.schoolId,
      teacherUserId: teacher.id,
      classId: cls.id,
      subjectName: parsed.data.subjectName,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      room: parsed.data.room,
      createdByUserId: session.userId
    }
  });

  redirect(`/timetable?teacherId=${encodeURIComponent(teacher.id)}&day=${parsed.data.weekday}`);
}

export async function deleteTeacherTimetableEntryAction(formData: FormData) {
  const { session } = await requirePermission("TIMETABLE", "EDIT");
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can delete timetable rows.");

  const parsed = DeleteTeacherTimetableEntrySchema.safeParse({
    entryId: formData.get("entryId")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const row = await prisma.teacherTimetableEntry.findFirst({
    where: {
      id: parsed.data.entryId,
      schoolId: session.schoolId
    },
    select: { id: true }
  });
  if (!row) throw new Error("Timetable entry not found.");

  await prisma.teacherTimetableEntry.delete({ where: { id: row.id } });
  redirect("/timetable");
}
