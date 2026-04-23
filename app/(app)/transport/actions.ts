"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/db";
import { encodeStudentTransportAssignment } from "@/lib/transport";

export type TransportState = { ok: boolean; message?: string };

const UpdateLocationSchema = z.object({
  busId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  speedKph: z.coerce.number().min(0).max(250).optional(),
  headingDeg: z.coerce.number().min(0).max(360).optional(),
  note: z.string().max(160).optional()
});

const CreateBusSchema = z.object({
  name: z.string().min(2).max(60),
  plateNumber: z.string().max(30).optional(),
  capacity: z.coerce.number().int().min(1).max(500).optional()
});

const AssignDriverSchema = z.object({
  busId: z.string().min(1),
  userId: z.string().min(1)
});

const CreateRouteSchema = z.object({
  busId: z.string().min(1),
  name: z.string().min(2).max(80),
  stopsText: z.string().max(4000).optional()
});

const AssignStudentBusSchema = z.object({
  studentId: z.string().min(1),
  busId: z.string().min(1),
  routeId: z.string().optional(),
  pickupPoint: z.string().max(120).optional()
});

const TripSchema = z.object({
  busId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  speedKph: z.coerce.number().min(0).max(250).optional(),
  headingDeg: z.coerce.number().min(0).max(360).optional()
});

async function ensureBusAllowed(schoolId: string, busId: string, userId: string, roleKey: string) {
  const bus = await prisma.bus.findFirst({ where: { id: busId, schoolId }, select: { id: true, name: true } });
  if (!bus) return null;
  if (roleKey !== "BUS_ASSISTANT") return bus;
  const assignment = await prisma.busDriverAssignment.findFirst({
    where: { schoolId, userId, busId },
    select: { id: true }
  });
  return assignment ? bus : null;
}

function parseStops(stopsText?: string) {
  if (!stopsText) return undefined;
  const stops = stopsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, idx) => ({ name, order: idx + 1 }));
  return stops.length ? JSON.stringify(stops) : undefined;
}

async function notifyParentsOnTripStart(schoolId: string, busId: string, busName: string) {
  const students = await prisma.student.findMany({
    where: { schoolId, transportDetails: { startsWith: "BUS_ASSIGN:" } },
    select: { id: true, fullName: true, transportDetails: true, parents: { select: { userId: true } } }
  });

  const parentIds = new Set<string>();
  for (const s of students) {
    if (!s.transportDetails?.includes(`\"busId\":\"${busId}\"`)) continue;
    for (const p of s.parents) parentIds.add(p.userId);
  }

  if (parentIds.size === 0) return;

  await prisma.notification.createMany({
    data: Array.from(parentIds).map((userId) => ({
      schoolId,
      userId,
      title: `Bus trip started: ${busName}`,
      body: "Live tracking is now available in Transport."
    }))
  });
}

export async function createBusAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");
  if (session.roleKey !== "ADMIN") return { ok: false, message: "Only admin can create buses." };

  const parsed = CreateBusSchema.safeParse({
    name: formData.get("name"),
    plateNumber: String(formData.get("plateNumber") ?? "").trim() || undefined,
    capacity: String(formData.get("capacity") ?? "").trim() ? Number(formData.get("capacity")) : undefined
  });
  if (!parsed.success) return { ok: false, message: "Please enter valid bus details." };

  await prisma.bus.create({
    data: {
      schoolId: session.schoolId,
      name: parsed.data.name,
      plateNumber: parsed.data.plateNumber,
      capacity: parsed.data.capacity
    }
  });

  revalidatePath("/transport");
  return { ok: true, message: "Bus created." };
}

export async function assignDriverAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");
  if (session.roleKey !== "ADMIN") return { ok: false, message: "Only admin can assign drivers." };

  const parsed = AssignDriverSchema.safeParse({
    busId: formData.get("busId"),
    userId: formData.get("userId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid driver assignment." };

  const [bus, driver] = await Promise.all([
    prisma.bus.findFirst({ where: { id: parsed.data.busId, schoolId: session.schoolId }, select: { id: true } }),
    prisma.user.findFirst({
      where: { id: parsed.data.userId, schoolId: session.schoolId, schoolRole: { key: "BUS_ASSISTANT" } },
      select: { id: true }
    })
  ]);

  if (!bus || !driver) return { ok: false, message: "Bus or driver not found." };

  await prisma.$transaction([
    prisma.busDriverAssignment.deleteMany({ where: { schoolId: session.schoolId, busId: bus.id } }),
    prisma.busDriverAssignment.deleteMany({ where: { schoolId: session.schoolId, userId: driver.id } }),
    prisma.busDriverAssignment.create({ data: { schoolId: session.schoolId, busId: bus.id, userId: driver.id } })
  ]);

  revalidatePath("/transport");
  return { ok: true, message: "Driver assigned." };
}

export async function createRouteAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");
  if (session.roleKey !== "ADMIN") return { ok: false, message: "Only admin can manage routes." };

  const parsed = CreateRouteSchema.safeParse({
    busId: formData.get("busId"),
    name: formData.get("name"),
    stopsText: String(formData.get("stopsText") ?? "").trim() || undefined
  });
  if (!parsed.success) return { ok: false, message: "Invalid route details." };

  const bus = await prisma.bus.findFirst({ where: { id: parsed.data.busId, schoolId: session.schoolId }, select: { id: true } });
  if (!bus) return { ok: false, message: "Bus not found." };

  await prisma.busRoute.create({
    data: {
      schoolId: session.schoolId,
      busId: parsed.data.busId,
      name: parsed.data.name,
      stopsJson: parseStops(parsed.data.stopsText)
    }
  });

  revalidatePath("/transport");
  return { ok: true, message: "Route created." };
}

