"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateResultSchema = z.object({
  studentId: z.string().min(1),
  examName: z.string().min(2),
  subject: z.string().min(1),
  score: z.coerce.number(),
  maxScore: z.coerce.number().positive(),
  remarks: z.string().optional()
});

export async function createExamResultAction(formData: FormData) {
  const { session } = await requirePermission("ACADEMICS", "EDIT");

  const parsed = CreateResultSchema.safeParse({
    studentId: formData.get("studentId"),
    examName: formData.get("examName"),
    subject: formData.get("subject"),
    score: formData.get("score"),
    maxScore: formData.get("maxScore"),
    remarks: formData.get("remarks") || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  await prisma.examResult.create({
    data: {
      schoolId: session.schoolId,
      studentId: parsed.data.studentId,
      examName: parsed.data.examName,
      subject: parsed.data.subject,
      score: parsed.data.score,
      maxScore: parsed.data.maxScore,
      remarks: parsed.data.remarks
    }
  });

  redirect("/academics/exams");
}
