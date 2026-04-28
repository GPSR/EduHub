"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";

export type PlatformForgotPasswordState = { ok: boolean; message: string };

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a reset link will be sent shortly.";

const Schema = z.object({
  email: z.string().email("Enter a valid email address.")
});

function summarizeEmailError(error: unknown) {
  const raw = error instanceof Error ? error.message : "email_send_failed";
  return raw.slice(0, 220);
}

export async function requestPlatformUserPasswordResetAction(
  _prev: PlatformForgotPasswordState,
  formData: FormData
): Promise<PlatformForgotPasswordState> {
  const parsed = Schema.safeParse({
    email: formData.get("email")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "PLATFORM_FORGOT_PASSWORD",
    key: buildRateLimitKey(ip, email),
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000
  });
  if (throttle.limited) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const target = await db.platformUser.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true }
  });
  if (!target || !target.isActive) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  let emailSent = false;
  let emailFailureReason: string | null = null;
  try {
    const tokenRow = await createPasswordResetToken({
      subjectType: "PLATFORM_USER",
      platformUserId: target.id,
      email
    });
    const sent = await sendPasswordResetEmail({
      subjectType: "PLATFORM_USER",
      toEmail: email,
      recipientName: target.name,
      resetToken: tokenRow.token,
      expiresAt: tokenRow.expiresAt
    });
    emailSent = sent.sent;
    if (!sent.sent) emailFailureReason = "email_provider_not_configured";
  } catch (error) {
    emailSent = false;
    emailFailureReason = summarizeEmailError(error);
    console.error("platform forgot-password email send failed", {
      platformUserId: target.id,
      reason: emailFailureReason
    });
  }

  await auditLog({
    actor: { type: "SYSTEM" },
    action: "PLATFORM_USER_FORGOT_PASSWORD_REQUESTED",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { emailSent, emailFailureReason, source: "self_service" }
  });

  return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
}
