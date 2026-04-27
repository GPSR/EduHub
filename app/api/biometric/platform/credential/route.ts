import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-session";
import { resolveActivePlatformSessionWithUser } from "@/lib/auth-session";
import { issuePlatformBiometricToken } from "@/lib/biometric-auth";
import { isJsonRequest, isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ ok: false, message: "Blocked by request origin policy." }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ ok: false, message: "Content-Type must be application/json." }, { status: 415 });
  }

  const resolved = await resolveActivePlatformSessionWithUser(await getPlatformSession());
  if (!resolved) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const token = await issuePlatformBiometricToken({
    session: resolved.session,
    passwordHash: resolved.user.passwordHash,
  });

  return NextResponse.json({ ok: true, token });
}

