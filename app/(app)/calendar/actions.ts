"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { atLeastLevel } from "@/lib/permissions";
import { formatMonthKey, parseDateOnlyInput } from "@/lib/leave-utils";

const CreateCalendarEventSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(700).optional(),
  eventType: z.enum(["HOLIDAY", "FUNCTION", "EXAM", "OTHER"]),
  audienceScope: z.enum(["SCHOOL_WIDE", "CLASS_WISE"]),
  classIds: z.array(z.string().min(1)).default([]),
  startsOn: z.string().min(1),
  endsOn: z.string().optional()
});

export async function createSchoolCalendarEventAction(formData: FormData) {
  const { session, level } = await requirePermission("SCHOOL_CALENDAR", "VIEW");
  const isTeacherRole = session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER";
  const roleCanManage = new Set(["ADMIN", "HEAD_MASTER", "PRINCIPAL", "CLASS_TEACHER", "TEACHER"]).has(
    session.roleKey
  );
  const canManage = atLeastLevel(level, "EDIT") || roleCanManage;
  if (!canManage) {
    throw new Error("Only teachers and leadership roles can add calendar events.");
  }

  const classIds = formData
    .getAll("classIds")
    .map((value) => String(value))
    .map((value) => value.trim())
    .filter(Boolean);

  const parsed = CreateCalendarEventSchema.safeParse({
    title: formData.get("title"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    eventType: formData.get("eventType"),
    audienceScope: formData.get("audienceScope"),
    classIds,
    startsOn: formData.get("startsOn"),
    endsOn: String(formData.get("endsOn") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const startsOn = parseDateOnlyInput(parsed.data.startsOn);
  const endsOn = parseDateOnlyInput(parsed.data.endsOn ?? parsed.data.startsOn);
  if (!startsOn || !endsOn) throw new Error("Please select valid event dates.");
  if (endsOn < startsOn) throw new Error("Event end date cannot be earlier than start date.");

  const targetClassIds = [...new Set(parsed.data.classIds)];
  let validTargetClassIds: string[] = [];
  let teacherAssignedClassIds: string[] = [];

  if (isTeacherRole) {
    const assignments = await prisma.teacherClassAssignment.findMany({
      where: {
        schoolId: session.schoolId,
        userId: session.userId
      },
      select: { classId: true }
    });
    teacherAssignedClassIds = assignments.map((entry) => entry.classId);
  }

  if (parsed.data.audienceScope === "CLASS_WISE") {
    if (targetClassIds.length === 0) throw new Error("Select at least one class for class-wise events.");

    if (isTeacherRole) {
      const unauthorizedClassId = targetClassIds.find((classId) => !teacherAssignedClassIds.includes(classId));
      if (unauthorizedClassId) {
        throw new Error("You can only target classes assigned to you.");
      }
    }

    const validClasses = await prisma.class.findMany({
      where: {
        schoolId: session.schoolId,
        id: { in: targetClassIds }
      },
      select: { id: true }
    });
    validTargetClassIds = validClasses.map((entry) => entry.id);

    if (validTargetClassIds.length !== targetClassIds.length) {
      throw new Error("Some selected classes are invalid. Refresh and try again.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const event = await tx.schoolCalendarEvent.create({
      data: {
        schoolId: session.schoolId,
        title: parsed.data.title,
        description: parsed.data.description,
        eventType: parsed.data.eventType,
        audienceScope: parsed.data.audienceScope,
        startsOn,
        endsOn,
        createdByUserId: session.userId
      },
      select: { id: true }
    });

    if (parsed.data.audienceScope === "CLASS_WISE" && validTargetClassIds.length > 0) {
      await tx.schoolCalendarEventClass.createMany({
        data: validTargetClassIds.map((classId) => ({
          schoolId: session.schoolId,
          eventId: event.id,
          classId
        })),
        skipDuplicates: true
      });
    }
  });

  redirect(`/calendar?month=${formatMonthKey(startsOn)}`);
}
