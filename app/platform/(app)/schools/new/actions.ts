"use server";

import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/token";
import { requireSuperAdmin } from "@/lib/platform-require";
import { auditLog } from "@/lib/audit";
import { sendOnboardingApprovalNotifications } from "@/lib/approval-notify";
import { ensureSubscriptionPlanSettings, getPlanAmountCents, getPlanEndsAt } from "@/lib/subscription";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateSchoolState = { ok: boolean; message?: string };

const Schema = z.object({
  schoolName: z.string().min(2, "School name is required."),
  schoolSlug: z
    .string()
    .min(2, "School slug is required.")
    .max(64)
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only."),
  adminEmail: z.string().email("Admin email is invalid."),
  plan: z.enum(["PREMIUM", "DEFAULT", "UNLIMITED", "BETA"]).default("PREMIUM")
});

export async function createSchoolInviteAction(
  _prev: CreateSchoolState,
  formData: FormData
): Promise<CreateSchoolState> {
  const { session } = await requireSuperAdmin();

  const parsed = Schema.safeParse({
    schoolName: formData.get("schoolName"),
    schoolSlug: formData.get("schoolSlug"),
    adminEmail: formData.get("adminEmail"),
    plan: formData.get("plan")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const slug = parsed.data.schoolSlug.toLowerCase();
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) return { ok: false, message: "That school slug is already taken." };
  await ensureSubscriptionPlanSettings();

  try {
    const token = randomToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const endsAt = await getPlanEndsAt(parsed.data.plan);
    const amountCents = await getPlanAmountCents(parsed.data.plan);
    const school = await prisma.school.create({
      data: {
        name: parsed.data.schoolName,
        slug,
        subscription: {
          create: {
            plan: parsed.data.plan,
            status: "ACTIVE",
            endsAt,
            amountCents
          }
        },
        roles: {
          create: [{ key: "ADMIN", name: "Admin", isSystem: true }]
        }
      }
    });

    const adminRole = await prisma.schoolRole.findFirst({ where: { schoolId: school.id, key: "ADMIN" } });
    if (!adminRole) return { ok: false, message: "Failed to create Admin role." };

    await prisma.schoolInvite.create({
      data: {
        schoolId: school.id,
        email: parsed.data.adminEmail.toLowerCase(),
        schoolRoleId: adminRole.id,
        token,
        expiresAt
      }
    });

    const schoolAppBaseUrl =
      process.env.SCHOOL_APP_BASE_URL?.replace(/\/+$/, "") ||
      process.env.NEXT_PUBLIC_SCHOOL_APP_BASE_URL?.replace(/\/+$/, "") ||
      "https://schools.softlanetech.com";
    const inviteUrl = `${schoolAppBaseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
    await sendOnboardingApprovalNotifications({
      schoolName: school.name,
      adminEmail: parsed.data.adminEmail.toLowerCase(),
      inviteUrl
    });

    await auditLog({
      actor: { type: "PLATFORM_USER", id: session.platformUserId },
      action: "PLATFORM_SCHOOL_CREATED",
      entityType: "School",
      entityId: school.id,
      schoolId: school.id,
      metadata: { slug: school.slug, plan: parsed.data.plan, invitedAdminEmail: parsed.data.adminEmail }
    });

    redirect(`/platform/schools/${school.id}`);
  } catch {
    return { ok: false, message: "Could not create school. Please try again." };
  }
}
