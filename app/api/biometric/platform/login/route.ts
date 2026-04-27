import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { signScopedToken } from "@/lib/auth-token";
import {
  verifyPlatformBiometricToken,
  isPasswordHashFingerprintMatch,
  issuePlatformBiometricToken,
} from "@/lib/biometric-auth";
import {
  getExpiredSessionCookieOptions,
  getPrimarySessionCookieName,
  getReadableSessionCookieNames,
  getSessionCookieOptions,
} from "@/lib/auth-cookie";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";
import { isJsonRequest, isTrustedMutationRequest } from "@/lib/request-security";

const BiometricLoginSchema = z.object({
  token: z.string().min(24),
});

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ ok: false, message: "Blocked by request origin policy." }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ ok: false, message: "Content-Type must be application/json." }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BiometricLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid biometric login request." }, { status: 400 });
  }

  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "PLATFORM_BIOMETRIC_LOGIN",
    key: buildRateLimitKey(ip, parsed.data.token.slice(0, 24)),
    maxAttempts: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (throttle.limited) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  const claims = await verifyPlatformBiometricToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ ok: false, message: "Biometric token expired. Please sign in with password once." }, { status: 401 });
  }

  const user = await db.platformUser.findUnique({
    where: { id: claims.platformUserId },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: false, message: "Your platform account is inactive." }, { status: 401 });
  }
  if (user.status !== "APPROVED") {
    return NextResponse.json({ ok: false, message: "Your platform user is pending super admin approval." }, { status: 401 });
  }

  if (!isPasswordHashFingerprintMatch(user.passwordHash, claims.passwordHashFingerprint)) {
    return NextResponse.json(
      { ok: false, message: "Biometric session expired. Please sign in with password and enable biometrics again." },
      { status: 401 }
    );
  }

  const session = {
    platformUserId: user.id,
    role: user.role,
  };
  const sessionToken = await signScopedToken("platform", session, user.id);
  const refreshedBiometricToken = await issuePlatformBiometricToken({
    session,
    passwordHash: user.passwordHash,
  });

  const res = NextResponse.json({ ok: true, redirectTo: "/platform", token: refreshedBiometricToken });
  const primaryName = getPrimarySessionCookieName("platform");
  res.cookies.set(primaryName, sessionToken, getSessionCookieOptions("platform"));
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("platform")) {
    if (name !== primaryName) {
      res.cookies.set(name, "", clearOptions);
    }
  }

  await auditLog({
    actor: { type: "PLATFORM_USER", id: user.id },
    action: "PLATFORM_LOGIN_BIOMETRIC",
    entityType: "PlatformUser",
    entityId: user.id,
  });

  return res;
}

