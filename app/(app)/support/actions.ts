"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { notifyUser } from "@/lib/notify";
import {
  getLeadershipSupportRecipientIds,
  getParentSupportRecipientIds,
  getPlatformSupportRecipientIds,
  supportPreview
} from "@/lib/support-chat";

const CreateSupportSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  body: z.string().trim().min(2).max(4000)
});

const ReplySupportSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000)
});

async function createSchoolConversation(args: {
  schoolId: string;
  createdBySchoolUserId: string;
  scope: "SCHOOL_INTERNAL" | "PLATFORM_SUPPORT";
  subject: string;
  body: string;
  schoolParticipantIds: string[];
  platformParticipantIds?: string[];
}) {
  const now = new Date();
  const schoolParticipantIds = [...new Set(args.schoolParticipantIds.concat(args.createdBySchoolUserId))];
  const platformParticipantIds = [...new Set(args.platformParticipantIds ?? [])];

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.supportConversation.create({
      data: {
        schoolId: args.schoolId,
        scope: args.scope,
        subject: args.subject,
        createdBySchoolUserId: args.createdBySchoolUserId,
        lastMessageAt: now
      },
      select: { id: true }
    });

    await tx.supportConversationSchoolParticipant.createMany({
      data: schoolParticipantIds.map((userId) => ({
        schoolId: args.schoolId,
        conversationId: created.id,
        userId,
        lastReadAt: userId === args.createdBySchoolUserId ? now : null
      })),
      skipDuplicates: true
    });

    if (platformParticipantIds.length > 0) {
      await tx.supportConversationPlatformParticipant.createMany({
        data: platformParticipantIds.map((platformUserId) => ({
          conversationId: created.id,
          platformUserId
        })),
        skipDuplicates: true
      });
    }

    await tx.supportMessage.create({
      data: {
        conversationId: created.id,
        schoolId: args.schoolId,
        senderType: "SCHOOL_USER",
        senderSchoolUserId: args.createdBySchoolUserId,
        body: args.body
      }
    });

    return created;
  });

  return conversation.id;
}

async function notifySchoolUsers(args: {
  schoolId: string;
  userIds: string[];
  title: string;
  body: string;
  conversationId: string;
}) {
  const deduped = [...new Set(args.userIds)];
  if (deduped.length === 0) return;

  const bodyWithLink = `${args.body}\nLINK:/support?conversationId=${encodeURIComponent(args.conversationId)}`;

  await Promise.all(
    deduped.map((userId) =>
      notifyUser({
        schoolId: args.schoolId,
        userId,
        title: args.title,
        body: bodyWithLink
      })
    )
  );
}

export async function createParentSupportConversationAction(formData: FormData) {
  const session = await requireSession();
  if (session.roleKey !== "PARENT") throw new Error("Only parents can start parent support chat.");

  const parsed = CreateSupportSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const recipientIds = await getParentSupportRecipientIds({
    schoolId: session.schoolId,
    parentUserId: session.userId
  });
  if (recipientIds.length === 0) {
    throw new Error("No school support recipients are configured.");
  }

  const conversationId = await createSchoolConversation({
    schoolId: session.schoolId,
    createdBySchoolUserId: session.userId,
    scope: "SCHOOL_INTERNAL",
    subject: parsed.data.subject,
    body: parsed.data.body,
    schoolParticipantIds: recipientIds
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: recipientIds,
    title: `Parent support: ${parsed.data.subject}`,
    body: supportPreview(parsed.data.body),
    conversationId
  });

  redirect(`/support?conversationId=${encodeURIComponent(conversationId)}`);
}

export async function createSchoolSupportConversationAction(formData: FormData) {
  const session = await requireSession();

  const parsed = CreateSupportSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const leadershipIds = await getLeadershipSupportRecipientIds({
    schoolId: session.schoolId,
    excludeUserIds: [session.userId]
  });
  if (leadershipIds.length === 0) {
    throw new Error("No school leadership recipients are configured.");
  }

  const conversationId = await createSchoolConversation({
    schoolId: session.schoolId,
    createdBySchoolUserId: session.userId,
    scope: "SCHOOL_INTERNAL",
    subject: parsed.data.subject,
    body: parsed.data.body,
    schoolParticipantIds: leadershipIds
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: leadershipIds,
    title: `Support request: ${parsed.data.subject}`,
    body: supportPreview(parsed.data.body),
    conversationId
  });

  redirect(`/support?conversationId=${encodeURIComponent(conversationId)}`);
}

export async function createPlatformSupportConversationAction(formData: FormData) {
  const session = await requireSession();
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can contact platform support.");

  const parsed = CreateSupportSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const [platformRecipientIds, schoolAdminIds] = await Promise.all([
    getPlatformSupportRecipientIds({ schoolId: session.schoolId }),
    prisma.user
      .findMany({
        where: {
          schoolId: session.schoolId,
          isActive: true,
          schoolRole: { key: "ADMIN" },
          id: { not: session.userId }
        },
        select: { id: true }
      })
      .then((rows) => rows.map((row) => row.id))
  ]);

  if (platformRecipientIds.length === 0) {
    throw new Error("No platform support users are available yet.");
  }

  const conversationId = await createSchoolConversation({
    schoolId: session.schoolId,
    createdBySchoolUserId: session.userId,
    scope: "PLATFORM_SUPPORT",
    subject: parsed.data.subject,
    body: parsed.data.body,
    schoolParticipantIds: schoolAdminIds,
    platformParticipantIds: platformRecipientIds
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: schoolAdminIds,
    title: `Platform support opened: ${parsed.data.subject}`,
    body: supportPreview(parsed.data.body),
    conversationId
  });

  redirect(`/support?conversationId=${encodeURIComponent(conversationId)}`);
}

export async function sendSchoolSupportMessageAction(formData: FormData) {
  const session = await requireSession();
  const parsed = ReplySupportSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const participant = await prisma.supportConversationSchoolParticipant.findFirst({
    where: {
      conversationId: parsed.data.conversationId,
      schoolId: session.schoolId,
      userId: session.userId
    },
    include: {
      conversation: {
        select: {
          id: true,
          subject: true,
          status: true,
          schoolId: true
        }
      }
    }
  });

  if (!participant) throw new Error("Conversation not found.");
  if (participant.conversation.status !== "OPEN") throw new Error("Conversation is closed.");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: {
        conversationId: parsed.data.conversationId,
        schoolId: session.schoolId,
        senderType: "SCHOOL_USER",
        senderSchoolUserId: session.userId,
        body: parsed.data.body
      }
    });

    await tx.supportConversation.update({
      where: { id: parsed.data.conversationId },
      data: { lastMessageAt: now }
    });

    await tx.supportConversationSchoolParticipant.updateMany({
      where: {
        conversationId: parsed.data.conversationId,
        userId: session.userId
      },
      data: { lastReadAt: now }
    });
  });

  const otherSchoolParticipants = await prisma.supportConversationSchoolParticipant.findMany({
    where: {
      conversationId: parsed.data.conversationId,
      schoolId: session.schoolId,
      userId: { not: session.userId }
    },
    select: { userId: true }
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: otherSchoolParticipants.map((row) => row.userId),
    title: `Support update: ${participant.conversation.subject}`,
    body: supportPreview(parsed.data.body),
    conversationId: parsed.data.conversationId
  });

  redirect(`/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`);
}
