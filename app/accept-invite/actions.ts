"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AcceptInviteState = { ok: boolean; message?: string };

const Schema = z.object({
  token: z.string().min(10),
  name: z.string().min(2, "Name is required."),
  password: z.string().min(10, "Password must be at least 10 characters.")
});

export async function acceptInviteAction(
  _prev: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const parsed = Schema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const invite = await db.schoolInvite.findUnique({ where: { token: parsed.data.token } });
  if (!invite) return { ok: false, message: "Invite link is invalid." };
  if (invite.usedAt) return { ok: false, message: "This invite link has already been used." };
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, message: "This invite link has expired." };

  const existing = await db.user.findFirst({
    where: { schoolId: invite.schoolId, email: invite.email.toLowerCase() }
  });
  if (existing) return { ok: false, message: "A user with this email already exists for this school." };

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      schoolId: invite.schoolId,
      email: invite.email.toLowerCase(),
      name: parsed.data.name,
      schoolRoleId: invite.schoolRoleId,
      passwordHash
    }
  });

  await db.schoolInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() }
  });

  const role = await db.schoolRole.findUnique({ where: { id: invite.schoolRoleId } });
  if (!role) return { ok: false, message: "Invite is misconfigured (missing role)." };
  await createSessionCookie({ userId: user.id, schoolId: invite.schoolId, roleId: role.id, roleKey: role.key });
  redirect("/dashboard");
}
