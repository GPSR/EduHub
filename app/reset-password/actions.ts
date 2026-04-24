"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export type ResetPasswordState = { ok: boolean; message: string };

const Schema = z.object({
  token: z.string().min(10),
  password: z.string().min(10),
  confirmPassword: z.string().min(10)
});

export async function resetPasswordWithTokenAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = Schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (parsed.data.password !== parsed.data.confirmPassword) return { ok: false, message: "Passwords do not match." };

  const token = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      subjectType: true,
      platformUserId: true,
      userId: true
    }
  });
  if (!token) return { ok: false, message: "Invalid reset link." };
  if (token.usedAt) return { ok: false, message: "This reset link has already been used." };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, message: "This reset link has expired." };

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction(async (tx) => {
    if (token.subjectType === "PLATFORM_USER") {
      if (!token.platformUserId) throw new Error("invalid_token_subject");
      await tx.platformUser.update({ where: { id: token.platformUserId }, data: { passwordHash } });
    } else {
      if (!token.userId) throw new Error("invalid_token_subject");
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
    }

    await tx.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() }
    });
  });

  return { ok: true, message: "Password updated. You can now login with the new password." };
}
