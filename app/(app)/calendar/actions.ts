"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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

function parseCalendarEventInput(formData: FormData) {
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

  return {
    title: parsed.data.title,
    description: parsed.data.description,
    eventType: parsed.data.eventType,
    audienceScope: parsed.data.audienceScope,
    startsOn,
    endsOn,
    classIds: [...new Set(parsed.data.classIds)]
  };
}

async function resolveValidClassIds(args: {
  schoolId: string;
  userId: string;
  isTeacherRole: boolean;
  audienceScope: "SCHOOL_WIDE" | "CLASS_WISE";
  classIds: string[];
}) {
  if (args.audienceScope !== "CLASS_WISE") return [];
  if (args.classIds.length === 0) throw new Error("Select at least one class for class-wise events.");

  if (args.isTeacherRole) {
    const assignments = await db.teacherClassAssignment.findMany({
      where: { schoolId: args.schoolId, userId: args.userId },
      select: { classId: true }
    });
    const teacherAssignedClassIds = assignments.map((entry) => entry.classId);
    const unauthorizedClassId = args.classIds.find((classId) => !teacherAssignedClassIds.includes(classId));
    if (unauthorizedClassId) throw new Error("You can only target classes assigned to you.");
  }

  const validClasses = await db.class.findMany({
    where: { schoolId: args.schoolId, id: { in: args.classIds } },
    select: { id: true }
  });
  const validTargetClassIds = validClasses.map((entry) => entry.id);
  if (validTargetClassIds.length !== args.classIds.length) {
    throw new Error("Some selected classes are invalid. Refresh and try again.");
  }
  return validTargetClassIds;
}

export async function createSchoolCalendarEventAction(formData: FormData) {
  const { session, level } = await requirePermission("SCHOOL_CALENDAR", "VIEW");
  const isTeacherRole = session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER";
  const canManage = atLeastLevel(level, "EDIT");
  if (!canManage) {
    throw new Error("Only users with calendar edit access can add events.");
  }
  const input = parseCalendarEventInput(formData);
  const validTargetClassIds = await resolveValidClassIds({
    schoolId: session.schoolId,
    userId: session.userId,
    isTeacherRole,
    audienceScope: input.audienceScope,
    classIds: input.classIds
  });

  await db.$transaction(async (tx) => {
    const event = await tx.schoolCalendarEvent.create({
      data: {
        schoolId: session.schoolId,
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        audienceScope: input.audienceScope,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        createdByUserId: session.userId
      },
      select: { id: true }
    });

    if (input.audienceScope === "CLASS_WISE" && validTargetClassIds.length > 0) {
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

  redirect(`/calendar?month=${formatMonthKey(input.startsOn)}`);
}

export async function updateSchoolCalendarEventAction(formData: FormData) {
  const { session } = await requirePermission("SCHOOL_CALENDAR", "VIEW");
  if (session.roleKey !== "ADMIN") {
    throw new Error("Only admin can modify calendar events.");
  }

  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) throw new Error("Event id is required.");
  const event = await db.schoolCalendarEvent.findFirst({
    where: { id: eventId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!event) throw new Error("Event not found.");

  const input = parseCalendarEventInput(formData);
  const validTargetClassIds = await resolveValidClassIds({
    schoolId: session.schoolId,
    userId: session.userId,
    isTeacherRole: false,
    audienceScope: input.audienceScope,
    classIds: input.classIds
  });

  await db.$transaction(async (tx) => {
    await tx.schoolCalendarEvent.update({
      where: { id: eventId },
      data: {
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        audienceScope: input.audienceScope,
        startsOn: input.startsOn,
        endsOn: input.endsOn
      }
    });

    await tx.schoolCalendarEventClass.deleteMany({
      where: { schoolId: session.schoolId, eventId }
    });
    if (input.audienceScope === "CLASS_WISE" && validTargetClassIds.length > 0) {
      await tx.schoolCalendarEventClass.createMany({
        data: validTargetClassIds.map((classId) => ({
          schoolId: session.schoolId,
          eventId,
          classId
        })),
        skipDuplicates: true
      });
    }
  });

  redirect(`/calendar?month=${formatMonthKey(input.startsOn)}`);
}

export async function deleteSchoolCalendarEventAction(formData: FormData) {
  const { session } = await requirePermission("SCHOOL_CALENDAR", "VIEW");
  if (session.roleKey !== "ADMIN") {
    throw new Error("Only admin can delete calendar events.");
  }

  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) throw new Error("Event id is required.");
  const event = await db.schoolCalendarEvent.findFirst({
    where: { id: eventId, schoolId: session.schoolId },
    select: { id: true, startsOn: true }
  });
  if (!event) throw new Error("Event not found.");
  await db.schoolCalendarEvent.delete({ where: { id: event.id } });

  const monthKeyRaw = String(formData.get("monthKey") ?? "").trim();
  const monthKey = /^\d{4}-\d{2}$/.test(monthKeyRaw) ? monthKeyRaw : formatMonthKey(event.startsOn);
  redirect(`/calendar?month=${monthKey}`);
}
