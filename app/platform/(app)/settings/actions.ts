"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { ensureSubscriptionPlanSettings } from "@/lib/subscription";
import { applyIndustryModuleTemplates } from "@/lib/module-industry-templates";

export type CreateModuleState = { ok: boolean; message?: string };

const CreateModuleSchema = z.object({
  name: z.string().trim().min(2).max(64),
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Module key must be uppercase letters/numbers/underscore.")
});

export async function createModuleAction(_prev: CreateModuleState, formData: FormData): Promise<CreateModuleState> {
  const { session } = await requireSuperAdmin();

  const parsed = CreateModuleSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const exists = await db.module.findUnique({ where: { key: parsed.data.key } });
  if (exists) return { ok: false, message: "Module key already exists." };

  const created = await db.module.create({
    data: { name: parsed.data.name, key: parsed.data.key }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_MODULE_CREATED",
    entityType: "Module",
    entityId: created.id,
    metadata: { key: created.key, name: created.name }
  });

  revalidatePath("/platform/settings");
  return { ok: true, message: "Module created." };
}

export type SubscriptionSettingsState = { ok: boolean; message?: string };
export type CustomSubscriptionState = { ok: boolean; message?: string };
export type IndustryTemplatesState = { ok: boolean; message?: string };

const PlanSettingsSchema = z.object({
  premiumDays: z.coerce.number().int().min(1).max(3650),
  defaultDays: z.coerce.number().int().min(1).max(3650),
  defaultAmount: z.coerce.number().min(0).max(10_000_000),
  betaAmount: z.coerce.number().min(0).max(10_000_000),
  unlimitedAmount: z.coerce.number().min(0).max(10_000_000),
  unlimitedIsLifetime: z.string().optional()
});

export async function updateSubscriptionPlanSettingsAction(
  _prev: SubscriptionSettingsState,
  formData: FormData
): Promise<SubscriptionSettingsState> {
  const { session } = await requireSuperAdmin();
  await ensureSubscriptionPlanSettings();

  const parsed = PlanSettingsSchema.safeParse({
    premiumDays: formData.get("premiumDays"),
    defaultDays: formData.get("defaultDays"),
    defaultAmount: formData.get("defaultAmount"),
    betaAmount: formData.get("betaAmount"),
    unlimitedAmount: formData.get("unlimitedAmount"),
    unlimitedIsLifetime: formData.get("unlimitedIsLifetime")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.$transaction([
    db.subscriptionPlanSetting.upsert({
      where: { plan: "PREMIUM" },
      update: { durationDays: parsed.data.premiumDays, amountCents: 0 },
      create: { plan: "PREMIUM", durationDays: parsed.data.premiumDays, amountCents: 0 }
    }),
    db.subscriptionPlanSetting.upsert({
      where: { plan: "DEFAULT" },
      update: { durationDays: parsed.data.defaultDays, amountCents: Math.round(parsed.data.defaultAmount * 100) },
      create: { plan: "DEFAULT", durationDays: parsed.data.defaultDays, amountCents: Math.round(parsed.data.defaultAmount * 100) }
    }),
    db.subscriptionPlanSetting.upsert({
      where: { plan: "UNLIMITED" },
      update: { durationDays: null, amountCents: Math.round(parsed.data.unlimitedAmount * 100) },
      create: { plan: "UNLIMITED", durationDays: null, amountCents: Math.round(parsed.data.unlimitedAmount * 100) }
    }),
    db.subscriptionPlanSetting.upsert({
      where: { plan: "BETA" },
      update: { amountCents: Math.round(parsed.data.betaAmount * 100) },
      create: { plan: "BETA", durationDays: 180, amountCents: Math.round(parsed.data.betaAmount * 100) }
    })
  ]);

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_PLAN_SETTINGS_UPDATED",
    entityType: "SubscriptionPlanSetting",
    metadata: {
      PREMIUM: parsed.data.premiumDays,
      DEFAULT: parsed.data.defaultDays,
      PREMIUM_AMOUNT: 0,
      DEFAULT_AMOUNT: Math.round(parsed.data.defaultAmount * 100),
      BETA_AMOUNT: Math.round(parsed.data.betaAmount * 100),
      UNLIMITED: "LIFETIME",
      UNLIMITED_AMOUNT: Math.round(parsed.data.unlimitedAmount * 100)
    }
  });

  revalidatePath("/platform/settings");
  revalidatePath("/platform");
  return { ok: true, message: "Subscription settings saved." };
}

const CreateCustomSubscriptionSchema = z.object({
  name: z.string().trim().min(2).max(64),
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code must be uppercase letters/numbers/underscore."),
  mode: z.enum(["DAYS", "LIFETIME"]),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  amount: z.coerce.number().min(0).max(10_000_000)
});

export async function createCustomSubscriptionAction(
  _prev: CustomSubscriptionState,
  formData: FormData
): Promise<CustomSubscriptionState> {
  const { session } = await requireSuperAdmin();
  const parsed = CreateCustomSubscriptionSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    mode: formData.get("mode"),
    durationDays: formData.get("durationDays"),
    amount: formData.get("amount")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const exists = await db.customSubscriptionPlan.findUnique({
    where: { code: parsed.data.code }
  });
  if (exists) return { ok: false, message: "Custom subscription code already exists." };

  const durationDays = parsed.data.mode === "LIFETIME" ? null : parsed.data.durationDays ?? null;
  if (parsed.data.mode === "DAYS" && !durationDays) {
    return { ok: false, message: "Duration days is required for DAYS mode." };
  }

  const created = await db.customSubscriptionPlan.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      durationDays,
      amountCents: Math.round(parsed.data.amount * 100),
      isActive: true
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_CUSTOM_SUBSCRIPTION_CREATED",
    entityType: "CustomSubscriptionPlan",
    entityId: created.id,
    metadata: { code: created.code, name: created.name, durationDays: created.durationDays, amountCents: created.amountCents }
  });

  revalidatePath("/platform/settings");
  revalidatePath("/platform");
  revalidatePath("/platform/subscriptions");
  return { ok: true, message: "Custom subscription plan created." };
}

export async function applyIndustryTemplatesAction(
  _prev: IndustryTemplatesState,
  _formData: FormData
): Promise<IndustryTemplatesState> {
  const { session } = await requireSuperAdmin();
  const result = await applyIndustryModuleTemplates();

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_INDUSTRY_TEMPLATES_APPLIED",
    entityType: "Module",
    metadata: {
      appliedModules: result.appliedModules,
      createdFields: result.createdFields,
      reactivatedFields: result.reactivatedFields,
      skippedFields: result.skippedFields,
      modules: result.details.map((item) => ({
        moduleKey: item.moduleKey,
        createdFields: item.createdFields,
        reactivatedFields: item.reactivatedFields,
        skippedFields: item.skippedFields
      }))
    }
  });

  revalidatePath("/platform/settings");
  for (const moduleRow of result.details) {
    revalidatePath(`/platform/settings/modules/${moduleRow.moduleId}`);
  }

  return {
    ok: true,
    message:
      result.appliedModules === 0
        ? "No matching modules found for industry templates."
        : `Applied industry templates to ${result.appliedModules} module(s): ${result.createdFields} field(s) added, ${result.reactivatedFields} reactivated, ${result.skippedFields} already present.`
  };
}
