import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformSession } from "@/lib/platform-session";
import { resolveActivePlatformSession } from "@/lib/auth-session";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await resolveActivePlatformSession(await getPlatformSession());
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { id: schoolId } = await ctx.params;
  if (session.role !== "SUPER_ADMIN") {
    const assigned = await db.platformUserSchoolAssignment.findFirst({
      where: { platformUserId: session.platformUserId, schoolId },
      select: { id: true }
    });
    if (!assigned) return NextResponse.json({ ok: false, message: "Not assigned to this school." }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { schoolId },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, email: true, schoolRole: { select: { key: true, name: true } } }
  });

  return NextResponse.json({ ok: true, users });
}
