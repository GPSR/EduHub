import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlatformSession } from "@/lib/platform-session";
import { signSessionToken } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";
import { resolveActivePlatformSession } from "@/lib/auth-session";
import { getExpiredSessionCookieOptions, getPrimarySessionCookieName, getReadableSessionCookieNames, getSessionCookieOptions } from "@/lib/auth-cookie";

export async function POST(req: Request) {
  const platformSession = await resolveActivePlatformSession(await getPlatformSession());
  if (!platformSession) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { schoolId?: string; userId?: string }
    | null;
  const schoolId = String(body?.schoolId ?? "");
  const userId = String(body?.userId ?? "");
  if (!schoolId || !userId) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  if (platformSession.role !== "SUPER_ADMIN") {
    const assigned = await prisma.platformUserSchoolAssignment.findFirst({
      where: { platformUserId: platformSession.platformUserId, schoolId },
      select: { id: true }
    });
    if (!assigned) return NextResponse.json({ ok: false, message: "Not assigned to this school." }, { status: 403 });
  }

  const user = await prisma.user.findFirst({ where: { id: userId, schoolId } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  const role = await prisma.schoolRole.findUnique({ where: { id: user.schoolRoleId } });
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
