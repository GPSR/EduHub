import { prisma } from "@/lib/db";

function startOfNow() {
  return new Date();
}

export async function markFeedSeen(schoolId: string, userId: string) {
  await prisma.auditLog.create({
    data: {
      schoolId,
      actorType: "SCHOOL_USER",
      actorId: userId,
      action: "FEED_LAST_SEEN",
      entityType: "User",
      entityId: userId,
      metadataJson: JSON.stringify({ at: startOfNow().toISOString() })
    }
  });
}

async function getFeedLastSeenAt(schoolId: string, userId: string): Promise<Date | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      schoolId,
      actorType: "SCHOOL_USER",
      actorId: userId,
      action: "FEED_LAST_SEEN",
      entityType: "User",
      entityId: userId
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true, createdAt: true }
  });
  if (!log) return null;
  if (!log.metadataJson) return log.createdAt;
  try {
    const parsed = JSON.parse(log.metadataJson) as { at?: unknown };
    if (typeof parsed.at === "string") {
      const dt = new Date(parsed.at);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    return log.createdAt;
  } catch {
    return log.createdAt;
  }
}

export async function getUnreadFeedCount(args: {
  schoolId: string;
  userId: string;
  roleKey: string;
}): Promise<number> {
  const lastSeenAt = await getFeedLastSeenAt(args.schoolId, args.userId);
  const createdAtFilter = lastSeenAt ? { gt: lastSeenAt } : undefined;

  if (args.roleKey === "PARENT") {
    const childClassIds = (
      await prisma.student.findMany({
        where: { schoolId: args.schoolId, parents: { some: { userId: args.userId } } },
        select: { classId: true }
      })
    )
      .map((s) => s.classId)
      .filter(Boolean) as string[];

    if (!childClassIds.length) {
      return prisma.feedPost.count({
        where: {
          schoolId: args.schoolId,
          scope: "SCHOOL",
          authorId: { not: args.userId },
          createdAt: createdAtFilter
        }
      });
    }

    return prisma.feedPost.count({
      where: {
        schoolId: args.schoolId,
        authorId: { not: args.userId },
        createdAt: createdAtFilter,
        OR: [{ scope: "SCHOOL" }, { classId: { in: childClassIds } }]
      }
    });
  }

  return prisma.feedPost.count({
    where: {
      schoolId: args.schoolId,
      authorId: { not: args.userId },
      createdAt: createdAtFilter
    }
  });
}
