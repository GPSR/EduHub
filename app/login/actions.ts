"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { redirect } from "next/navigation";
import { z } from "zod";

export type LoginState = { ok: boolean; message?: string };

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  schoolSlug: z.string().min(2)
});

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

  const school = await prisma.school.findUnique({
    where: { slug: parsed.data.schoolSlug.toLowerCase() }
  });
  if (!school || !school.isActive)
    return { ok: false, message: "School not found or inactive." };

  const sub = await ensureSchoolSubscriptionActive(school.id);
  if (!sub.ok) return { ok: false, message: sub.reason };

  const user = await prisma.user.findUnique({
    where: { schoolId_email: { schoolId: school.id, email: parsed.data.email.toLowerCase() } }
  });
  if (!user) return { ok: false, message: "Invalid email or password." };
  if (!user.isActive) return { ok: false, message: "Your account is inactive. Contact the school admin." };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { ok: false, message: "Invalid email or password." };

  await auditLog({
    actor: { type: "SCHOOL_USER", id: user.id, schoolId: school.id },
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user.id
  });
  const role = await prisma.schoolRole.findUnique({ where: { id: user.schoolRoleId } });
  if (!role) return { ok: false, message: "Account is misconfigured (missing role)." };
  await createSessionCookie({ userId: user.id, schoolId: school.id, roleId: role.id, roleKey: role.key });
  redirect("/dashboard");
}
