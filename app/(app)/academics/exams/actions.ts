"use server";

import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateResultSchema = z.object({
  studentId: z.string().min(1),
  examName: z.string().min(2),
  subject: z.string().min(1),
  score: z.coerce.number(),
  maxScore: z.coerce.number().positive(),
  remarks: z.string().optional(),
  academicYearId: z.string().optional(),
  returnTo: z.enum(["/academics/exams", "/academics/progress-card"]).optional()
});

export async function createExamResultAction(formData: FormData) {
  const { session } = await requireAnyPermission(["PROGRESS_CARD", "ACADEMICS"], "EDIT");

  const parsed = CreateResultSchema.safeParse({
    studentId: formData.get("studentId"),
    examName: formData.get("examName"),
    subject: formData.get("subject"),
    score: formData.get("score"),
    maxScore: formData.get("maxScore"),
    remarks: formData.get("remarks") || undefined,
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined,
    returnTo: String(formData.get("returnTo") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });

  await db.examResult.create({
    data: {
      schoolId: session.schoolId,
      academicYearId: year.id,
      studentId: parsed.data.studentId,
      examName: parsed.data.examName,
      subject: parsed.data.subject,
      score: parsed.data.score,
      maxScore: parsed.data.maxScore,
      remarks: parsed.data.remarks
    }
  });

  redirect(withAcademicYearParam(parsed.data.returnTo ?? "/academics/exams", year.id));
}