export async function assignStudentBusAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");
  if (session.roleKey !== "ADMIN") return { ok: false, message: "Only admin can assign students." };

  const parsed = AssignStudentBusSchema.safeParse({
    studentId: formData.get("studentId"),
    busId: formData.get("busId"),
    routeId: String(formData.get("routeId") ?? "").trim() || undefined,
    pickupPoint: String(formData.get("pickupPoint") ?? "").trim() || undefined
  });
  if (!parsed.success) return { ok: false, message: "Invalid student transport assignment." };

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { id: true }
  });
  const bus = await prisma.bus.findFirst({
    where: { id: parsed.data.busId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!student || !bus) return { ok: false, message: "Student or bus not found." };

  if (parsed.data.routeId) {
    const route = await prisma.busRoute.findFirst({
      where: { id: parsed.data.routeId, schoolId: session.schoolId, busId: parsed.data.busId },
      select: { id: true }
    });
    if (!route) return { ok: false, message: "Route not valid for selected bus." };
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      transportDetails: encodeStudentTransportAssignment({
        busId: parsed.data.busId,
        routeId: parsed.data.routeId,
        pickupPoint: parsed.data.pickupPoint
      })
    }
  });

  revalidatePath("/transport");
  return { ok: true, message: "Student assigned to bus." };
}

export async function startTripAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");

  const parsed = TripSchema.safeParse({
    busId: formData.get("busId"),
    lat: String(formData.get("lat") ?? "").trim() ? formData.get("lat") : undefined,
    lng: String(formData.get("lng") ?? "").trim() ? formData.get("lng") : undefined,
    speedKph: String(formData.get("speedKph") ?? "").trim() ? formData.get("speedKph") : undefined,
    headingDeg: String(formData.get("headingDeg") ?? "").trim() ? formData.get("headingDeg") : undefined
  });

  if (!parsed.success) return { ok: false, message: "Invalid trip payload." };

  const bus = await ensureBusAllowed(session.schoolId, parsed.data.busId, session.userId, session.roleKey);
  if (!bus) return { ok: false, message: "Bus not found or not assigned to you." };

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_TRIP_STATUS",
      entityType: "Bus",
      entityId: parsed.data.busId,
      metadataJson: JSON.stringify({ status: "STARTED", at: new Date().toISOString() })
    }
  });

  if (typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number") {
    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        actorType: "SCHOOL_USER",
        actorId: session.userId,
        action: "BUS_LOCATION_UPDATE",
        entityType: "Bus",
        entityId: parsed.data.busId,
        metadataJson: JSON.stringify({
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          speedKph: parsed.data.speedKph,
          headingDeg: parsed.data.headingDeg,
          source: "gps",
          at: new Date().toISOString(),
          byUserId: session.userId
        })
      }
    });
  }

  await notifyParentsOnTripStart(session.schoolId, parsed.data.busId, bus.name);

  revalidatePath("/transport");
  return { ok: true, message: "Trip started. Parents can now track live." };
}

export async function stopTripAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");

  const busId = String(formData.get("busId") ?? "").trim();
  if (!busId) return { ok: false, message: "Bus is required." };

  const bus = await ensureBusAllowed(session.schoolId, busId, session.userId, session.roleKey);
  if (!bus) return { ok: false, message: "Bus not found or not assigned to you." };

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_TRIP_STATUS",
      entityType: "Bus",
      entityId: busId,
      metadataJson: JSON.stringify({ status: "ENDED", at: new Date().toISOString() })
    }
  });

  revalidatePath("/transport");
  return { ok: true, message: "Trip ended." };
}

export async function updateBusLocationAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");

  const parsed = UpdateLocationSchema.safeParse({
    busId: formData.get("busId"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    speedKph: String(formData.get("speedKph") ?? "").trim() ? formData.get("speedKph") : undefined,
    headingDeg: String(formData.get("headingDeg") ?? "").trim() ? formData.get("headingDeg") : undefined,
    note: String(formData.get("note") ?? "").trim() || undefined
  });

  if (!parsed.success) return { ok: false, message: "Invalid location payload." };

  const bus = await ensureBusAllowed(session.schoolId, parsed.data.busId, session.userId, session.roleKey);
  if (!bus) return { ok: false, message: "Bus not found or not assigned to you." };

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_LOCATION_UPDATE",
      entityType: "Bus",
      entityId: parsed.data.busId,
      metadataJson: JSON.stringify({
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        speedKph: parsed.data.speedKph,
        headingDeg: parsed.data.headingDeg,
        note: parsed.data.note,
        source: "manual",
        at: new Date().toISOString(),
        byUserId: session.userId
      })
    }
  });

  revalidatePath("/transport");
  return { ok: true, message: "Live location updated." };
}
