"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createPlatformSessionCookie } from "@/lib/platform-session";
import { auditLog } from "@/lib/audit";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";
import { platformOnboardNeedsSetupKey, platformOnboardReady, verifyPlatformOnboardSetupKey } from "@/lib/platform-onboard-guard";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlatformOnboardState = { ok: boolean; message?: string };

const OnboardSchema = z.object({
  setupKey: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10)
});

export async function platformOnboardAction(
  _prev: PlatformOnboardState,
  formData: FormData
): Promise<PlatformOnboardState> {
  const parsed = OnboardSchema.safeParse({
    setupKey: String(formData.get("setupKey") ?? "").trim() || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your inputs.";
    return { ok: false, message };
  }
  if (!platformOnboardReady()) {
    return { ok: false, message: "Platform onboarding is locked. Contact the system administrator." };
  }

  const ip = await readRequestIp();
  const email = parsed.data.email.toLowerCase();
  const throttle = await consumeRateLimitAttempt({
    scope: "PLATFORM_ONBOARD",
    key: buildRateLimitKey(ip, email),
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000
  });
  if (throttle.limited) {
    return { ok: false, message: "Too many setup attempts. Please wait and try again." };
  }

  if (platformOnboardNeedsSetupKey()) {
    const setupKey = parsed.data.setupKey ?? "";
    if (!verifyPlatformOnboardSetupKey(setupKey)) {
      return { ok: false, message: "Invalid setup key." };
    }
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user:
    | {
        id: string;
        email: string;
      }
    | null = null;
  try {
    user = await db.$transaction(async (tx) => {
      const existing = await tx.platformUser.findFirst({ select: { id: true } });
      if (existing) return null;
      return tx.platformUser.create({
        data: { name: parsed.data.name, email, passwordHash, role: "SUPER_ADMIN", status: "APPROVED", approvedAt: new Date() },
        select: { id: true, email: true }
      });
    });
  } catch {
    return { ok: false, message: "Unable to create super admin. Please try platform login." };
  }
  if (!user) return { ok: false, message: "Super Admin already exists. Use platform login." };

  await auditLog({
    actor: { type: "SYSTEM" },
    action: "PLATFORM_SUPERADMIN_CREATED",
    entityType: "PlatformUser",
    entityId: user.id,
    metadata: { email: user.email }
  });
  await createPlatformSessionCookie({ platformUserId: user.id, role: "SUPER_ADMIN" });
  redirect("/platform");
}
