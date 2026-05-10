"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { getDefaultSchoolHomePath } from "@/lib/default-school-home";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AcceptInviteState = { ok: boolean; message?: string };

const Schema = z.object({
  token: z.string().min(10),
  name: z.string().min(2, "Name is required."),
  password: z.string().min(10, "Password must be at least 10 characters.")
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function csvContainsEmail(csv: string | null | undefined, email: string) {
  if (!csv) return false;
  const normalized = normalizeEmail(email);
  return csv
    .split(/[,;]+/)
    .map((part) => normalizeEmail(part))
    .some((part) => part.length > 0 && part === normalized);
}

async function linkParentUserToStudentsByEmail(args: { schoolId: string; userId: string; email: string }) {
  const candidates = await db.student.findMany({
    where: {
      schoolId: args.schoolId,
      parentEmails: { contains: args.email, mode: "insensitive" }
    },
    select: { id: true, parentEmails: true }
  });

  const studentIds = candidates
    .filter((student) => csvContainsEmail(student.parentEmails, args.email))
    .map((student) => student.id);
  if (studentIds.length === 0) return;

  await db.studentParent.createMany({
    data: studentIds.map((studentId) => ({
      schoolId: args.schoolId,
      studentId,
      userId: args.userId,
      relation: "Parent"
    })),
    skipDuplicates: true
  });
}

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

  const invite = await db.schoolInvite.findUnique({
    where: { token: parsed.data.token },
    include: { schoolRole: { select: { id: true, key: true } } }
  });
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

  if (invite.schoolRole.key === "PARENT") {
    await linkParentUserToStudentsByEmail({
      schoolId: invite.schoolId,
      userId: user.id,
      email: invite.email
    });
  }

  await createSessionCookie({
    userId: user.id,
    schoolId: invite.schoolId,
    roleId: invite.schoolRole.id,
    roleKey: invite.schoolRole.key
  });
  redirect(getDefaultSchoolHomePath(invite.schoolRole.key));
}
