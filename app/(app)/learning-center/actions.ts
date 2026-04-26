"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { saveUploadedImage } from "@/lib/uploads";

const CreateLearningResourceSchema = z.object({
  classId: z.string().optional(),
  title: z.string().trim().min(2).max(140),
  summary: z.string().trim().max(300).optional(),
  resourceType: z.enum(["NOTE", "VIDEO", "LINK", "DOCUMENT"]),
  content: z.string().trim().max(4000).optional(),
  linkUrl: z.string().trim().url("Please enter a valid URL").optional()
});

async function getTeacherClassIds(schoolId: string, userId: string) {
  const rows = await prisma.teacherClassAssignment.findMany({
    where: {
      schoolId,
      userId
    },
    select: { classId: true }
  });
  return [...new Set(rows.map((row) => row.classId))];
}

export async function createLearningResourceAction(formData: FormData) {
  const { session } = await requirePermission("LEARNING_CENTER", "EDIT");

  const parsed = CreateLearningResourceSchema.safeParse({
    classId: String(formData.get("classId") ?? "").trim() || undefined,
    title: formData.get("title"),
    summary: String(formData.get("summary") ?? "").trim() || undefined,
    resourceType: formData.get("resourceType"),
    content: String(formData.get("content") ?? "").trim() || undefined,
    linkUrl: String(formData.get("linkUrl") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const classId = parsed.data.classId ?? null;
  if (classId) {
    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true }
    });
    if (!classExists) throw new Error("Selected class is invalid.");
  }

  if (parsed.data.resourceType === "LINK" && !parsed.data.linkUrl) {
    throw new Error("Link is required for link resources.");
  }

  if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const teacherClassIds = await getTeacherClassIds(session.schoolId, session.userId);
    if (!classId) throw new Error("Teachers must select a class for learning resources.");
    if (!teacherClassIds.includes(classId)) {
      throw new Error("You can only add resources to your assigned classes.");
    }
  }

  const file = formData.get("attachment");
  let attachmentUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedImage({
      file,
      folder: `schools/${session.schoolId}/learning-center`,
      prefix: "learning-center"
    });
    if (!saved.ok) throw new Error(saved.message);
    attachmentUrl = saved.url;
  }

  await prisma.learningCenterResource.create({
    data: {
      schoolId: session.schoolId,
      classId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      resourceType: parsed.data.resourceType,
      content: parsed.data.content,
      linkUrl: parsed.data.linkUrl,
      attachmentUrl,
      createdByUserId: session.userId
    }
  });

  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  redirect(`/learning-center${query}`);
}
