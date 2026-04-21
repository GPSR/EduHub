import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ensureSchoolSubscriptionActive } from "@/lib/subscription";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  const sub = await ensureSchoolSubscriptionActive(session.schoolId);
  if (!sub.ok) redirect("/login");
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login");
  return { session, user };
}
