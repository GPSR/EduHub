import { db } from "@/lib/db";
import type { Plan } from "@/lib/db-types";

export type SubscriptionAccessCheck = { ok: true } | { ok: false; reason: string };

export async function ensureSchoolSubscriptionActive(schoolId: string): Promise<SubscriptionAccessCheck> {
  const subscription = await db.subscription.findUnique({
    where: { schoolId },
    select: { id: true, plan: true, status: true, endsAt: true }
  });

  if (!subscription) return { ok: false, reason: "Subscription is not configured for this school." };

  const now = Date.now();
  const isExpired = subscription.endsAt ? subscription.endsAt.getTime() < now : false;

  if (isExpired) {
    if (subscription.status !== "EXPIRED") {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" }
      });
    }
    return { ok: false, reason: "School subscription has expired. Please contact Super Admin." };
  }

  if (subscription.status === "EXPIRED") {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE" }
    });
  }

  return { ok: true };
}

export async function ensureSubscriptionPlanSettings() {
  const defaults: Array<{ plan: Plan; durationDays: number | null; amountCents: number }> = [
    { plan: "PREMIUM", durationDays: 730, amountCents: 0 },
    { plan: "DEFAULT", durationDays: 365, amountCents: 0 },
    { plan: "UNLIMITED", durationDays: null, amountCents: 0 },
    { plan: "BETA", durationDays: 180, amountCents: 0 }
  ];

  await db.$transaction(
    defaults.map((item) =>
      db.subscriptionPlanSetting.upsert({
        where: { plan: item.plan },
        update: {},
        create: { plan: item.plan, durationDays: item.durationDays, amountCents: item.amountCents }
      })
    )
  );
}

export async function getPlanEndsAt(plan: Plan) {
  await ensureSubscriptionPlanSettings();
  const setting = await db.subscriptionPlanSetting.findUnique({
    where: { plan },
    select: { durationDays: true }
  });
  if (!setting || setting.durationDays == null) return null;
  return new Date(Date.now() + setting.durationDays * 24 * 60 * 60 * 1000);
}

export async function getPlanAmountCents(plan: Plan) {
  await ensureSubscriptionPlanSettings();
  const setting = await db.subscriptionPlanSetting.findUnique({
    where: { plan },
    select: { amountCents: true }
  });
  if (!setting) return 0;
  if (plan === "PREMIUM") return 0;
  return setting.amountCents ?? 0;
}
