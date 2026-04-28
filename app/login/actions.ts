"use server";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";
import { getDefaultSchoolHomePath } from "@/lib/default-school-home";
import { redirect } from "next/navigation";
import { z } from "zod";

export type LoginState = { ok: boolean; message?: string };

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  schoolSlug: z.string().min(2)
});

const INVALID_LOGIN_MESSAGE = "Invalid email or password.";
const DUMMY_PASSWORD_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOHiR6f/6sVQqlhK/SXxPxq8np5xpoE3.";

function sanitizeNextPath(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\r\n]/.test(value)) return null;
  return value;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    schoolSlug: formData.get("schoolSlug")
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your inputs.";
    return { ok: false, message };
  }

  const email = parsed.data.email.toLowerCase();
  const schoolSlug = parsed.data.schoolSlug.toLowerCase();
  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "SCHOOL_LOGIN",
    key: buildRateLimitKey(ip, schoolSlug, email),
    maxAttempts: 8,
    windowMs: 10 * 60 * 1000
  });
  if (throttle.limited) {
    return { ok: false, message: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  const school = await db.school.findUnique({
    where: { slug: schoolSlug }
  });
  if (!school || !school.isActive)
    return { ok: false, message: "School not found or inactive." };

  const sub = await ensureSchoolSubscriptionActive(school.id);
  if (!sub.ok) return { ok: false, message: sub.reason };

  const user = await db.user.findUnique({
    where: { schoolId_email: { schoolId: school.id, email } }
  });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!ok || !user) return { ok: false, message: INVALID_LOGIN_MESSAGE };
  if (!user.isActive) return { ok: false, message: "Your account is inactive. Contact the school admin." };

  await auditLog({
    actor: { type: "SCHOOL_USER", id: user.id, schoolId: school.id },
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user.id
  });
  const role = await db.schoolRole.findUnique({ where: { id: user.schoolRoleId } });
  if (!role) return { ok: false, message: "Account is misconfigured (missing role)." };
  await createSessionCookie({ userId: user.id, schoolId: school.id, roleId: role.id, roleKey: role.key });
  redirect(sanitizeNextPath(formData.get("next")) ?? getDefaultSchoolHomePath(role.key));
}
