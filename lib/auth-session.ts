import { queryFirst } from "@/lib/neon-db";
import type { PlatformSession } from "@/lib/platform-session";
import type { Session } from "@/lib/session";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";

export async function resolveActiveSchoolSession(session: Session | null): Promise<Session | null> {
  if (!session) return null;

  const user = await queryFirst<{
    id: string;
    schoolId: string;
    isActive: boolean;
    schoolRoleId: string;
    schoolIsActive: boolean;
  }>(
    `SELECT u."id", u."schoolId", u."isActive", u."schoolRoleId", s."isActive" AS "schoolIsActive"
     FROM "User" u
     INNER JOIN "School" s ON s."id" = u."schoolId"
     WHERE u."id" = $1
     LIMIT 1`,
    [session.userId]
  );

  if (!user || !user.isActive || !user.schoolIsActive || user.schoolId !== session.schoolId) {
    return null;
  }

  const role = await queryFirst<{ id: string; key: string }>(
    `SELECT "id", "key"
     FROM "SchoolRole"
     WHERE "id" = $1 AND "schoolId" = $2
     LIMIT 1`,
    [user.schoolRoleId, user.schoolId]
  );
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

  const user = await queryFirst<{
    id: string;
    email: string;
    name: string;
    role: "SUPER_ADMIN" | "SUPPORT_USER";
    status: "PENDING" | "APPROVED" | "REJECTED";
    isActive: boolean;
    passwordHash: string;
  }>(
    `SELECT "id", "email", "name", "role", "status", "isActive", "passwordHash"
     FROM "PlatformUser"
     WHERE "id" = $1
     LIMIT 1`,
    [session.platformUserId]
  );
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
