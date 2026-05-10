"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/require-permission";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PermissionLevel } from "@/lib/db-types";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { auditLog } from "@/lib/audit";
import { ensureActiveAcademicYearForSchool } from "@/lib/academic-year";

export type CreateUserState = { ok: boolean; message?: string };
export type UpdateUserPasswordState = { ok: boolean; message?: string };

type TeacherScheduleInput = {
  classId: string;
  subjectName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string;
};

const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isSchoolAdminPasswordAllowedRole(roleKey: string) {
  const normalized = roleKey.toUpperCase();
  return (
    normalized === "TEACHER" ||
    normalized.startsWith("TEACHER_") ||
    normalized === "CLASS_TEACHER" ||
    normalized.startsWith("CLASS_TEACHER_") ||
    normalized === "PARENT" ||
    normalized.startsWith("PARENT_") ||
    normalized === "STUDENT" ||
    normalized.startsWith("STUDENT_")
  );
}

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  schoolRoleId: z.string().min(1),
  password: z.string().min(8),
  linkStudentId: z.string().optional(),
  parentRelation: z.string().optional(),
  classIds: z.array(z.string()).optional()
});

function toMinutes(value: string) {
  const [hh, mm] = value.split(":").map((part) => Number(part));
  return hh * 60 + mm;
}

