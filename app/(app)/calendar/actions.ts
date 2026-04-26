"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { formatMonthKey, parseDateOnlyInput } from "@/lib/leave-utils";

const CreateCalendarEventSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(700).optional(),
  eventType: z.enum(["HOLIDAY", "FUNCTION", "EXAM", "OTHER"]),
  startsOn: z.string().min(1),
  endsOn: z.string().optional()
});

export async function createSchoolCalendarEventAction(formData: FormData) {
  const { session } = await requirePermission("SCHOOL_CALENDAR", "EDIT");

  const parsed = CreateCalendarEventSchema.safeParse({
    title: formData.get("title"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    eventType: formData.get("eventType"),
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

  await prisma.schoolCalendarEvent.create({
    data: {
      schoolId: session.schoolId,
      title: parsed.data.title,
      description: parsed.data.description,
      eventType: parsed.data.eventType,
      startsOn,
      endsOn,
      createdByUserId: session.userId
    }
  });

  redirect(`/calendar?month=${formatMonthKey(startsOn)}`);
}
