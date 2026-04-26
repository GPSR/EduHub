"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";

const CreateYouTubeLearningVideoSchema = z.object({
  classId: z.string().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(500).optional(),
  youtubeUrl: z.string().trim().url("Please enter a valid YouTube URL."),
  holidayOnly: z.boolean().default(false)
});

function extractYouTubeVideoId(inputUrl: string) {
  try {
    const url = new URL(inputUrl);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && id.length >= 6 ? id : null;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId && watchId.length >= 6) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live")) {
        const id = parts[1];
        return id && id.length >= 6 ? id : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

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

export async function createYouTubeLearningVideoAction(formData: FormData) {
  const { session } = await requirePermission("YOUTUBE_LEARNING", "EDIT");

  const parsed = CreateYouTubeLearningVideoSchema.safeParse({
    classId: String(formData.get("classId") ?? "").trim() || undefined,
    title: formData.get("title"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    youtubeUrl: formData.get("youtubeUrl"),
    holidayOnly: Boolean(formData.get("holidayOnly"))
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const classId = parsed.data.classId ?? null;
  if (classId) {
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: session.schoolId
      },
      select: { id: true }
    });
    if (!classExists) throw new Error("Selected class is invalid.");
  }

  if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const teacherClassIds = await getTeacherClassIds(session.schoolId, session.userId);
    if (!classId) throw new Error("Teachers must map YouTube videos to one class.");
    if (!teacherClassIds.includes(classId)) {
      throw new Error("You can only post videos to your assigned classes.");
    }
  }

  const videoId = extractYouTubeVideoId(parsed.data.youtubeUrl);
  if (!videoId) throw new Error("Please provide a valid YouTube video URL.");

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  await prisma.youTubeLearningVideo.create({
    data: {
      schoolId: session.schoolId,
      classId,
      title: parsed.data.title,
      description: parsed.data.description,
      youtubeUrl: canonicalUrl,
      youtubeVideoId: videoId,
      holidayOnly: parsed.data.holidayOnly,
      createdByUserId: session.userId
    }
  });

  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  redirect(`/youtube-learning${query}`);
}
