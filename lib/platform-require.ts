import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearPlatformSessionCookie, getPlatformSession } from "@/lib/platform-session";
import { resolveActivePlatformSessionWithUser } from "@/lib/auth-session";

export async function requirePlatformSession() {
  const resolved = await resolveActivePlatformSessionWithUser(await getPlatformSession());
  if (!resolved) {
    await clearPlatformSessionCookie();
    redirect("/platform/login");
  }
  return resolved.session;
}

export async function requirePlatformUser() {
  const resolved = await resolveActivePlatformSessionWithUser(await getPlatformSession());
  if (!resolved) {
    await clearPlatformSessionCookie();
    redirect("/platform/login");
  }
  return resolved;
}

export async function requireSuperAdmin() {
  const { session, user } = await requirePlatformUser();
  if (session.role !== "SUPER_ADMIN" || user.role !== "SUPER_ADMIN") redirect("/platform");
  return { session, user };
}

export async function requirePlatformSchoolAccess(schoolId: string) {
  const { session, user } = await requirePlatformUser();
  if (user.role === "SUPER_ADMIN") return { session, user };

  const assignment = await prisma.platformUserSchoolAssignment.findFirst({
    where: { platformUserId: user.id, schoolId },
    select: { id: true }
  });
  if (!assignment) redirect("/platform");
  return { session, user };
}
