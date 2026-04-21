"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";
import { hashPassword, verifyPassword } from "@/lib/password";

export type PlatformProfileState = { ok: boolean; message?: string };

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120)
});

export async function updatePlatformProfileAction(
  _prev: PlatformProfileState,
  formData: FormData
): Promise<PlatformProfileState> {
  const { user } = await requirePlatformUser();
  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your inputs." };

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name.trim();
  if (user.name === name && user.email.toLowerCase() === email) return { ok: false, message: "No changes to save." };

  const existing = await prisma.platformUser.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true }
  });
  if (existing) return { ok: false, message: "That email is already used by another platform user." };

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { name, email }
  });

  return { ok: true, message: "Profile updated." };
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(10),
  confirmPassword: z.string().min(10)
});

export async function changePlatformPasswordAction(
  _prev: PlatformProfileState,
  formData: FormData
): Promise<PlatformProfileState> {
  const { user } = await requirePlatformUser();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: "Please check your inputs." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) return { ok: false, message: "Passwords do not match." };
  if (parsed.data.currentPassword === parsed.data.newPassword) return { ok: false, message: "New password must be different." };

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, message: "Current password is incorrect." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.platformUser.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  return { ok: true, message: "Password updated." };
}