function parseTeacherScheduleRows(formData: FormData): {
  rows: TeacherScheduleInput[];
  error?: string;
} {
  const classIds = formData.getAll("teacherScheduleClassId").map((value) => String(value ?? "").trim());
  const subjectNames = formData.getAll("teacherScheduleSubject").map((value) => String(value ?? "").trim());
  const weekdays = formData.getAll("teacherScheduleWeekday").map((value) => String(value ?? "").trim());
  const startTimes = formData.getAll("teacherScheduleStartTime").map((value) => String(value ?? "").trim());
  const endTimes = formData.getAll("teacherScheduleEndTime").map((value) => String(value ?? "").trim());
  const rooms = formData.getAll("teacherScheduleRoom").map((value) => String(value ?? "").trim());

  const rowCount = Math.max(
    classIds.length,
    subjectNames.length,
    weekdays.length,
    startTimes.length,
    endTimes.length,
    rooms.length
  );
  const rows: TeacherScheduleInput[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const classId = classIds[index] ?? "";
    const subjectName = subjectNames[index] ?? "";
    const weekdayRaw = weekdays[index] ?? "";
    const startTime = startTimes[index] ?? "";
    const endTime = endTimes[index] ?? "";
    const room = rooms[index] ?? "";

    const allBlank = !classId && !subjectName && !weekdayRaw && !startTime && !endTime && !room;
    if (allBlank) continue;

    if (!classId || !subjectName || !weekdayRaw || !startTime || !endTime) {
      return { rows: [], error: `Complete all fields for teacher schedule row ${index + 1}.` };
    }

    const weekday = Number(weekdayRaw);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return { rows: [], error: `Weekday is invalid in teacher schedule row ${index + 1}.` };
    }
    if (!TIME_VALUE_PATTERN.test(startTime) || !TIME_VALUE_PATTERN.test(endTime)) {
      return { rows: [], error: `Time format should be HH:MM in teacher schedule row ${index + 1}.` };
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return { rows: [], error: `End time must be after start time in teacher schedule row ${index + 1}.` };
    }

    rows.push({
      classId,
      subjectName,
      weekday,
      startTime,
      endTime,
      room: room || undefined
    });
  }

  if (rows.length > 40) {
    return { rows: [], error: "Teacher schedule has too many rows. Please keep it within 40 slots." };
  }

  return { rows };
}

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const { session } = await requirePermission("USERS", "ADMIN");

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    schoolRoleId: formData.get("schoolRoleId"),
    password: formData.get("password"),
    linkStudentId: (formData.get("linkStudentId") as string) || undefined,
    parentRelation: (formData.get("parentRelation") as string) || undefined,
    classIds: formData.getAll("classIds").map((v) => String(v)).filter(Boolean)
  });
  if (!parsed.success) return { ok: false, message: "Please check your inputs." };

  const role = await db.schoolRole.findFirst({
    where: { id: parsed.data.schoolRoleId, schoolId: session.schoolId }
  });
  if (!role) return { ok: false, message: "Invalid role." };

  const isTeacherRole = role.key === "TEACHER" || role.key === "CLASS_TEACHER";
  const classIds = Array.from(new Set(parsed.data.classIds ?? []));
  if (role.key === "CLASS_TEACHER" && classIds.length !== 1) {
    return { ok: false, message: "Class Teacher must be mapped to exactly one class." };
  }

  const teacherScheduleParsed = parseTeacherScheduleRows(formData);
  if (teacherScheduleParsed.error) {
    return { ok: false, message: teacherScheduleParsed.error };
  }
  if (teacherScheduleParsed.rows.length > 0 && !isTeacherRole) {
    return { ok: false, message: "Teacher schedule can only be set for Teacher or Class Teacher roles." };
  }

  const teacherScheduleClassIds = Array.from(new Set(teacherScheduleParsed.rows.map((row) => row.classId)));
  const teacherClassIds =
    isTeacherRole
      ? Array.from(new Set([...classIds, ...teacherScheduleClassIds]))
      : classIds;

  if (role.key === "CLASS_TEACHER" && teacherClassIds.length !== 1) {
    return { ok: false, message: "Class Teacher schedule should use only one class." };
  }

  if (role.key === "CLASS_TEACHER" && teacherScheduleParsed.rows.length > 0) {
    const onlyClassId = classIds[0] ?? "";
    if (teacherScheduleParsed.rows.some((row) => row.classId !== onlyClassId)) {
      return { ok: false, message: "Class Teacher schedule should match the selected class only." };
    }
  }

  if (teacherClassIds.length > 0) {
    const validClasses = await db.class.findMany({
      where: { schoolId: session.schoolId, id: { in: teacherClassIds } },
      select: { id: true }
    });
    const validSet = new Set(validClasses.map((item) => item.id));
    if (validSet.size !== teacherClassIds.length) {
      return { ok: false, message: "One or more selected classes are invalid." };
    }
  }

  let teacherScheduleYearId: string | null = null;
  if (teacherScheduleParsed.rows.length > 0) {
    const activeYear = await ensureActiveAcademicYearForSchool(session.schoolId);
    teacherScheduleYearId = activeYear.id;

    for (let i = 0; i < teacherScheduleParsed.rows.length; i += 1) {
      for (let j = i + 1; j < teacherScheduleParsed.rows.length; j += 1) {
        const current = teacherScheduleParsed.rows[i]!;
        const next = teacherScheduleParsed.rows[j]!;
        if (current.weekday !== next.weekday) continue;
        const overlaps =
          toMinutes(current.startTime) < toMinutes(next.endTime) &&
          toMinutes(current.endTime) > toMinutes(next.startTime);
        if (overlaps) {
          return { ok: false, message: `Schedule row ${i + 1} overlaps with row ${j + 1}.` };
        }
      }
    }

    for (let i = 0; i < teacherScheduleParsed.rows.length; i += 1) {
      const row = teacherScheduleParsed.rows[i]!;
      const classConflict = await db.teacherTimetableEntry.findFirst({
        where: {
          schoolId: session.schoolId,
          academicYearId: teacherScheduleYearId,
          classId: row.classId,
          weekday: row.weekday,
          startTime: { lt: row.endTime },
          endTime: { gt: row.startTime }
        },
        select: {
          subjectName: true,
          startTime: true,
          endTime: true,
          teacherUser: { select: { name: true } }
        }
      });
      if (classConflict) {
        return {
          ok: false,
          message: `Class timing conflict in schedule row ${i + 1} with ${classConflict.teacherUser.name} · ${classConflict.subjectName} (${classConflict.startTime}-${classConflict.endTime}).`
        };
      }
    }
  }

  const enabledModuleRows = await db.schoolModule.findMany({
    where: { schoolId: session.schoolId, enabled: true },
    select: { moduleId: true, module: { select: { key: true } } }
  });
  const enabledModuleIds = new Set(enabledModuleRows.map((m) => m.moduleId));
  const transportModuleId = enabledModuleRows.find((m) => m.module.key === "TRANSPORT")?.moduleId;
  const permEntries: Array<{ moduleId: string; level: PermissionLevel }> = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("perm_")) continue;
    const moduleId = k.slice("perm_".length);
    if (!enabledModuleIds.has(moduleId)) continue;
    const level = String(v || "");
    if (!level || level === "NOT_REQUIRED") continue; // inherit / no additional access
    if (!["VIEW", "EDIT", "APPROVE", "ADMIN"].includes(level)) continue;
    permEntries.push({ moduleId, level: level as PermissionLevel });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      schoolId: session.schoolId,
      schoolRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash
    }
  });

  if (role.key === "CLASS_TEACHER") {
    await db.teacherClassAssignment.create({
      data: {
        schoolId: session.schoolId,
        userId: user.id,
        classId: teacherClassIds[0]!,
        isClassTeacher: true
      }
    });
  } else if (role.key === "TEACHER") {
    if (teacherClassIds.length > 0) {
      await db.teacherClassAssignment.createMany({
        data: teacherClassIds.map((classId) => ({
          schoolId: session.schoolId,
          userId: user.id,
          classId,
          isClassTeacher: false
        }))
      });
    }
  }

  if (isTeacherRole && teacherScheduleParsed.rows.length > 0 && teacherScheduleYearId) {
    await db.teacherTimetableEntry.createMany({
      data: teacherScheduleParsed.rows.map((row) => ({
        schoolId: session.schoolId,
        academicYearId: teacherScheduleYearId!,
        teacherUserId: user.id,
        classId: row.classId,
        subjectName: row.subjectName,
        weekday: row.weekday,
        startTime: row.startTime,
        endTime: row.endTime,
        room: row.room,
        createdByUserId: session.userId
      }))
    });
  }

  if (role.key === "PARENT" && parsed.data.linkStudentId) {
    await db.studentParent.create({
      data: {
        schoolId: session.schoolId,
        studentId: parsed.data.linkStudentId,
        userId: user.id,
        relation: parsed.data.parentRelation
      }
    });
  }

  const finalPerms =
    role.key === "BUS_ASSISTANT"
      ? transportModuleId
        ? [{ moduleId: transportModuleId, level: "EDIT" as PermissionLevel }]
        : []
      : permEntries;

  if (finalPerms.length) {
    await db.userModulePermission.createMany({
      data: finalPerms.map((p) => ({
        schoolId: session.schoolId,
        userId: user.id,
        moduleId: p.moduleId,
        level: p.level
      }))
    });
  }

  redirect("/admin/users");
}

