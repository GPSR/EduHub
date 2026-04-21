"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { hashPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

export type PlatformUserAdminState = { ok: boolean; message?: string };

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(64),
  email: z.string().email(),
  password: z.string().min(10),
  role: z.enum(["SUPPORT_USER"])
});

export async function createPlatformUserAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.platformUser.findUnique({ where: { email } });
  if (exists) return { ok: false, message: "Platform user email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.platformUser.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      status: "PENDING"
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_CREATED_PENDING",
    entityType: "PlatformUser",
    entityId: created.id,
    metadata: { role: created.role, email: created.email }
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Platform user created as pending approval." };
}

const ApproveSchema = z.object({
  platformUserId: z.string().min(1)
});

export async function approvePlatformUserAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = ApproveSchema.safeParse({
    platformUserId: formData.get("platformUserId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot approve via this flow." };

  const schoolIds = formData
    .getAll("schoolIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (schoolIds.length === 0) return { ok: false, message: "Assign at least one school." };

  await prisma.$transaction(async (tx) => {
    await tx.platformUser.update({
      where: { id: target.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        rejectedAt: null,
        approvedByPlatformUserId: superAdmin.id
      }
    });
    await tx.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } });
    for (const schoolId of schoolIds) {
      await tx.platformUserSchoolAssignment.create({ data: { platformUserId: target.id, schoolId } });
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_APPROVED",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { schoolIds }
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Platform user approved and assigned schools." };
}

const RejectSchema = z.object({
  platformUserId: z.string().min(1)
});

export async function rejectPlatformUserAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = RejectSchema.safeParse({
    platformUserId: formData.get("platformUserId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot reject super admin." };

  await prisma.$transaction([
    prisma.platformUser.update({
      where: { id: target.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        approvedByPlatformUserId: superAdmin.id
      }
    }),
    prisma.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } })
  ]);

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_REJECTED",
    entityType: "PlatformUser",
    entityId: target.id
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Platform user rejected." };
}

const UpdateSchema = z.object({
  platformUserId: z.string().min(1),
  name: z.string().trim().min(2).max(64),
  email: z.string().email()
});

export async function updatePlatformUserAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = UpdateSchema.safeParse({
    platformUserId: formData.get("platformUserId"),
    name: formData.get("name"),
    email: formData.get("email")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot edit super admin." };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.platformUser.findFirst({
    where: { email, id: { not: target.id } },
    select: { id: true }
  });
  if (existing) return { ok: false, message: "Email already used by another platform user." };

  const schoolIds = formData
    .getAll("schoolIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (target.status === "APPROVED" && schoolIds.length === 0) {
    return { ok: false, message: "Assign at least one school for approved users." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.platformUser.update({
      where: { id: target.id },
      data: {
        name: parsed.data.name,
        email
      }
    });
    await tx.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } });
    for (const schoolId of schoolIds) {
      await tx.platformUserSchoolAssignment.create({ data: { platformUserId: target.id, schoolId } });
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_UPDATED",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { schoolIds, status: target.status }
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Platform user updated." };
}

const ToggleActiveSchema = z.object({
  platformUserId: z.string().min(1)
});

export async function togglePlatformUserActiveAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = ToggleActiveSchema.safeParse({
    platformUserId: formData.get("platformUserId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot deactivate super admin." };

  const updated = await prisma.platformUser.update({
    where: { id: target.id },
    data: { isActive: !target.isActive }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: updated.isActive ? "PLATFORM_USER_REACTIVATED" : "PLATFORM_USER_DEACTIVATED",
    entityType: "PlatformUser",
    entityId: updated.id
  });

  revalidatePath("/platform/users");
  return { ok: true, message: updated.isActive ? "Platform user activated." : "Platform user deactivated." };
}

const DeleteSchema = z.object({
  platformUserId: z.string().min(1)
});

export async function deletePlatformUserAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = DeleteSchema.safeParse({
    platformUserId: formData.get("platformUserId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot delete super admin." };

  await prisma.$transaction([
    prisma.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } }),
    prisma.platformUser.delete({ where: { id: target.id } })
  ]);

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_DELETED",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { email: target.email, name: target.name }
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Platform user deleted." };
}

const ResetPasswordSchema = z.object({
  platformUserId: z.string().min(1),
  newPassword: z.string().min(10),
  confirmPassword: z.string().min(10)
});

export async function resetPlatformUserPasswordAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = ResetPasswordSchema.safeParse({
    platformUserId: formData.get("platformUserId"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword)
    return { ok: false, message: "Passwords do not match." };

  const target = await prisma.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot reset super admin password in this flow." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.platformUser.update({
    where: { id: target.id },
    data: { passwordHash }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_PASSWORD_RESET",
    entityType: "PlatformUser",
    entityId: target.id
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Password reset successful." };
}
