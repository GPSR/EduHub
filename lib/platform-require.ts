import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPlatformSession } from "@/lib/platform-session";

export async function requirePlatformSession() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");
  return session;
}

export async function requirePlatformUser() {
  const session = await requirePlatformSession();
  const user = await prisma.platformUser.findUnique({ where: { id: session.platformUserId } });
  if (!user) redirect("/platform/login");
  if (user.role === "SUPER_ADMIN" && user.status !== "APPROVED") {
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { status: "APPROVED", approvedAt: user.approvedAt ?? new Date(), rejectedAt: null }
    });
    return { session, user: { ...user, status: "APPROVED" } };
  }
  if (!user.isActive) redirect("/platform/login");
  if (user.status !== "APPROVED") redirect("/platform/login");
  return { session, user };
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
