import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveActiveSchoolSession } from "@/lib/auth-session";
import { issueSchoolBiometricToken } from "@/lib/biometric-auth";
import { isJsonRequest, isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ ok: false, message: "Blocked by request origin policy." }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ ok: false, message: "Content-Type must be application/json." }, { status: 415 });
  }

  const session = await resolveActiveSchoolSession(await getSession());
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const user = await db.user.findFirst({
    where: {
      id: session.userId,
      schoolId: session.schoolId,
      isActive: true,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "User account is unavailable." }, { status: 401 });
  }

  const token = await issueSchoolBiometricToken({
    session,
    passwordHash: user.passwordHash,
  });

  return NextResponse.json({ ok: true, token });
}

