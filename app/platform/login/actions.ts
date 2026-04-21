"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createPlatformSessionCookie } from "@/lib/platform-session";
import { auditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlatformLoginState = { ok: boolean; message?: string };

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

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
  let user = await prisma.platformUser.findUnique({ where: { email } });
  if (!user) return { ok: false, message: "Invalid email or password." };
  if (user.role === "SUPER_ADMIN" && user.status !== "APPROVED") {
    user = await prisma.platformUser.update({
      where: { id: user.id },
      data: { status: "APPROVED", approvedAt: user.approvedAt ?? new Date(), rejectedAt: null }
    });
  }
  if (!user.isActive) return { ok: false, message: "Your platform user is deactivated. Contact super admin." };
  if (user.status !== "APPROVED") return { ok: false, message: "Your platform user is pending super admin approval." };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { ok: false, message: "Invalid email or password." };

  await auditLog({
    actor: { type: "PLATFORM_USER", id: user.id },
    action: "PLATFORM_LOGIN",
    entityType: "PlatformUser",
    entityId: user.id
  });
  await createPlatformSessionCookie({ platformUserId: user.id, role: user.role });
  redirect("/platform");
}
