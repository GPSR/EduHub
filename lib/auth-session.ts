import { db } from "@/lib/db";
import type { PlatformSession } from "@/lib/platform-session";
import type { Session } from "@/lib/session";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";

export async function resolveActiveSchoolSession(session: Session | null): Promise<Session | null> {
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      schoolId: true,
      isActive: true,
      schoolRoleId: true,
      school: { select: { isActive: true } }
    }
  });
  if (!user || !user.isActive || !user.school.isActive || user.schoolId !== session.schoolId) {
    return null;
  }

  const role = await db.schoolRole.findFirst({
    where: { id: user.schoolRoleId, schoolId: user.schoolId },
    select: { id: true, key: true }
  });
  if (!role) return null;

  const sub = await ensureSchoolSubscriptionActive(user.schoolId);
  if (!sub.ok) return null;

  return {
    userId: user.id,
    schoolId: user.schoolId,
    roleId: role.id,
    roleKey: role.key
  };
}

export async function resolveActivePlatformSessionWithUser(session: PlatformSession | null) {
  if (!session) return null;

  const user = await db.platformUser.findUnique({ where: { id: session.platformUserId } });
  if (!user || !user.isActive || user.status !== "APPROVED") return null;

  return {
    session: {
      platformUserId: user.id,
      role: user.role
    } satisfies PlatformSession,
    user
  };
}

export async function resolveActivePlatformSession(session: PlatformSession | null): Promise<PlatformSession | null> {
  const resolved = await resolveActivePlatformSessionWithUser(session);
  return resolved?.session ?? null;
}
