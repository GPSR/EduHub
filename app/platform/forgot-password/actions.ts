"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";

export type PlatformForgotPasswordState = { ok: boolean; message: string };

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a reset link will be sent shortly.";

const Schema = z.object({
  email: z.string().email("Enter a valid email address.")
});

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
  const target = await prisma.platformUser.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true }
  });
  if (!target || !target.isActive) {
    return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  let emailSent = false;
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
  } catch {
    emailSent = false;
  }

  await auditLog({
    actor: { type: "SYSTEM" },
    action: "PLATFORM_USER_FORGOT_PASSWORD_REQUESTED",
    entityType: "PlatformUser",
    entityId: target.id,
    metadata: { emailSent, source: "self_service" }
  });

  return { ok: true, message: GENERIC_SUCCESS_MESSAGE };
}
