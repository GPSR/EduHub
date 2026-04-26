import { prisma } from "@/lib/db";

const LAST_SEEN_ACTION = "YOUTUBE_LIBRARY_LAST_SEEN";

async function getYouTubeLibraryLastSeenAt(args: { schoolId: string; userId: string }): Promise<Date | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      schoolId: args.schoolId,
      actorType: "SCHOOL_USER",
      actorId: args.userId,
      action: LAST_SEEN_ACTION,
      entityType: "User",
      entityId: args.userId
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, metadataJson: true }
  });

  if (!log) return null;
  if (!log.metadataJson) return log.createdAt;

  try {
    const parsed = JSON.parse(log.metadataJson) as { at?: unknown };
    if (typeof parsed.at === "string") {
      const parsedAt = new Date(parsed.at);
      if (!Number.isNaN(parsedAt.getTime())) return parsedAt;
    }
  } catch {
    // Fall through to createdAt.
  }

  return log.createdAt;
}

function compactClassIds(classIds: Array<string | null | undefined>) {
  return [...new Set(classIds.filter(Boolean) as string[])];
}

async function getVisibleClassIds(args: {
  schoolId: string;
  userId: string;
  roleKey: string;
}): Promise<string[] | null> {
  if (args.roleKey === "PARENT") {
    const rows = await prisma.student.findMany({
      where: {
        schoolId: args.schoolId,
        parents: { some: { userId: args.userId } }
      },
      select: { classId: true }
    });
    return compactClassIds(rows.map((row) => row.classId));
  }

  if (args.roleKey === "TEACHER" || args.roleKey === "CLASS_TEACHER") {
    const rows = await prisma.teacherClassAssignment.findMany({
      where: {
        schoolId: args.schoolId,
        userId: args.userId
      },
      select: { classId: true }
    });
    return compactClassIds(rows.map((row) => row.classId));
  }

  return null;
}

export async function markYouTubeLearningSeen(args: { schoolId: string; userId: string }) {
  await prisma.auditLog.create({
    data: {
      schoolId: args.schoolId,
      actorType: "SCHOOL_USER",
      actorId: args.userId,
      action: LAST_SEEN_ACTION,
      entityType: "User",
      entityId: args.userId,
      metadataJson: JSON.stringify({ at: new Date().toISOString() })
    }
  });
}

export async function getUnreadYouTubeLearningCount(args: {
  schoolId: string;
  userId: string;
  roleKey: string;
}) {
  const [lastSeenAt, visibleClassIds] = await Promise.all([
    getYouTubeLibraryLastSeenAt({ schoolId: args.schoolId, userId: args.userId }),
    getVisibleClassIds(args)
  ]);

  return prisma.youTubeLearningVideo.count({
    where: {
      schoolId: args.schoolId,
      isActive: true,
      createdByUserId: { not: args.userId },
      ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
      ...(visibleClassIds
        ? {
            OR: [{ classId: null }, { classId: { in: visibleClassIds } }]
          }
        : {})
    }
  });
}
