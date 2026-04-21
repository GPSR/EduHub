"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PermissionLevel } from "@prisma/client";

export type CreateUserState = { ok: boolean; message?: string };

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  schoolRoleId: z.string().min(1),
  password: z.string().min(8),
  linkStudentId: z.string().optional(),
  parentRelation: z.string().optional(),
  classIds: z.array(z.string()).optional()
});

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

  const role = await prisma.schoolRole.findFirst({
    where: { id: parsed.data.schoolRoleId, schoolId: session.schoolId }
  });
  if (!role) return { ok: false, message: "Invalid role." };

  const classIds = Array.from(new Set(parsed.data.classIds ?? []));
  if (role.key === "CLASS_TEACHER" && classIds.length !== 1) {
    return { ok: false, message: "Class Teacher must be mapped to exactly one class." };
  }

  const enabledModuleRows = await prisma.schoolModule.findMany({
    where: { schoolId: session.schoolId, enabled: true },
    select: { moduleId: true }
  });
  const enabledModuleIds = new Set(enabledModuleRows.map((m) => m.moduleId));
  const permEntries: Array<{ moduleId: string; level: PermissionLevel }> = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("perm_")) continue;
    const moduleId = k.slice("perm_".length);
    if (!enabledModuleIds.has(moduleId)) continue;
    const level = String(v || "");
    if (!level) continue; // inherit
    if (!["VIEW", "EDIT", "APPROVE", "ADMIN"].includes(level)) continue;
    permEntries.push({ moduleId, level: level as PermissionLevel });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      schoolId: session.schoolId,
      schoolRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash
    }
  });

  if (role.key === "CLASS_TEACHER") {
    await prisma.teacherClassAssignment.create({
      data: {
        schoolId: session.schoolId,
        userId: user.id,
        classId: classIds[0]!,
        isClassTeacher: true
      }
    });
  } else if (role.key === "TEACHER") {
    if (classIds.length > 0) {
      await prisma.teacherClassAssignment.createMany({
        data: classIds.map((classId) => ({
          schoolId: session.schoolId,
          userId: user.id,
          classId,
          isClassTeacher: false
        }))
      });
    }
  }

  if (role.key === "PARENT" && parsed.data.linkStudentId) {
    await prisma.studentParent.create({
      data: {
        schoolId: session.schoolId,
        studentId: parsed.data.linkStudentId,
        userId: user.id,
        relation: parsed.data.parentRelation
      }
    });
  }

  if (permEntries.length) {
    await prisma.userModulePermission.createMany({
      data: permEntries.map((p) => ({
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

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    include: { schoolRole: true }
  });
  if (!target) throw new Error("Unable to process request.");

  const role = await prisma.schoolRole.findFirst({
    where: { id: parsed.data.schoolRoleId, schoolId: session.schoolId }
  });
  if (!role) throw new Error("Unable to process request.");

  // Prevent locking the school out by removing the last active Admin.
  if (target.schoolRole.key === "ADMIN" && role.key !== "ADMIN" && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
    });
    if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
  }

  await prisma.user.update({
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
    const target = await prisma.user.findFirst({
      where: { id: parsed.data.userId, schoolId: session.schoolId },
      include: { schoolRole: true }
    });
    if (!target) throw new Error("Unable to process request.");
    if (target.schoolRole.key === "ADMIN" && target.isActive) {
      const activeAdmins = await prisma.user.count({
        where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
      });
      if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
    }
  }

  await prisma.user.updateMany({
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

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, schoolId: session.schoolId },
    include: { schoolRole: true }
  });
  if (!target) redirect("/admin/users");
  if (target.schoolRole.key === "ADMIN" && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { schoolId: session.schoolId, isActive: true, schoolRole: { key: "ADMIN" } }
    });
    if (activeAdmins <= 1) throw new Error("You must keep at least one active Admin user.");
  }

  await prisma.user.deleteMany({
    where: { id: parsed.data.userId, schoolId: session.schoolId }
  });

  redirect("/admin/users");
}
