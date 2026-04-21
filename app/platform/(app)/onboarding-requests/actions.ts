"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { randomToken } from "@/lib/token";
import { ensureSubscriptionPlanSettings, getPlanAmountCents, getPlanEndsAt } from "@/lib/subscription";
import { ensureBaseModules, seedSchoolModulesAndRolePerms } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type OnboardingApprovalState = { ok: boolean; message?: string };

const ApproveSchema = z.object({
  requestId: z.string().min(1),
  plan: z.enum(["PREMIUM", "DEFAULT", "UNLIMITED", "BETA"])
});

export async function approveOnboardingRequestAction(
  _prev: OnboardingApprovalState,
  formData: FormData
): Promise<OnboardingApprovalState> {
  const { session } = await requireSuperAdmin();
  const parsed = ApproveSchema.safeParse({
    requestId: formData.get("requestId"),
    plan: formData.get("plan")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const request = await prisma.schoolOnboardingRequest.findUnique({
    where: { id: parsed.data.requestId }
  });
  if (!request || request.status !== "PENDING") return { ok: false, message: "Request not found or already processed." };
  await ensureBaseModules();

  const existingSchool = await prisma.school.findUnique({ where: { slug: request.schoolSlug } });
  if (existingSchool) return { ok: false, message: "School slug already exists." };

  const selectedModuleIds = formData
    .getAll("enabledModuleIds")
    .map((v) => String(v))
    .filter(Boolean);
  const selectedSet = new Set(selectedModuleIds);

  await ensureSubscriptionPlanSettings();
  const endsAt = await getPlanEndsAt(parsed.data.plan);
  const amountCents = await getPlanAmountCents(parsed.data.plan);

  const school = await prisma.$transaction(async (tx) => {
    const createdSchool = await tx.school.create({
      data: {
        name: request.schoolName,
        slug: request.schoolSlug,
        subscription: {
          create: {
            plan: parsed.data.plan,
            status: "ACTIVE",
            startedAt: new Date(),
            endsAt,
            amountCents
          }
        },
        roles: {
          create: [{ key: "ADMIN", name: "Admin", isSystem: true }]
        }
      }
    });

    return createdSchool;
  });

  await seedSchoolModulesAndRolePerms(school.id);

  const modules = await prisma.module.findMany({ select: { id: true } });
  await prisma.$transaction(async (tx) => {
    for (const m of modules) {
      await tx.schoolModule.upsert({
        where: { schoolId_moduleId: { schoolId: school.id, moduleId: m.id } },
        update: { enabled: selectedSet.has(m.id) },
        create: { schoolId: school.id, moduleId: m.id, enabled: selectedSet.has(m.id) }
      });
    }
  });

  const adminRole = await prisma.schoolRole.findFirst({ where: { schoolId: school.id, key: "ADMIN" } });
  if (!adminRole) return { ok: false, message: "Admin role was not created." };

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.schoolInvite.create({
    data: {
      schoolId: school.id,
      email: request.adminEmail.toLowerCase(),
      schoolRoleId: adminRole.id,
      token,
      expiresAt
    }
  });

  await prisma.schoolOnboardingRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      schoolId: school.id,
      approvedByPlatformUserId: session.platformUserId,
      approvedAt: new Date()
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_ONBOARDING_REQUEST_APPROVED",
    entityType: "SchoolOnboardingRequest",
    entityId: request.id,
    schoolId: school.id,
    metadata: { plan: parsed.data.plan, schoolSlug: request.schoolSlug, selectedModules: selectedModuleIds }
  });

  revalidatePath("/platform/onboarding-requests");
  revalidatePath("/platform");
  return { ok: true, message: "Approved. School created and admin invite generated." };
}

const RejectSchema = z.object({
  requestId: z.string().min(1),
  note: z.string().trim().max(500).optional()
});

export async function rejectOnboardingRequestAction(
  _prev: OnboardingApprovalState,
  formData: FormData
): Promise<OnboardingApprovalState> {
  const { session } = await requireSuperAdmin();
  const parsed = RejectSchema.safeParse({
    requestId: formData.get("requestId"),
    note: formData.get("note")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const request = await prisma.schoolOnboardingRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.status !== "PENDING") return { ok: false, message: "Request not found or already processed." };

  await prisma.schoolOnboardingRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", note: parsed.data.note || null, rejectedAt: new Date(), approvedByPlatformUserId: session.platformUserId }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_ONBOARDING_REQUEST_REJECTED",
    entityType: "SchoolOnboardingRequest",
    entityId: request.id,
    metadata: { note: parsed.data.note ?? "" }
  });

  revalidatePath("/platform/onboarding-requests");
  return { ok: true, message: "Request rejected." };
}
