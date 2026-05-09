import { randomUUID } from "node:crypto";
import { execute, queryFirst } from "@/lib/neon-db";
import type { Plan } from "@/lib/db-types";

export type SubscriptionAccessCheck = { ok: true } | { ok: false; reason: string };

function toDateOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

type SubscriptionRow = {
  id: string;
  plan: Plan;
  status: string;
  endsAt: Date | string | null;
};

export async function ensureSchoolSubscriptionActive(schoolId: string): Promise<SubscriptionAccessCheck> {
  const subscription = await queryFirst<SubscriptionRow>(
    `SELECT "id", "plan", "status", "endsAt"
     FROM "Subscription"
     WHERE "schoolId" = $1
     LIMIT 1`,
    [schoolId]
  );

  if (!subscription) return { ok: false, reason: "Subscription is not configured for this school." };

  const now = Date.now();
  const endsAt = toDateOrNull(subscription.endsAt);
  const isExpired = endsAt ? endsAt.getTime() < now : false;

  if (isExpired) {
    if (subscription.status !== "EXPIRED") {
      await execute(
        `UPDATE "Subscription"
         SET "status" = 'EXPIRED',
             "updatedAt" = NOW()
         WHERE "id" = $1`,
        [subscription.id]
      );
    }
    return { ok: false, reason: "School subscription has expired. Please contact Super Admin." };
  }

  if (subscription.status === "EXPIRED") {
    await execute(
      `UPDATE "Subscription"
       SET "status" = 'ACTIVE',
           "updatedAt" = NOW()
       WHERE "id" = $1`,
      [subscription.id]
    );
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

  await Promise.all(
    defaults.map((item) =>
      execute(
        `INSERT INTO "SubscriptionPlanSetting"
          ("id", "plan", "durationDays", "amountCents", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT ("plan") DO NOTHING`,
        [randomUUID(), item.plan, item.durationDays, item.amountCents]
      )
    )
  );
}

export async function getPlanEndsAt(plan: Plan) {
  await ensureSubscriptionPlanSettings();
  const setting = await queryFirst<{ durationDays: number | null }>(
    `SELECT "durationDays"
     FROM "SubscriptionPlanSetting"
     WHERE "plan" = $1
     LIMIT 1`,
    [plan]
  );
  if (!setting || setting.durationDays == null) return null;
  return new Date(Date.now() + setting.durationDays * 24 * 60 * 60 * 1000);
}

export async function getPlanAmountCents(plan: Plan) {
  await ensureSubscriptionPlanSettings();
  const setting = await queryFirst<{ amountCents: number | null }>(
    `SELECT "amountCents"
     FROM "SubscriptionPlanSetting"
     WHERE "plan" = $1
     LIMIT 1`,
    [plan]
  );
  if (!setting) return 0;
  if (plan === "PREMIUM") return 0;
  return setting.amountCents ?? 0;
}
