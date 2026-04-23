import { prisma } from "@/lib/db";

const ASSIGN_PREFIX = "BUS_ASSIGN:";

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

export type BusTripStatus = "STARTED" | "ENDED";

export type StudentTransportAssignment = {
  busId: string;
  routeId?: string;
  pickupPoint?: string;
};

export type BusLiveView = {
  id: string;
  name: string;
  plateNumber: string | null;
  capacity: number | null;
  assignedDriverName: string | null;
  assignedDriverId: string | null;
  routeId: string | null;
  routeName: string | null;
  tripStatus: BusTripStatus;
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

function parseTripStatus(metadataJson: string | null): BusTripStatus | null {
  if (!metadataJson) return null;
  try {
    const raw = JSON.parse(metadataJson) as { status?: unknown };
    if (raw.status === "STARTED" || raw.status === "ENDED") return raw.status;
    return null;
  } catch {
    return null;
  }
}

function parseTripMeta(metadataJson: string | null): { status: BusTripStatus; tripToken?: string } | null {
  if (!metadataJson) return null;
  try {
    const raw = JSON.parse(metadataJson) as { status?: unknown; tripToken?: unknown };
    if (raw.status !== "STARTED" && raw.status !== "ENDED") return null;
    return {
      status: raw.status,
      tripToken: typeof raw.tripToken === "string" && raw.tripToken ? raw.tripToken : undefined
    };
  } catch {
    return null;
  }
}

export function encodeStudentTransportAssignment(assign: StudentTransportAssignment): string {
  return `${ASSIGN_PREFIX}${JSON.stringify(assign)}`;
}

export function parseStudentTransportAssignment(value: string | null | undefined): StudentTransportAssignment | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith(ASSIGN_PREFIX)) return null;
  try {
    const payload = JSON.parse(trimmed.slice(ASSIGN_PREFIX.length)) as {
      busId?: unknown;
      routeId?: unknown;
      pickupPoint?: unknown;
    };
    if (typeof payload.busId !== "string" || payload.busId.length < 1) return null;
    return {
      busId: payload.busId,
      routeId: typeof payload.routeId === "string" && payload.routeId.length ? payload.routeId : undefined,
      pickupPoint: typeof payload.pickupPoint === "string" && payload.pickupPoint.length ? payload.pickupPoint : undefined
    };
  } catch {
    return null;
  }
}

export async function getParentAssignedBusIds(
  schoolId: string,
  userId: string,
  opts?: { onlyUndroppedActiveTrip?: boolean }
): Promise<Set<string>> {
  const students = await prisma.student.findMany({
    where: { schoolId, parents: { some: { userId } } },
    select: { id: true, transportDetails: true }
  });
  const byBusId = new Map<string, Set<string>>();
  for (const s of students) {
    const assign = parseStudentTransportAssignment(s.transportDetails);
    if (!assign?.busId) continue;
    if (!byBusId.has(assign.busId)) byBusId.set(assign.busId, new Set());
    byBusId.get(assign.busId)?.add(s.id);
  }

  if (!opts?.onlyUndroppedActiveTrip) return new Set(byBusId.keys());

  const busIds = Array.from(byBusId.keys());
  if (busIds.length === 0) return new Set<string>();

  const tripLogs = await prisma.auditLog.findMany({
    where: { schoolId, action: "BUS_TRIP_STATUS", entityType: "Bus", entityId: { in: busIds } },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadataJson: true }
  });

  const activeTripByBus = new Map<string, string>();
  for (const log of tripLogs) {
    if (!log.entityId || activeTripByBus.has(log.entityId)) continue;
    const meta = parseTripMeta(log.metadataJson);
    if (!meta || meta.status !== "STARTED" || !meta.tripToken) continue;
    activeTripByBus.set(log.entityId, meta.tripToken);
  }

  const dropLogs = await prisma.auditLog.findMany({
    where: { schoolId, action: "BUS_STUDENT_DROP", entityType: "Bus", entityId: { in: busIds } },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadataJson: true }
  });

  const droppedByBusAndTrip = new Map<string, Set<string>>();
  for (const log of dropLogs) {
    if (!log.entityId || !log.metadataJson) continue;
    try {
      const parsed = JSON.parse(log.metadataJson) as { studentId?: unknown; tripToken?: unknown };
      if (typeof parsed.studentId !== "string" || !parsed.studentId) continue;
      if (typeof parsed.tripToken !== "string" || !parsed.tripToken) continue;
      const key = `${log.entityId}::${parsed.tripToken}`;
      if (!droppedByBusAndTrip.has(key)) droppedByBusAndTrip.set(key, new Set());
      droppedByBusAndTrip.get(key)?.add(parsed.studentId);
    } catch {
      continue;
    }
  }

  const visible = new Set<string>();
  for (const [busId, studentIds] of byBusId) {
    const tripToken = activeTripByBus.get(busId);
    if (!tripToken) continue;
    const dropped = droppedByBusAndTrip.get(`${busId}::${tripToken}`) ?? new Set<string>();
    const hasUndropped = Array.from(studentIds).some((id) => !dropped.has(id));
    if (hasUndropped) visible.add(busId);
  }
  return visible;
}

