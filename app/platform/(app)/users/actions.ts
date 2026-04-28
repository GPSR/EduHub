"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { hashPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";

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
  const exists = await db.platformUser.findUnique({ where: { email } });
  if (exists) return { ok: false, message: "Platform user email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await db.platformUser.create({
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

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot approve via this flow." };

  const schoolIds = formData
    .getAll("schoolIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (schoolIds.length === 0) return { ok: false, message: "Assign at least one school." };

  await db.$transaction(async (tx) => {
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

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot reject super admin." };

  await db.$transaction([
    db.platformUser.update({
      where: { id: target.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        approvedByPlatformUserId: superAdmin.id
      }
    }),
    db.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } })
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

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot edit super admin." };

  const email = parsed.data.email.toLowerCase();
  const existing = await db.platformUser.findFirst({
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

  await db.$transaction(async (tx) => {
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

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot deactivate super admin." };

  const updated = await db.platformUser.update({
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

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot delete super admin." };

  await db.$transaction([
    db.platformUserSchoolAssignment.deleteMany({ where: { platformUserId: target.id } }),
    db.platformUser.delete({ where: { id: target.id } })
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

const ResetPasswordSchema = z.object({ platformUserId: z.string().min(1) });

export async function resetPlatformUserPasswordAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = ResetPasswordSchema.safeParse({
    platformUserId: formData.get("platformUserId")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };

  const target = await db.platformUser.findUnique({ where: { id: parsed.data.platformUserId } });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot reset super admin password in this flow." };
  const tokenRow = await createPasswordResetToken({
    subjectType: "PLATFORM_USER",
    platformUserId: target.id,
    email: target.email
  });
  const sent = await sendPasswordResetEmail({
    subjectType: "PLATFORM_USER",
    toEmail: target.email,
    recipientName: target.name,
    resetToken: tokenRow.token,
    expiresAt: tokenRow.expiresAt
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_PASSWORD_RESET_EMAIL_SENT",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { emailSent: sent.sent, expiresAt: tokenRow.expiresAt.toISOString() }
  });

  revalidatePath("/platform/users");
  return { ok: sent.sent, message: sent.sent ? "Password reset email sent (valid for 30 minutes)." : "Email provider is not configured." };
}

const UpdatePasswordSchema = z.object({
  platformUserId: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters."),
  confirmPassword: z.string().min(10, "Password must be at least 10 characters.")
});

export async function updatePlatformUserPasswordAction(
  _prev: PlatformUserAdminState,
  formData: FormData
): Promise<PlatformUserAdminState> {
  const { user: superAdmin } = await requireSuperAdmin();
  const parsed = UpdatePasswordSchema.safeParse({
    platformUserId: formData.get("platformUserId"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const target = await db.platformUser.findUnique({
    where: { id: parsed.data.platformUserId },
    select: { id: true, role: true }
  });
  if (!target) return { ok: false, message: "Platform user not found." };
  if (target.role === "SUPER_ADMIN") return { ok: false, message: "Cannot update super admin password in this flow." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  const [, revokedTokens] = await db.$transaction([
    db.platformUser.update({
      where: { id: target.id },
      data: { passwordHash }
    }),
    db.passwordResetToken.updateMany({
      where: { platformUserId: target.id, subjectType: "PLATFORM_USER", usedAt: null },
      data: { usedAt: now }
    })
  ]);

  await auditLog({
    actor: { type: "PLATFORM_USER", id: superAdmin.id },
    action: "PLATFORM_USER_PASSWORD_UPDATED_BY_SUPER_ADMIN",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { revokedResetTokens: revokedTokens.count }
  });

  revalidatePath("/platform/users");
  return { ok: true, message: "Password updated successfully." };
}
