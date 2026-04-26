import { prisma } from "@/lib/db";

export async function getUnreadSupportConversationCount(args: {
  schoolId: string;
  userId: string;
}) {
  const rows = await prisma.supportConversationSchoolParticipant.findMany({
    where: {
      schoolId: args.schoolId,
      userId: args.userId,
      conversation: {
        status: "OPEN",
        lastMessageAt: { not: null }
      }
    },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          lastMessageAt: true
        }
      }
    },
    take: 250
  });

  let unread = 0;
  for (const row of rows) {
    const lastMessageAt = row.conversation.lastMessageAt;
    if (!lastMessageAt) continue;
    if (!row.lastReadAt || row.lastReadAt < lastMessageAt) unread += 1;
  }

  return unread;
}
