"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateHomeworkSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  details: z.string().optional(),
  dueOn: z.string().optional()
});

export async function createHomeworkAction(formData: FormData) {
  const { session } = await requirePermission("ACADEMICS", "EDIT");

  const parsed = CreateHomeworkSchema.safeParse({
    studentId: formData.get("studentId"),
    title: formData.get("title"),
    details: formData.get("details") || undefined,
    dueOn: formData.get("dueOn") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  await db.homework.create({
    data: {
      schoolId: session.schoolId,
      studentId: parsed.data.studentId,
      title: parsed.data.title,
      details: parsed.data.details,
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null
    }
  });
  redirect("/academics/homework");
}