export async function getLiveTransportForSchool(schoolId: string): Promise<BusLiveView[]> {
  const [buses, assignments, routes, locationLogs, tripLogs] = await Promise.all([
    prisma.bus.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.busDriverAssignment.findMany({
      where: { schoolId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { assignedAt: "desc" }
    }),
    prisma.busRoute.findMany({
      where: { schoolId, busId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, busId: true }
    }),
    prisma.auditLog.findMany({
      where: { schoolId, action: "BUS_LOCATION_UPDATE", entityType: "Bus" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { entityId: true, metadataJson: true, createdAt: true }
    }),
    prisma.auditLog.findMany({
      where: { schoolId, action: "BUS_TRIP_STATUS", entityType: "Bus" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { entityId: true, metadataJson: true }
    })
  ]);

  const latestLocationByBusId = new Map<string, BusLiveLocation>();
  for (const log of locationLogs) {
    if (!log.entityId || latestLocationByBusId.has(log.entityId)) continue;
    const parsed = parseLocation(log.metadataJson, log.createdAt);
    if (!parsed) continue;
    latestLocationByBusId.set(log.entityId, parsed);
  }

  const tripStatusByBusId = new Map<string, BusTripStatus>();
  for (const log of tripLogs) {
    if (!log.entityId || tripStatusByBusId.has(log.entityId)) continue;
    const status = parseTripStatus(log.metadataJson);
    if (!status) continue;
    tripStatusByBusId.set(log.entityId, status);
  }

  const assignmentByBusId = new Map<string, { id: string; name: string }>();
  for (const a of assignments) {
    if (!assignmentByBusId.has(a.busId)) {
      assignmentByBusId.set(a.busId, { id: a.user.id, name: a.user.name });
    }
  }

  const routeByBusId = new Map<string, { id: string; name: string }>();
  for (const r of routes) {
    if (!r.busId || routeByBusId.has(r.busId)) continue;
    routeByBusId.set(r.busId, { id: r.id, name: r.name });
  }

  return buses.map((bus) => {
    const assigned = assignmentByBusId.get(bus.id);
    const route = routeByBusId.get(bus.id);
    const tripStatus = tripStatusByBusId.get(bus.id) ?? "ENDED";
    return {
      id: bus.id,
      name: bus.name,
      plateNumber: bus.plateNumber,
      capacity: bus.capacity,
      assignedDriverId: assigned?.id ?? null,
      assignedDriverName: assigned?.name ?? null,
      routeId: route?.id ?? null,
      routeName: route?.name ?? null,
      tripStatus,
      location: tripStatus === "STARTED" ? (latestLocationByBusId.get(bus.id) ?? null) : null
    };
  });
}
