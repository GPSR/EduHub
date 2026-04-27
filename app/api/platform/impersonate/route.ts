import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformSession } from "@/lib/platform-session";
import { signSessionToken } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { resolveActivePlatformSession } from "@/lib/auth-session";
import { getExpiredSessionCookieOptions, getPrimarySessionCookieName, getReadableSessionCookieNames, getSessionCookieOptions } from "@/lib/auth-cookie";
import { buildRateLimitKey, consumeRateLimitAttempt, readRequestIp } from "@/lib/rate-limit";
import { isJsonRequest, isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ ok: false, message: "Blocked by request origin policy." }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ ok: false, message: "Content-Type must be application/json." }, { status: 415 });
  }

  const platformSession = await resolveActivePlatformSession(await getPlatformSession());
  if (!platformSession) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { schoolId?: string; userId?: string }
    | null;
  const schoolId = String(body?.schoolId ?? "");
  const userId = String(body?.userId ?? "");
  if (!schoolId || !userId) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });

  const ip = await readRequestIp();
  const throttle = await consumeRateLimitAttempt({
    scope: "PLATFORM_IMPERSONATE",
    key: buildRateLimitKey(ip, platformSession.platformUserId, schoolId),
    maxAttempts: 25,
    windowMs: 5 * 60 * 1000
  });
  if (throttle.limited) {
    return NextResponse.json(
      { ok: false, message: "Too many impersonation attempts. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  if (platformSession.role !== "SUPER_ADMIN") {
    const assigned = await db.platformUserSchoolAssignment.findFirst({
      where: { platformUserId: platformSession.platformUserId, schoolId },
      select: { id: true }
    });
    if (!assigned) return NextResponse.json({ ok: false, message: "Not assigned to this school." }, { status: 403 });
  }

  const user = await db.user.findFirst({ where: { id: userId, schoolId } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  if (!user.isActive) return NextResponse.json({ ok: false, message: "User account is inactive." }, { status: 400 });

  const role = await db.schoolRole.findFirst({ where: { id: user.schoolRoleId, schoolId } });
  if (!role) return NextResponse.json({ ok: false, message: "User role missing." }, { status: 400 });
  const sub = await ensureSchoolSubscriptionActive(user.schoolId);
  if (!sub.ok) return NextResponse.json({ ok: false, message: sub.reason }, { status: 400 });

  const token = await signSessionToken({ userId: user.id, schoolId: user.schoolId, roleId: role.id, roleKey: role.key });
  const res = NextResponse.json({ ok: true });
  const primarySessionCookie = getPrimarySessionCookieName("school");
  res.cookies.set(primarySessionCookie, token, getSessionCookieOptions("school"));
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("school")) {
    if (name !== primarySessionCookie) res.cookies.set(name, "", clearOptions);
  }

  await auditLog({
    actor: { type: "PLATFORM_USER", id: platformSession.platformUserId },
    action: "PLATFORM_IMPERSONATE_USER",
    entityType: "User",
    entityId: user.id,
    schoolId: user.schoolId,
    metadata: { roleKey: role.key }
  });

  return res;
}
