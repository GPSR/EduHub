import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSessionCookie, getSession } from "@/lib/session";
import { resolveActiveSchoolSession } from "@/lib/auth-session";

export async function requireSession() {
  const session = await resolveActiveSchoolSession(await getSession());
  if (!session) {
    await clearSessionCookie();
    redirect("/login");
  }
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login");
  return { session, user };
}
