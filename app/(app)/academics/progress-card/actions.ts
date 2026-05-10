"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/require-permission";
import { requireWritableAcademicYear, withAcademicYearParam } from "@/lib/academic-year";
import { getSchoolProgressCardExamTemplates } from "@/lib/progress-card-exam-templates";

const BulkProgressCardSchema = z.object({
  classId: z.string().min(1),
  templateId: z.string().min(1),
  academicYearId: z.string().optional(),
  returnTo: z.string().optional()
});

function buildReturnPath(basePath: string, classId: string, templateId: string, academicYearId: string) {
  const params = new URLSearchParams();
  params.set("classId", classId);
  params.set("templateId", templateId);
  const pathWithFilters = `${basePath}?${params.toString()}`;
  return withAcademicYearParam(pathWithFilters, academicYearId);
}

export async function createProgressCardGridAction(formData: FormData) {
  const { session } = await requireAnyPermission(["PROGRESS_CARD", "ACADEMICS"], "EDIT");

  const parsed = BulkProgressCardSchema.safeParse({
    classId: String(formData.get("classId") ?? "").trim(),
    templateId: String(formData.get("templateId") ?? "").trim(),
    academicYearId: String(formData.get("academicYearId") ?? "").trim() || undefined,
    returnTo: String(formData.get("returnTo") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const year = await requireWritableAcademicYear({
    schoolId: session.schoolId,
    requestedYearId: parsed.data.academicYearId
  });

  const selectedClass = await db.class.findFirst({
    where: { id: parsed.data.classId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!selectedClass) throw new Error("Class not found.");

  const templates = await getSchoolProgressCardExamTemplates(session.schoolId);
  const template = templates.find((entry) => entry.id === parsed.data.templateId);
  if (!template) throw new Error("Exam template not found. Update Settings and try again.");

  const students = await db.student.findMany({
    where: { schoolId: session.schoolId, classId: selectedClass.id },
    select: { id: true }
  });
  const studentIdSet = new Set(students.map((student) => student.id));

  const toCreate: Array<{ studentId: string; score: number; remarks?: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score:")) continue;
    const studentId = key.slice("score:".length);
    if (!studentIdSet.has(studentId)) continue;

    const rawScore = String(value ?? "").trim();
    if (!rawScore) continue;

    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0) throw new Error("Score should be zero or positive.");
    if (score > template.maxScore) throw new Error(`Score cannot be greater than max score (${template.maxScore}).`);

    const remarksKey = `remarks:${studentId}`;
    const remarksRaw = String(formData.get(remarksKey) ?? "").trim();
    toCreate.push({
      studentId,
      score: Math.round(score * 100) / 100,
      remarks: remarksRaw ? remarksRaw.slice(0, 500) : undefined
    });
  }

  if (toCreate.length > 0) {
    await db.examResult.createMany({
      data: toCreate.map((row) => ({
        schoolId: session.schoolId,
        academicYearId: year.id,
        studentId: row.studentId,
        examName: template.examName,
        subject: template.subject,
        score: row.score,
        maxScore: template.maxScore,
        remarks: row.remarks
      }))
    });
  }

  const returnTo = parsed.data.returnTo || "/academics/progress-card";
  redirect(buildReturnPath(returnTo, selectedClass.id, template.id, year.id));
}
