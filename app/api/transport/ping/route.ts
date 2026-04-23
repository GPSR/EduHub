import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const PayloadSchema = z.object({
  busId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKph: z.number().min(0).max(250).optional(),
  headingDeg: z.number().min(0).max(360).optional()
});

function latestTripStatus(meta: string | null): "STARTED" | "ENDED" | null {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta) as { status?: unknown };
    if (parsed.status === "STARTED" || parsed.status === "ENDED") return parsed.status;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canEdit = perms.TRANSPORT ? atLeastLevel(perms.TRANSPORT, "EDIT") : false;
  if (!canEdit) return NextResponse.json({ ok: false, message: "No transport edit access." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid GPS payload." }, { status: 400 });

  const bus = await prisma.bus.findFirst({
    where: { id: parsed.data.busId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!bus) return NextResponse.json({ ok: false, message: "Bus not found." }, { status: 404 });

  if (session.roleKey === "BUS_ASSISTANT") {
    const assignment = await prisma.busDriverAssignment.findFirst({
      where: { schoolId: session.schoolId, userId: session.userId, busId: bus.id },
      select: { id: true }
    });
    if (!assignment) return NextResponse.json({ ok: false, message: "Bus not assigned to this driver." }, { status: 403 });
  }

  const trip = await prisma.auditLog.findFirst({
    where: { schoolId: session.schoolId, action: "BUS_TRIP_STATUS", entityType: "Bus", entityId: bus.id },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  const status = latestTripStatus(trip?.metadataJson ?? null);
  if (status !== "STARTED") {
    return NextResponse.json({ ok: false, message: "Start trip first, then stream GPS." }, { status: 409 });
  }

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_LOCATION_UPDATE",
      entityType: "Bus",
      entityId: bus.id,
      metadataJson: JSON.stringify({
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        speedKph: parsed.data.speedKph,
        headingDeg: parsed.data.headingDeg,
        source: "gps-watch",
        at: new Date().toISOString(),
        byUserId: session.userId
      })
    }
  });

  return NextResponse.json({ ok: true });
}
