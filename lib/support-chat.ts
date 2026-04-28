import { db } from "@/lib/db";

const LEADERSHIP_ROLE_KEYS = ["ADMIN", "PRINCIPAL", "HEAD_MASTER"] as const;
const PARENT_CLASS_ROLE_KEYS = ["CLASS_TEACHER", "TEACHER"] as const;

function unique(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export function supportPreview(body: string, max = 180) {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export async function getLeadershipSupportRecipientIds(args: {
  schoolId: string;
  excludeUserIds?: string[];
}) {
  const users = await db.user.findMany({
    where: {
      schoolId: args.schoolId,
      isActive: true,
      schoolRole: { key: { in: [...LEADERSHIP_ROLE_KEYS] } },
      ...(args.excludeUserIds?.length ? { id: { notIn: args.excludeUserIds } } : {})
    },
    select: { id: true }
  });
  return users.map((user) => user.id);
}

export async function getParentSupportRecipientIds(args: {
  schoolId: string;
  parentUserId: string;
}) {
  const [childRows, leadershipIds] = await Promise.all([
    db.student.findMany({
      where: {
        schoolId: args.schoolId,
        parents: { some: { userId: args.parentUserId } }
      },
      select: { classId: true }
    }),
    getLeadershipSupportRecipientIds({
      schoolId: args.schoolId,
      excludeUserIds: [args.parentUserId]
    })
  ]);

  const classIds = unique(childRows.map((row) => row.classId ?? ""));
  if (classIds.length === 0) {
    return unique(leadershipIds);
  }

  const classTeachers = await db.user.findMany({
    where: {
      schoolId: args.schoolId,
      isActive: true,
      id: { not: args.parentUserId },
      schoolRole: { key: { in: [...PARENT_CLASS_ROLE_KEYS] } },
      classAssignments: { some: { classId: { in: classIds } } }
    },
    select: { id: true }
  });

  return unique([...leadershipIds, ...classTeachers.map((user) => user.id)]);
}

export async function getPlatformSupportRecipientIds(args: { schoolId: string }) {
  const assigned = await db.platformUserSchoolAssignment.findMany({
    where: {
      schoolId: args.schoolId,
      platformUser: { isActive: true, status: "APPROVED" }
    },
    select: { platformUserId: true }
  });
  const assignedIds = unique(assigned.map((row) => row.platformUserId));
  if (assignedIds.length > 0) return assignedIds;

  const fallback = await db.platformUser.findMany({
    where: { isActive: true, status: "APPROVED" },
    select: { id: true }
  });
  return fallback.map((user) => user.id);
}
