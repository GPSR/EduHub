import { prisma } from "@/lib/db";

export type BusLiveLocation = {
  lat: number;
  lng: number;
  speedKph?: number;
  headingDeg?: number;
  source?: string;
  note?: string;
  at: string;
  byUserId?: string;
};

export type BusLiveView = {
  id: string;
  name: string;
  plateNumber: string | null;
  capacity: number | null;
  assignedDriverName: string | null;
  assignedDriverId: string | null;
  location: BusLiveLocation | null;
};

function parseLocation(metadataJson: string | null, createdAt: Date): BusLiveLocation | null {
  if (!metadataJson) return null;
  try {
    const raw = JSON.parse(metadataJson) as {
      lat?: unknown;
      lng?: unknown;
      speedKph?: unknown;
      headingDeg?: unknown;
      source?: unknown;
      note?: unknown;
      at?: unknown;
      byUserId?: unknown;
    };
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const speedKph = raw.speedKph === undefined ? undefined : Number(raw.speedKph);
    const headingDeg = raw.headingDeg === undefined ? undefined : Number(raw.headingDeg);
    return {
      lat,
      lng,
      speedKph: Number.isFinite(speedKph) ? speedKph : undefined,
      headingDeg: Number.isFinite(headingDeg) ? headingDeg : undefined,
      source: typeof raw.source === "string" ? raw.source : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      at: typeof raw.at === "string" ? raw.at : createdAt.toISOString(),
      byUserId: typeof raw.byUserId === "string" ? raw.byUserId : undefined
    };
  } catch {
    return null;
  }
}

export async function getLiveTransportForSchool(schoolId: string): Promise<BusLiveView[]> {
  const [buses, assignments, logs] = await Promise.all([
    prisma.bus.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.busDriverAssignment.findMany({
      where: { schoolId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { assignedAt: "desc" }
    }),
    prisma.auditLog.findMany({
      where: { schoolId, action: "BUS_LOCATION_UPDATE", entityType: "Bus" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { entityId: true, metadataJson: true, createdAt: true }
    })
  ]);

  const latestLocationByBusId = new Map<string, BusLiveLocation>();
  for (const log of logs) {
    if (!log.entityId || latestLocationByBusId.has(log.entityId)) continue;
    const parsed = parseLocation(log.metadataJson, log.createdAt);
    if (!parsed) continue;
    latestLocationByBusId.set(log.entityId, parsed);
  }

  const assignmentByBusId = new Map<string, { id: string; name: string }>();
  for (const a of assignments) {
    if (!assignmentByBusId.has(a.busId)) {
      assignmentByBusId.set(a.busId, { id: a.user.id, name: a.user.name });
    }
  }

  return buses.map((bus) => {
    const assigned = assignmentByBusId.get(bus.id);
    return {
      id: bus.id,
      name: bus.name,
      plateNumber: bus.plateNumber,
      capacity: bus.capacity,
      assignedDriverId: assigned?.id ?? null,
      assignedDriverName: assigned?.name ?? null,
      location: latestLocationByBusId.get(bus.id) ?? null
    };
  });
}
