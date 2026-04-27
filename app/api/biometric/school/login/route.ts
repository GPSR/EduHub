import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSessionToken } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { verifySchoolBiometricToken, isPasswordHashFingerprintMatch, issueSchoolBiometricToken } from "@/lib/biometric-auth";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
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
    scope: "SCHOOL_BIOMETRIC_LOGIN",
    key: buildRateLimitKey(ip, parsed.data.token.slice(0, 24)),
    maxAttempts: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (throttle.limited) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  const claims = await verifySchoolBiometricToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ ok: false, message: "Biometric token expired. Please sign in with password once." }, { status: 401 });
  }

  const user = await db.user.findFirst({
    where: { id: claims.userId, schoolId: claims.schoolId },
    include: {
      school: { select: { isActive: true } },
    },
  });
  if (!user || !user.isActive || !user.school.isActive) {
    return NextResponse.json({ ok: false, message: "Your account is inactive. Contact the school admin." }, { status: 401 });
  }

  if (!isPasswordHashFingerprintMatch(user.passwordHash, claims.passwordHashFingerprint)) {
    return NextResponse.json(
      { ok: false, message: "Biometric session expired. Please sign in with password and enable biometrics again." },
      { status: 401 }
    );
  }

  const role = await db.schoolRole.findFirst({
    where: { id: user.schoolRoleId, schoolId: user.schoolId },
    select: { id: true, key: true },
  });
  if (!role) {
    return NextResponse.json({ ok: false, message: "Account is misconfigured (missing role)." }, { status: 400 });
  }

  const sub = await ensureSchoolSubscriptionActive(user.schoolId);
  if (!sub.ok) {
    return NextResponse.json({ ok: false, message: sub.reason }, { status: 400 });
  }

  const session = {
    userId: user.id,
    schoolId: user.schoolId,
    roleId: role.id,
    roleKey: role.key,
  };
  const sessionToken = await signSessionToken(session);
  const refreshedBiometricToken = await issueSchoolBiometricToken({
    session,
    passwordHash: user.passwordHash,
  });

  const res = NextResponse.json({ ok: true, redirectTo: "/dashboard", token: refreshedBiometricToken });
  const primaryName = getPrimarySessionCookieName("school");
  res.cookies.set(primaryName, sessionToken, getSessionCookieOptions("school"));
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("school")) {
    if (name !== primaryName) {
      res.cookies.set(name, "", clearOptions);
    }
  }

  await auditLog({
    actor: { type: "SCHOOL_USER", id: user.id, schoolId: user.schoolId },
    action: "USER_LOGIN_BIOMETRIC",
    entityType: "User",
    entityId: user.id,
  });

  return res;
}

