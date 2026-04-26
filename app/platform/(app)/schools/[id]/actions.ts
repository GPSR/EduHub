"use server";

import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/token";
import { requireSuperAdmin } from "@/lib/platform-require";
import { createSessionCookie } from "@/lib/session";
import { ensureBaseModules } from "@/lib/permissions";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { hashPassword } from "@/lib/password";
import { auditLog } from "@/lib/audit";
import { sendOnboardingApprovalNotifications } from "@/lib/approval-notify";
import { resolveSchoolAppBaseUrl } from "@/lib/app-env";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type InviteState = {
  ok: boolean;
  message?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  smsSent?: boolean;
  errors?: string[];
};
export type PlatformSchoolModulesState = { ok: boolean; message?: string };
export type UpdateSchoolAdminPasswordState = { ok: boolean; message?: string };

const InviteSchema = z.object({
  schoolId: z.string().min(1),
  adminEmail: z.string().email("Email is invalid.")
});

export async function createAdminInviteAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const { session } = await requireSuperAdmin();

  const parsed = InviteSchema.safeParse({
    schoolId: formData.get("schoolId"),
    adminEmail: formData.get("adminEmail")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const adminRole = await prisma.schoolRole.findFirst({ where: { schoolId: parsed.data.schoolId, key: "ADMIN" } });
  if (!adminRole) return { ok: false, message: "School is missing Admin role." };

  await prisma.schoolInvite.create({
    data: {
      schoolId: parsed.data.schoolId,
      email: parsed.data.adminEmail.toLowerCase(),
      schoolRoleId: adminRole.id,
      token,
      expiresAt
    }
  });

  const school = await prisma.school.findUnique({
    where: { id: parsed.data.schoolId },
    select: { name: true }
  });
  const schoolAppBaseUrl = resolveSchoolAppBaseUrl();
  const inviteUrl = `${schoolAppBaseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
  const notify = await sendOnboardingApprovalNotifications({
    schoolName: school?.name ?? "School",
    adminEmail: parsed.data.adminEmail.toLowerCase(),
    inviteUrl,
    expiresAt
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_SCHOOL_INVITE_GENERATED",
    entityType: "School",
    entityId: parsed.data.schoolId,
    schoolId: parsed.data.schoolId,
    metadata: {
      adminEmail: parsed.data.adminEmail.toLowerCase(),
      emailSent: notify.emailSent,
      smsSent: notify.smsSent,
      errors: notify.errors.slice(0, 3)
    }
  });

  revalidatePath(`/platform/schools/${parsed.data.schoolId}`);

  const emailErrors = notify.errors.filter((entry) => entry.startsWith("email:"));
  const smsErrors = notify.errors.filter((entry) => entry.startsWith("sms:"));
  const compactErrors = [...emailErrors, ...smsErrors].slice(0, 3);
  const emailIssue = emailErrors[0]?.replace(/^email:/, "").replaceAll("_", " ");
  const smsIssue = smsErrors[0]?.replace(/^sms:/, "").replaceAll("_", " ");

  return {
    ok: true,
    inviteUrl,
    emailSent: notify.emailSent,
    smsSent: notify.smsSent,
    errors: compactErrors,
    message: [
      notify.emailSent
        ? "Invitation email sent."
        : `Invite link created, but email was not sent${emailIssue ? ` (${emailIssue})` : ""}.`,
      notify.smsSent ? "SMS sent." : `SMS not sent${smsIssue ? ` (${smsIssue})` : ""}.`,
      "You can copy and share the invite link below."
    ].join(" ")
  };
}

export async function impersonateSchoolAction(formData: FormData) {
  const { session } = await requireSuperAdmin();

  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) throw new Error("Unable to process request.");

  const admin = await prisma.user.findFirst({
    where: { schoolId, schoolRole: { key: "ADMIN" } },
    orderBy: { createdAt: "asc" },
    include: { schoolRole: true }
  });
  if (!admin) throw new Error("Unable to process request.");
  const sub = await ensureSchoolSubscriptionActive(admin.schoolId);
  if (!sub.ok) throw new Error(sub.reason);

  await createSessionCookie({ userId: admin.id, schoolId: admin.schoolId, roleId: admin.schoolRoleId, roleKey: admin.schoolRole.key });
  redirect("/dashboard");
}

export async function impersonateUserAction(formData: FormData) {
  const { session } = await requireSuperAdmin();

  const schoolId = String(formData.get("schoolId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!schoolId || !userId) throw new Error("Unable to process request.");

  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
    include: { schoolRole: true }
  });
  if (!user) throw new Error("Unable to process request.");
  const sub = await ensureSchoolSubscriptionActive(user.schoolId);
  if (!sub.ok) throw new Error(sub.reason);

  await createSessionCookie({ userId: user.id, schoolId: user.schoolId, roleId: user.schoolRoleId, roleKey: user.schoolRole.key });
  redirect("/dashboard");
}

export async function updatePlatformSchoolModulesAction(
  _prev: PlatformSchoolModulesState,
  formData: FormData
): Promise<PlatformSchoolModulesState> {
  await requireSuperAdmin();

  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) throw new Error("Unable to process request.");

  await ensureBaseModules();

  const allModules = await prisma.module.findMany({ select: { id: true } });
  const enabled = new Set(
    formData
      .getAll("enabledModuleIds")
      .map((v) => String(v))
      .filter(Boolean)
  );

  const current = await prisma.schoolModule.findMany({
    where: { schoolId },
    select: { moduleId: true, enabled: true }
  });
  const currentByModuleId = new Map(current.map((m) => [m.moduleId, m.enabled]));
  const changed = allModules.some((m) => (currentByModuleId.get(m.id) ?? false) !== enabled.has(m.id));
  if (!changed) return { ok: false, message: "No changes to save." };

  await prisma.$transaction(async (tx) => {
    for (const m of allModules) {
      await tx.schoolModule.upsert({
        where: { schoolId_moduleId: { schoolId, moduleId: m.id } },
        update: { enabled: enabled.has(m.id) },
        create: { schoolId, moduleId: m.id, enabled: enabled.has(m.id) }
      });
    }
  });

  revalidatePath(`/platform/schools/${schoolId}`);
  return { ok: true, message: "Saved." };
}

const UpdateSchoolAdminPasswordSchema = z.object({
  schoolId: z.string().min(1),
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters.")
});

export async function updateSchoolAdminPasswordAction(
  _prev: UpdateSchoolAdminPasswordState,
  formData: FormData
): Promise<UpdateSchoolAdminPasswordState> {
  const { session } = await requireSuperAdmin();
  const parsed = UpdateSchoolAdminPasswordSchema.safeParse({
    schoolId: formData.get("schoolId"),
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, schoolId: parsed.data.schoolId },
    select: { id: true, schoolId: true, schoolRole: { select: { key: true } } }
  });
  if (!target) return { ok: false, message: "School admin user not found." };
  if (target.schoolRole.key !== "ADMIN") {
    return { ok: false, message: "Only school admin users can be updated in this flow." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  const [, revokedTokens] = await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: target.id, subjectType: "SCHOOL_USER", usedAt: null },
      data: { usedAt: now }
    })
  ]);

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "SCHOOL_ADMIN_PASSWORD_UPDATED_BY_SUPER_ADMIN",
    entityType: "User",
    entityId: target.id,
    schoolId: target.schoolId,
    metadata: { revokedResetTokens: revokedTokens.count }
  });

  revalidatePath(`/platform/schools/${parsed.data.schoolId}`);
  return { ok: true, message: "School admin password updated successfully." };
}
