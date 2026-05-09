"use server";

import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateHomeworkSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  details: z.string().optional(),
  dueOn: z.string().optional(),
  academicYearId: z.string().optional()
});

export async function createHomeworkAction(formData: FormData) {
  const { session } = await requireAnyPermission(["HOMEWORK", "ACADEMICS"], "EDIT");

  const parsed = CreateHomeworkSchema.safeParse({
    studentId: formData.get("studentId"),
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

  await db.homework.create({
    data: {
      schoolId: session.schoolId,
      academicYearId: year.id,
      studentId: parsed.data.studentId,
      title: parsed.data.title,
      details: parsed.data.details,
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null
    }
  });
  redirect(withAcademicYearParam("/academics/homework", year.id));
}
