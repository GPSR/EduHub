"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createPlatformSessionCookie } from "@/lib/platform-session";
import { auditLog } from "@/lib/audit";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlatformLoginState = { ok: boolean; message?: string };

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const INVALID_LOGIN_MESSAGE = "Invalid email or password.";
const DUMMY_PASSWORD_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOHiR6f/6sVQqlhK/SXxPxq8np5xpoE3.";

export async function platformLoginAction(
  _prev: PlatformLoginState,
  formData: FormData
): Promise<PlatformLoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your inputs.";
    return { ok: false, message };
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "PLATFORM_LOGIN",
    key: buildRateLimitKey(ip, email),
    maxAttempts: 6,
    windowMs: 10 * 60 * 1000
  });
  if (throttle.limited) {
    return { ok: false, message: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.platformUser.findUnique({ where: { email } });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!ok || !user) return { ok: false, message: INVALID_LOGIN_MESSAGE };
  if (!user.isActive) return { ok: false, message: "Your platform user is deactivated. Contact super admin." };
  if (user.status !== "APPROVED") return { ok: false, message: "Your platform user is pending super admin approval." };

  await auditLog({
    actor: { type: "PLATFORM_USER", id: user.id },
    action: "PLATFORM_LOGIN",
    entityType: "PlatformUser",
    entityId: user.id
  });
  await createPlatformSessionCookie({ platformUserId: user.id, role: user.role });
  redirect("/platform");
}
