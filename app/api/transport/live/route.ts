import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";
import { getLiveTransportForSchool, getParentAssignedBusIds } from "@/lib/transport";
import { resolveActiveSchoolSession } from "@/lib/auth-session";

export async function GET() {
  const session = await resolveActiveSchoolSession(await getSession());
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canView = perms.TRANSPORT ? atLeastLevel(perms.TRANSPORT, "VIEW") : false;
  if (!canView) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  let buses = await getLiveTransportForSchool(session.schoolId);
  if (session.roleKey === "PARENT") {
    const assignedBusIds = await getParentAssignedBusIds(session.schoolId, session.userId, {
      onlyUndroppedActiveTrip: true
    });
    buses = buses.filter((b) => assignedBusIds.has(b.id) && b.tripStatus === "STARTED");
  }
  return NextResponse.json({ ok: true, buses, serverTime: new Date().toISOString() });
}
