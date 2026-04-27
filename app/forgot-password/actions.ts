"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";

export type ForgotPasswordState = { ok: boolean; message: string };

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this school and email, a reset link will be sent shortly.";

const Schema = z.object({
  schoolSlug: z.string().trim().min(2, "School slug is required."),
  email: z.string().email("Enter a valid email address.")
});

function summarizeEmailError(error: unknown) {
  const raw = error instanceof Error ? error.message : "email_send_failed";
  return raw.slice(0, 220);
}

export async function requestSchoolUserPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = Schema.safeParse({
    schoolSlug: formData.get("schoolSlug"),
    email: formData.get("email")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const schoolSlug = parsed.data.schoolSlug.toLowerCase();
  const email = parsed.data.email.toLowerCase();
  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "SCHOOL_FORGOT_PASSWORD",
    key: buildRateLimitKey(ip, schoolSlug, email),
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000
  });
  if (throttle.limited) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, isActive: true }
  });
  if (!school || !school.isActive) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const target = await prisma.user.findUnique({
    where: { schoolId_email: { schoolId: school.id, email } },
    select: { id: true, name: true, isActive: true }
  });
  if (!target || !target.isActive) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  let emailSent = false;
  let emailFailureReason: string | null = null;
  try {
    const tokenRow = await createPasswordResetToken({
      subjectType: "SCHOOL_USER",
      userId: target.id,
      schoolId: school.id,
      email
    });
    const sent = await sendPasswordResetEmail({
      subjectType: "SCHOOL_USER",
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
    console.error("school forgot-password email send failed", {
      schoolId: school.id,
      userId: target.id,
      reason: emailFailureReason
    });
  }

  await auditLog({
    actor: { type: "SYSTEM" },
    action: "SCHOOL_USER_FORGOT_PASSWORD_REQUESTED",
    entityType: "User",
    entityId: target.id,
    schoolId: school.id,
    metadata: { emailSent, emailFailureReason, source: "self_service" }
  });

  return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
}
