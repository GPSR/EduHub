import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";
import { getLiveTransportForSchool } from "@/lib/transport";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canView = perms.TRANSPORT ? atLeastLevel(perms.TRANSPORT, "VIEW") : false;
  if (!canView) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const buses = await getLiveTransportForSchool(session.schoolId);
  return NextResponse.json({ ok: true, buses, serverTime: new Date().toISOString() });
}