const UpdateUserSchema = z.object({
  userId: z.string().min(1),
  schoolRoleId: z.string().min(1)
});

export async function updateUserRoleAction(formData: FormData) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const parsed = UpdateUserSchema.safeParse({
    userId: formData.get("userId"),
    schoolRoleId: formData.get("schoolRoleId")
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  if (parsed.data.userId === session.userId) throw new Error("You cannot change your own role.");

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    include: { schoolRole: true }
  });
  if (!target) throw new Error("Unable to process request.");

  const role = await db.schoolRole.findFirst({
    where: { id: parsed.data.schoolRoleId, schoolId: session.schoolId }
  });
  if (!role) throw new Error("Unable to process request.");

  // Prevent locking the school out by removing the last active Admin.
  if (target.schoolRole.key === "ADMIN" && role.key !== "ADMIN" && target.isActive) {
    const activeAdmins = await db.user.count({
      where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
    });
    if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { schoolRoleId: role.id }
  });

  redirect("/admin/users");
}

const ToggleSchema = z.object({
  userId: z.string().min(1),
  active: z.enum(["1", "0"])
});

export async function setUserActiveAction(formData: FormData) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const parsed = ToggleSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active")
  });
  if (!parsed.success) throw new Error("Unable to process request.");
  if (parsed.data.userId === session.userId) throw new Error("You cannot deactivate your own account.");

  const isActive = parsed.data.active === "1";
  if (!isActive) {
    const target = await db.user.findFirst({
      where: { id: parsed.data.userId, schoolId: session.schoolId },
      include: { schoolRole: true }
    });
    if (!target) throw new Error("Unable to process request.");
    if (target.schoolRole.key === "ADMIN" && target.isActive) {
      const activeAdmins = await db.user.count({
        where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
      });
      if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
    }
  }

  await db.user.updateMany({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    data: { isActive, deactivatedAt: isActive ? null : new Date() }
  });

  redirect("/admin/users");
}

const DeleteSchema = z.object({
  userId: z.string().min(1)
});

export async function deleteUserAction(formData: FormData) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const parsed = DeleteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) throw new Error("Unable to process request.");
  if (parsed.data.userId === session.userId) throw new Error("You cannot delete your own account.");

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    include: { schoolRole: true }
  });
  if (!target) redirect("/admin/users");
  if (target.schoolRole.key === "ADMIN" && target.isActive) {
    const activeAdmins = await db.user.count({
      where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
    });
    if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
  }

  await db.user.deleteMany({
    where: { id: parsed.data.userId, schoolId: session.schoolId }
  });

  redirect("/admin/users");
}

