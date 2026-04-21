"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createPlatformSessionCookie } from "@/lib/platform-session";
import { auditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlatformOnboardState = { ok: boolean; message?: string };

const OnboardSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10)
});

export async function platformOnboardAction(
  _prev: PlatformOnboardState,
  formData: FormData
): Promise<PlatformOnboardState> {
  const parsed = OnboardSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your inputs.";
    return { ok: false, message };
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  let user:
    | {
        id: string;
        email: string;
      }
    | null = null;
  try {
    user = await prisma.$transaction(async (tx) => {
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
