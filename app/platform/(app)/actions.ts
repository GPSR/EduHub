"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { auditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureSubscriptionPlanSettings, getPlanAmountCents, getPlanEndsAt } from "@/lib/subscription";

export type PlatformActionState = { ok: boolean; message?: string };

const ToggleSchema = z.object({
  schoolId: z.string().min(1)
});

export async function toggleSchoolActiveAction(
  _prev: PlatformActionState,
  formData: FormData
): Promise<PlatformActionState> {
  const { session } = await requireSuperAdmin();
  const parsed = ToggleSchema.safeParse({ schoolId: formData.get("schoolId") });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const school = await db.school.findUnique({ where: { id: parsed.data.schoolId } });
  if (!school) return { ok: false, message: "School not found." };

  const updated = await db.school.update({
    where: { id: school.id },
    data: { isActive: !school.isActive }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: updated.isActive ? "PLATFORM_SCHOOL_ACTIVATED" : "PLATFORM_SCHOOL_DEACTIVATED",
    entityType: "School",
    entityId: updated.id,
    schoolId: updated.id
  });

  redirect("/platform");
}

const ChangePlanSchema = z.object({
  schoolId: z.string().min(1),
  plan: z.string().min(1)
});

export async function changeSchoolPlanAction(
  _prev: PlatformActionState,
  formData: FormData
): Promise<PlatformActionState> {
  const { session } = await requireSuperAdmin();
  const parsed = ChangePlanSchema.safeParse({
    schoolId: formData.get("schoolId"),
    plan: formData.get("plan")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  await ensureSubscriptionPlanSettings();

  const sub = await db.subscription.findUnique({ where: { schoolId: parsed.data.schoolId } });
  if (!sub) return { ok: false, message: "Subscription not found." };
  let planSetting: { durationDays: number | null } | null = null;
  let planValue: "PREMIUM" | "DEFAULT" | "UNLIMITED" | "BETA" | "CUSTOM";
  let customPlanId: string | null = null;
  let customPlanCode: string | null = null;
  let endsAt: Date | null = null;
  let amountCents = 0;

  if (parsed.data.plan.startsWith("CUSTOM:")) {
    const id = parsed.data.plan.slice("CUSTOM:".length);
    const custom = await db.customSubscriptionPlan.findFirst({
      where: { id, isActive: true },
      select: { id: true, code: true, durationDays: true }
    });
    if (!custom) return { ok: false, message: "Custom plan not found." };
    planValue = "CUSTOM";
    customPlanId = custom.id;
    customPlanCode = custom.code;
    endsAt = custom.durationDays == null ? null : new Date(Date.now() + custom.durationDays * 24 * 60 * 60 * 1000);
    amountCents = custom.durationDays == null ? 0 : 0;
    const customAmount = await db.customSubscriptionPlan.findUnique({
      where: { id: custom.id },
      select: { amountCents: true }
    });
    amountCents = customAmount?.amountCents ?? 0;
  } else {
    if (!["PREMIUM", "DEFAULT", "UNLIMITED", "BETA"].includes(parsed.data.plan)) {
      return { ok: false, message: "Invalid plan." };
    }
    planValue = parsed.data.plan as "PREMIUM" | "DEFAULT" | "UNLIMITED" | "BETA";
    planSetting = await db.subscriptionPlanSetting.findUnique({ where: { plan: planValue } });
    endsAt = await getPlanEndsAt(planValue);
    amountCents = await getPlanAmountCents(planValue);
  }

  const updated = await db.subscription.update({
    where: { id: sub.id },
    data: {
      plan: planValue,
      customPlanId,
      amountCents,
      status: "ACTIVE",
      endsAt
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_PLAN_CHANGED",
    entityType: "Subscription",
    entityId: updated.id,
    schoolId: updated.schoolId,
    metadata: {
      plan: planValue,
      customPlanCode,
      durationDays: planSetting?.durationDays ?? null,
      amountCents
    }
  });

  redirect("/platform");
}

const ExtendTrialSchema = z.object({
  schoolId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(365).default(7)
});

export async function extendTrialAction(
  _prev: PlatformActionState,
  formData: FormData
): Promise<PlatformActionState> {
  const { session } = await requireSuperAdmin();
  const parsed = ExtendTrialSchema.safeParse({
    schoolId: formData.get("schoolId"),
    days: formData.get("days")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  // Trial no longer exists; keep endpoint but respond safely.
  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_TRIAL_EXTEND_ATTEMPT",
    entityType: "Subscription",
    entityId: parsed.data.schoolId,
    schoolId: parsed.data.schoolId,
    metadata: { days: parsed.data.days }
  });

  redirect("/platform");
}
