"use server";

import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/token";
import { requireSuperAdmin } from "@/lib/platform-require";
import { createSessionCookie } from "@/lib/session";
import { ensureBaseModules } from "@/lib/permissions";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type InviteState = { ok: boolean; message?: string };
export type PlatformSchoolModulesState = { ok: boolean; message?: string };

const InviteSchema = z.object({
  schoolId: z.string().min(1),
  adminEmail: z.string().email("Email is invalid.")
});

export async function createAdminInviteAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  await requireSuperAdmin();

  const parsed = InviteSchema.safeParse({
    schoolId: formData.get("schoolId"),
    adminEmail: formData.get("adminEmail")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

  redirect(`/platform/schools/${parsed.data.schoolId}`);
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