const SendResetSchema = z.object({
  userId: z.string().min(1)
});

const AssignUserTaskSchema = z.object({
  userId: z.string().min(1),
  taskTitle: z.string().trim().min(2).max(120),
  taskDescription: z.string().trim().max(1000).optional(),
  dueDate: z.string().trim().optional(),
  modulePath: z.string().trim().max(120).optional()
});

export async function assignUserTaskAction(formData: FormData) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const parsed = AssignUserTaskSchema.safeParse({
    userId: formData.get("userId"),
    taskTitle: formData.get("taskTitle"),
    taskDescription: String(formData.get("taskDescription") ?? "").trim() || undefined,
    dueDate: String(formData.get("dueDate") ?? "").trim() || undefined,
    modulePath: String(formData.get("modulePath") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to assign task.");

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId, isActive: true },
    select: { id: true, name: true }
  });
  if (!target) throw new Error("Unable to assign task.");

  const dueText = parsed.data.dueDate ? `Due: ${parsed.data.dueDate}` : null;
  const pathText = parsed.data.modulePath ? `Open: ${parsed.data.modulePath}` : null;
  const descriptionText = parsed.data.taskDescription ? parsed.data.taskDescription : null;
  const body = [descriptionText, dueText, pathText].filter(Boolean).join(" · ");

  await db.notification.create({
    data: {
      schoolId: session.schoolId,
      userId: target.id,
      title: `Task assigned: ${parsed.data.taskTitle}`,
      body: body || null
    }
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "SCHOOL_USER_TASK_ASSIGNED",
    entityType: "User",
    entityId: target.id,
    schoolId: session.schoolId,
    metadata: {
      taskTitle: parsed.data.taskTitle,
      dueDate: parsed.data.dueDate ?? null,
      modulePath: parsed.data.modulePath ?? null
    }
  });

  redirect(`/admin/users?task=assigned#user-${target.id}`);
}

export async function sendUserPasswordResetAction(formData: FormData) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const parsed = SendResetSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) throw new Error("Unable to process request.");

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    select: { id: true, name: true, email: true, isActive: true }
  });
  if (!target) throw new Error("Unable to process request.");
  if (!target.isActive) throw new Error("Cannot send reset link to inactive user.");

  const tokenRow = await createPasswordResetToken({
    subjectType: "SCHOOL_USER",
    userId: target.id,
    schoolId: session.schoolId,
    email: target.email
  });
  const sent = await sendPasswordResetEmail({
    subjectType: "SCHOOL_USER",
    toEmail: target.email,
    recipientName: target.name,
    resetToken: tokenRow.token,
    expiresAt: tokenRow.expiresAt
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "SCHOOL_USER_PASSWORD_RESET_EMAIL_SENT",
    entityType: "User",
    entityId: target.id,
    schoolId: session.schoolId,
    metadata: { emailSent: sent.sent, expiresAt: tokenRow.expiresAt.toISOString() }
  });

  redirect(`/admin/users?reset=${sent.sent ? "sent" : "failed"}`);
}

const UpdateUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters.")
});

export async function updateUserPasswordAction(
  _prev: UpdateUserPasswordState,
  formData: FormData
): Promise<UpdateUserPasswordState> {
  const { session } = await requirePermission("USERS", "ADMIN");
  if (session.roleKey !== "ADMIN") {
    return { ok: false, message: "Only school admin can update user passwords." };
  }

  const parsed = UpdateUserPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    select: { id: true, schoolRole: { select: { key: true, name: true } } }
  });
  if (!target) return { ok: false, message: "User not found in this school." };

  if (!isSchoolAdminPasswordAllowedRole(target.schoolRole.key)) {
    return { ok: false, message: "School admin can update passwords only for teacher, parent, and student users." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  const [, revokedTokens] = await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: { passwordHash }
    }),
    db.passwordResetToken.updateMany({
      where: { userId: target.id, subjectType: "SCHOOL_USER", usedAt: null },
      data: { usedAt: now }
    })
  ]);

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "SCHOOL_USER_PASSWORD_UPDATED_BY_ADMIN",
    entityType: "User",
    entityId: target.id,
    schoolId: session.schoolId,
    metadata: { roleKey: target.schoolRole.key, roleName: target.schoolRole.name, revokedResetTokens: revokedTokens.count }
  });

  revalidatePath("/admin/users");
  return { ok: true, message: "Password updated successfully." };
}
