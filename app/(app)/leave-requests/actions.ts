"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { notifyUser } from "@/lib/notify";
import {
  canApproveStudentLeaveByRole,
  canApproveTeacherLeaveByRole,
  getClassTeacherClassIds,
  getStudentLeaveApproverIds,
  getTeacherLeaveApproverIds
} from "@/lib/leave-approval";
import { eachDayInclusive, inclusiveDayCount, parseDateOnlyInput } from "@/lib/leave-utils";

const CreateStudentLeaveSchema = z.object({
  studentId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().trim().min(4).max(1200)
});

const CreateTeacherLeaveSchema = z.object({
  teacherUserId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().trim().min(4).max(1200)
});

const DecideLeaveSchema = z.object({
  leaveRequestId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  decisionNote: z.string().trim().max(500).optional()
});

function normalizeDateRange(args: { fromDate: string; toDate: string }) {
  const from = parseDateOnlyInput(args.fromDate);
  const to = parseDateOnlyInput(args.toDate);
  if (!from || !to) return null;
  if (to < from) return null;
  return { fromDate: from, toDate: to, totalDays: inclusiveDayCount(from, to) };
}

async function notifySchoolUsers(args: {
  schoolId: string;
  userIds: string[];
  title: string;
  body: string;
}) {
  const userIds = [...new Set(args.userIds)].filter(Boolean);
  if (userIds.length === 0) return;

  await Promise.all(
    userIds.map((userId) =>
      notifyUser({
        schoolId: args.schoolId,
        userId,
        title: args.title,
        body: `${args.body}\nLINK:/leave-requests`
      })
    )
  );
}

