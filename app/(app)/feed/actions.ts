"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { auditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2)
});

export async function createPostAction(formData: FormData) {
  const { session } = await requirePermission("COMMUNICATION", "EDIT");

  const parsed = CreatePostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const post = await prisma.feedPost.create({
    data: {
      schoolId: session.schoolId,
      authorId: session.userId,
      scope: "SCHOOL",
      title: parsed.data.title,
      body: parsed.data.body
    }
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "FEED_POST_CREATED",
    entityType: "FeedPost"
  });

  // School-wide announcement: notify all school users (all roles).
  const recipients = await prisma.user.findMany({
    where: { schoolId: session.schoolId, id: { not: session.userId } },
    select: { id: true }
  });
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        schoolId: session.schoolId,
        userId: u.id,
        title: `Announcement: ${parsed.data.title}`,
        body: parsed.data.body
      }))
    });
  }

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "FEED_POST_NOTIFIED_USERS",
    entityType: "FeedPost",
    entityId: post.id,
    metadata: { recipients: recipients.length, scope: "SCHOOL_ALL_USERS" }
  });

  redirect("/feed");
}
