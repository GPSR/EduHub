import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveActiveSchoolSession } from "@/lib/auth-session";
import { issueSchoolBiometricToken } from "@/lib/biometric-auth";
import { isJsonRequest, isTrustedMutationRequest } from "@/lib/request-security";
import { queryFirst } from "@/lib/neon-db";

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req, { allowNativeAppOrigin: true })) {
    return NextResponse.json({ ok: false, message: "Blocked by request origin policy." }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ ok: false, message: "Content-Type must be application/json." }, { status: 415 });
  }

  const session = await resolveActiveSchoolSession(await getSession());
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const user = await queryFirst<{ passwordHash: string }>(
    `SELECT "passwordHash"
     FROM "User"
     WHERE "id" = $1 AND "schoolId" = $2 AND "isActive" = TRUE
     LIMIT 1`,
    [session.userId, session.schoolId]
  );

  if (!user) {
    return NextResponse.json({ ok: false, message: "User account is unavailable." }, { status: 401 });
  }

  const token = await issueSchoolBiometricToken({
    session,
    passwordHash: user.passwordHash,
  });

  return NextResponse.json({ ok: true, token });
}
