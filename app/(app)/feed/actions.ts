"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { notifyUser } from "@/lib/notify";
import { auditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreatePostSchema = z.object({
  title:   z.string().min(2),
  body:    z.string().min(2),
  classId: z.string().optional(),
});

export async function createPostAction(formData: FormData) {
  const { session } = await requirePermission("COMMUNICATION", "EDIT");

  const parsed = CreatePostSchema.safeParse({
    title:   formData.get("title"),
    body:    formData.get("body"),
    classId: (formData.get("classId") as string) || undefined,
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const isClassPost = !!parsed.data.classId;

  await db.feedPost.create({
    data: {
      schoolId: session.schoolId,
      authorId: session.userId,
      scope:    isClassPost ? "CLASS" : "SCHOOL",
      classId:  parsed.data.classId ?? null,
      title:    parsed.data.title,
      body:     parsed.data.body,
    },
  });

  await auditLog({
    actor:      { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action:     "FEED_POST_CREATED",
    entityType: "FeedPost",
    metadata:   { scope: isClassPost ? "CLASS" : "SCHOOL", classId: parsed.data.classId },
  });

  // Notify relevant users
  let usersToNotify: { id: string }[] = [];

  if (isClassPost) {
    // Only parents of students in that class
    const parents = await db.studentParent.findMany({
      where:  { student: { schoolId: session.schoolId, classId: parsed.data.classId } },
      select: { userId: true },
    });
    // Also teachers assigned to that class
    const teachers = await db.teacherClassAssignment.findMany({
      where:  { class: { id: parsed.data.classId }, user: { schoolId: session.schoolId } },
      select: { userId: true },
    });
    const uniqueIds = [...new Set([...parents.map(p => p.userId), ...teachers.map(t => t.userId)])];
    usersToNotify   = uniqueIds.map(id => ({ id }));
  } else {
    // School-wide — notify all non-admin users
    usersToNotify = await db.user.findMany({
      where:  { schoolId: session.schoolId, schoolRole: { key: { not: "ADMIN" } } },
      select: { id: true },
    });
  }

  await Promise.all(
    usersToNotify
      .filter(u => u.id !== session.userId) // don't notify the author
      .map(u =>
        notifyUser({
          schoolId: session.schoolId,
          userId:   u.id,
          title:    `${isClassPost ? "Class" : "School"} announcement: ${parsed.data.title}`,
          body:     parsed.data.body,
        })
      )
  );

  redirect("/feed");
}
