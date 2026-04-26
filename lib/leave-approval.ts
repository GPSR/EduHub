import { prisma } from "@/lib/db";

export function canApproveStudentLeaveByRole(roleKey: string) {
  return roleKey === "ADMIN" || roleKey === "PRINCIPAL" || roleKey === "HEAD_MASTER" || roleKey === "CLASS_TEACHER";
}

export function canApproveTeacherLeaveByRole(roleKey: string) {
  return roleKey === "ADMIN" || roleKey === "HEAD_MASTER";
}

export async function getClassTeacherClassIds(schoolId: string, userId: string) {
  const rows = await prisma.teacherClassAssignment.findMany({
    where: {
      schoolId,
      userId,
      isClassTeacher: true
    },
    select: { classId: true }
  });
  return rows.map((row) => row.classId);
}

export async function getStudentLeaveApproverIds(args: {
  schoolId: string;
  classId?: string | null;
  excludeUserIds?: string[];
}) {
  const exclude = new Set(args.excludeUserIds ?? []);

  const leadership = await prisma.user.findMany({
    where: {
      schoolId: args.schoolId,
      isActive: true,
      schoolRole: { key: { in: ["ADMIN", "PRINCIPAL", "HEAD_MASTER"] } }
    },
    select: { id: true }
  });

  const classTeachers = args.classId
    ? await prisma.teacherClassAssignment.findMany({
        where: {
          schoolId: args.schoolId,
          classId: args.classId,
          isClassTeacher: true,
          user: { isActive: true }
        },
        select: { userId: true }
      })
    : [];

  return [...new Set([...leadership.map((row) => row.id), ...classTeachers.map((row) => row.userId)])].filter(
    (userId) => !exclude.has(userId)
  );
}

export async function getTeacherLeaveApproverIds(args: {
  schoolId: string;
  excludeUserIds?: string[];
}) {
  const exclude = new Set(args.excludeUserIds ?? []);

  const approvers = await prisma.user.findMany({
    where: {
      schoolId: args.schoolId,
      isActive: true,
      schoolRole: { key: { in: ["ADMIN", "HEAD_MASTER"] } }
    },
    select: { id: true }
  });

  return approvers.map((row) => row.id).filter((userId) => !exclude.has(userId));
}