export async function createStudentLeaveRequestAction(formData: FormData) {
  const { session } = await requirePermission("LEAVE_REQUESTS", "EDIT");

  const parsed = CreateStudentLeaveSchema.safeParse({
    studentId: formData.get("studentId"),
    fromDate: formData.get("fromDate"),
    toDate: formData.get("toDate"),
    reason: formData.get("reason")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  if (!["PARENT", "CLASS_TEACHER", "PRINCIPAL", "HEAD_MASTER", "ADMIN"].includes(session.roleKey)) {
    throw new Error("Only parents and school leadership can submit student leave requests.");
  }

  const range = normalizeDateRange({ fromDate: parsed.data.fromDate, toDate: parsed.data.toDate });
  if (!range) throw new Error("Invalid leave date range.");

  const student = await db.student.findFirst({
    where: {
      id: parsed.data.studentId,
      schoolId: session.schoolId
    },
    select: {
      id: true,
      fullName: true,
      classId: true,
      parents: { select: { userId: true } }
    }
  });

  if (!student) throw new Error("Student not found.");

  if (session.roleKey === "PARENT") {
    const linked = student.parents.some((parent) => parent.userId === session.userId);
    if (!linked) throw new Error("You can request leave only for your linked students.");
  }

  if (session.roleKey === "CLASS_TEACHER") {
    const classTeacherClassIds = await getClassTeacherClassIds(session.schoolId, session.userId);
    if (!student.classId || !classTeacherClassIds.includes(student.classId)) {
      throw new Error("You can request student leave only for your class teacher sections.");
    }
  }

  await db.leaveRequest.create({
    data: {
      schoolId: session.schoolId,
      requesterType: "STUDENT",
      studentId: student.id,
      requestedByUserId: session.userId,
      fromDate: range.fromDate,
      toDate: range.toDate,
      totalDays: range.totalDays,
      reason: parsed.data.reason
    }
  });

  const approverIds = await getStudentLeaveApproverIds({
    schoolId: session.schoolId,
    classId: student.classId,
    excludeUserIds: [session.userId]
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: approverIds,
    title: `Student leave request: ${student.fullName}`,
    body: `${parsed.data.fromDate} to ${parsed.data.toDate} (${range.totalDays} day(s)).`
  });

  redirect("/leave-requests");
}

export async function createTeacherLeaveRequestAction(formData: FormData) {
  const { session } = await requirePermission("LEAVE_REQUESTS", "EDIT");

  if (!["TEACHER", "CLASS_TEACHER", "PRINCIPAL", "HEAD_MASTER", "ADMIN"].includes(session.roleKey)) {
    throw new Error("Only teachers and school leadership can submit staff leave requests.");
  }

  const parsed = CreateTeacherLeaveSchema.safeParse({
    teacherUserId: formData.get("teacherUserId"),
    fromDate: formData.get("fromDate"),
    toDate: formData.get("toDate"),
    reason: formData.get("reason")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const range = normalizeDateRange({ fromDate: parsed.data.fromDate, toDate: parsed.data.toDate });
  if (!range) throw new Error("Invalid leave date range.");

  if (
    (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") &&
    parsed.data.teacherUserId !== session.userId
  ) {
    throw new Error("You can submit staff leave only for yourself.");
  }

  const staffUser = await db.user.findFirst({
    where: {
      id: parsed.data.teacherUserId,
      schoolId: session.schoolId,
      isActive: true,
      schoolRole: {
        key: { in: ["TEACHER", "CLASS_TEACHER"] }
      }
    },
    select: { id: true, name: true }
  });
  if (!staffUser) throw new Error("Selected staff member not found.");

  await db.leaveRequest.create({
    data: {
      schoolId: session.schoolId,
      requesterType: "TEACHER",
      teacherUserId: staffUser.id,
      requestedByUserId: session.userId,
      fromDate: range.fromDate,
      toDate: range.toDate,
      totalDays: range.totalDays,
      reason: parsed.data.reason
    }
  });

  const approverIds = await getTeacherLeaveApproverIds({
    schoolId: session.schoolId,
    excludeUserIds: [session.userId]
  });

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: [...approverIds, staffUser.id],
    title: `Staff leave request: ${staffUser.name}`,
    body: `${parsed.data.fromDate} to ${parsed.data.toDate} (${range.totalDays} day(s)).`
  });

  redirect("/leave-requests");
}

export async function decideLeaveRequestAction(formData: FormData) {
  const { session } = await requirePermission("LEAVE_REQUESTS", "APPROVE");

  const parsed = DecideLeaveSchema.safeParse({
    leaveRequestId: formData.get("leaveRequestId"),
    decision: formData.get("decision"),
    decisionNote: String(formData.get("decisionNote") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unable to process request.");
  }

  const leaveRequest = await db.leaveRequest.findFirst({
    where: {
      id: parsed.data.leaveRequestId,
      schoolId: session.schoolId
    },
    include: {
      student: { select: { id: true, fullName: true, classId: true, parents: { select: { userId: true } } } },
      teacherUser: { select: { id: true, name: true } },
      requestedByUser: { select: { id: true, name: true } }
    }
  });

  if (!leaveRequest) throw new Error("Leave request not found.");
  if (leaveRequest.status !== "PENDING") throw new Error("This leave request is already processed.");

  let canApprove = false;

  if (leaveRequest.requesterType === "STUDENT") {
    if (canApproveStudentLeaveByRole(session.roleKey)) {
      if (session.roleKey === "CLASS_TEACHER") {
        const classTeacherClassIds = await getClassTeacherClassIds(session.schoolId, session.userId);
        canApprove = Boolean(leaveRequest.student?.classId && classTeacherClassIds.includes(leaveRequest.student.classId));
      } else {
        canApprove = true;
      }
    }
  } else if (leaveRequest.requesterType === "TEACHER") {
    canApprove = canApproveTeacherLeaveByRole(session.roleKey);
  }

  if (!canApprove) {
    throw new Error("You do not have permission to approve this leave request.");
  }

  const nextStatus = parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const approvedAt = nextStatus === "APPROVED" ? new Date() : null;

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: {
        status: nextStatus,
        decisionNote: parsed.data.decisionNote,
        approvedByUserId: session.userId,
        approvedAt
      }
    });

    if (nextStatus === "APPROVED" && leaveRequest.requesterType === "STUDENT" && leaveRequest.studentId) {
      for (const day of eachDayInclusive(leaveRequest.fromDate, leaveRequest.toDate)) {
        await tx.attendanceRecord.upsert({
          where: {
            studentId_date: {
              studentId: leaveRequest.studentId,
              date: day
            }
          },
          update: {
            status: "LEAVE",
            notedById: session.userId,
            schoolId: session.schoolId
          },
          create: {
            schoolId: session.schoolId,
            studentId: leaveRequest.studentId,
            date: day,
            status: "LEAVE",
            notedById: session.userId
          }
        });
      }
    }
  });

  const requesterName =
    leaveRequest.requesterType === "STUDENT"
      ? leaveRequest.student?.fullName ?? "Student"
      : leaveRequest.teacherUser?.name ?? "Teacher";

  const notifyIds = new Set<string>([leaveRequest.requestedByUserId]);
  if (leaveRequest.teacherUserId) notifyIds.add(leaveRequest.teacherUserId);
  if (leaveRequest.student) {
    for (const parent of leaveRequest.student.parents) {
      notifyIds.add(parent.userId);
    }
  }

  await notifySchoolUsers({
    schoolId: session.schoolId,
    userIds: [...notifyIds],
    title: `Leave request ${nextStatus.toLowerCase()}`,
    body: `${requesterName}: ${leaveRequest.fromDate.toISOString().slice(0, 10)} to ${leaveRequest.toDate.toISOString().slice(0, 10)}.`
  });

  redirect("/leave-requests");
}
