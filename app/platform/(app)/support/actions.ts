"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";
import { notifyUser } from "@/lib/notify";
import { supportPreview } from "@/lib/support-chat";

const ReplySupportSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000)
});

const CloseSupportSchema = z.object({
  conversationId: z.string().min(1)
});

export async function sendPlatformSupportMessageAction(formData: FormData) {
  const { session } = await requirePlatformUser();

  const parsed = ReplySupportSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const participant = await db.supportConversationPlatformParticipant.findFirst({
    where: {
      conversationId: parsed.data.conversationId,
      platformUserId: session.platformUserId
    },
    include: {
      conversation: {
        select: {
          id: true,
          schoolId: true,
          subject: true,
          status: true
        }
      }
    }
  });

  if (!participant) throw new Error("Conversation not found.");
  if (participant.conversation.status !== "OPEN") throw new Error("Conversation is closed.");

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: {
        conversationId: parsed.data.conversationId,
        schoolId: participant.conversation.schoolId,
        senderType: "PLATFORM_USER",
        senderPlatformUserId: session.platformUserId,
        body: parsed.data.body
      }
    });

    await tx.supportConversation.update({
      where: { id: parsed.data.conversationId },
      data: { lastMessageAt: now }
    });

    await tx.supportConversationPlatformParticipant.updateMany({
      where: {
        conversationId: parsed.data.conversationId,
        platformUserId: session.platformUserId
      },
      data: { lastReadAt: now }
    });
  });

  const schoolParticipants = await db.supportConversationSchoolParticipant.findMany({
    where: {
      conversationId: parsed.data.conversationId,
      schoolId: participant.conversation.schoolId
    },
    select: { userId: true }
  });

  const notifyBody = `${supportPreview(parsed.data.body)}\nLINK:/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`;

  await Promise.all(
    schoolParticipants.map((row) =>
      notifyUser({
        schoolId: participant.conversation.schoolId,
        userId: row.userId,
        title: `Platform reply: ${participant.conversation.subject}`,
        body: notifyBody
      })
    )
  );

  redirect(`/platform/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`);
}

export async function closePlatformSupportConversationAction(formData: FormData) {
  const { session } = await requirePlatformUser();

  const parsed = CloseSupportSchema.safeParse({
    conversationId: formData.get("conversationId")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");

  const participant = await db.supportConversationPlatformParticipant.findFirst({
    where: {
      conversationId: parsed.data.conversationId,
      platformUserId: session.platformUserId
    },
    include: {
      platformUser: { select: { name: true } },
      conversation: {
        select: {
          id: true,
          schoolId: true,
          subject: true,
          status: true
        }
      }
    }
  });
  if (!participant) throw new Error("Conversation not found.");
  if (participant.conversation.status === "CLOSED") {
    redirect(`/platform/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`);
  }

  await db.supportConversation.update({
    where: { id: parsed.data.conversationId },
    data: { status: "CLOSED" }
  });

  const schoolParticipants = await db.supportConversationSchoolParticipant.findMany({
    where: {
      conversationId: parsed.data.conversationId,
      schoolId: participant.conversation.schoolId
    },
    select: { userId: true }
  });

  const notifyBody = `${participant.platformUser.name} (Platform) closed this chat.\nLINK:/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`;
  await Promise.all(
    schoolParticipants.map((row) =>
      notifyUser({
        schoolId: participant.conversation.schoolId,
        userId: row.userId,
        title: `Support chat closed: ${participant.conversation.subject}`,
        body: notifyBody
      })
    )
  );

  redirect(`/platform/support?conversationId=${encodeURIComponent(parsed.data.conversationId)}`);
}
