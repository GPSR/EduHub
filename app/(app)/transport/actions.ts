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
      body: `Live tracking is now available.\nLINK:/transport?busId=${encodeURIComponent(busId)}`
    }))
  });
}

async function notifyParentsOnStudentDrop(args: {
  schoolId: string;
  busId: string;
  busName: string;
  studentId: string;
  studentName: string;
  lat?: number;
  lng?: number;
}) {
  const student = await prisma.student.findFirst({
    where: { id: args.studentId, schoolId: args.schoolId },
    select: { parents: { select: { userId: true } } }
  });
  if (!student?.parents?.length) return;
  const mapUrl =
    typeof args.lat === "number" && typeof args.lng === "number"
      ? `https://maps.google.com/?q=${args.lat},${args.lng}`
      : null;
  await prisma.notification.createMany({
    data: student.parents.map((p) => ({
      schoolId: args.schoolId,
      userId: p.userId,
      title: `Drop completed: ${args.studentName}`,
      body: mapUrl
        ? `${args.busName} marked drop at location.\n${mapUrl}\nLINK:/transport?busId=${encodeURIComponent(args.busId)}`
        : `${args.busName} marked drop completed.\nLINK:/transport?busId=${encodeURIComponent(args.busId)}`
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

  const tripToken = `${Date.now()}-${session.userId.slice(0, 8)}`;
  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_TRIP_STATUS",
      entityType: "Bus",
      entityId: parsed.data.busId,
      metadataJson: JSON.stringify({ status: "STARTED", tripToken, at: new Date().toISOString() })
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

const DropStudentSchema = z.object({
  busId: z.string().min(1),
  studentId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional()
});

export async function markStudentDropAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");

  const parsed = DropStudentSchema.safeParse({
    busId: formData.get("busId"),
    studentId: formData.get("studentId"),
    lat: String(formData.get("lat") ?? "").trim() ? formData.get("lat") : undefined,
    lng: String(formData.get("lng") ?? "").trim() ? formData.get("lng") : undefined
  });
  if (!parsed.success) return { ok: false, message: "Invalid drop details." };

  const bus = await ensureBusAllowed(session.schoolId, parsed.data.busId, session.userId, session.roleKey);
  if (!bus) return { ok: false, message: "Bus not found or not assigned to you." };

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: session.schoolId },
    select: { id: true, fullName: true, transportDetails: true }
  });
  if (!student) return { ok: false, message: "Student not found." };
  if (!student.transportDetails?.includes(`\"busId\":\"${parsed.data.busId}\"`)) {
    return { ok: false, message: "Student is not assigned to selected bus." };
  }

  const latestTrip = await prisma.auditLog.findFirst({
    where: { schoolId: session.schoolId, action: "BUS_TRIP_STATUS", entityType: "Bus", entityId: parsed.data.busId },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  let tripToken: string | null = null;
  if (latestTrip?.metadataJson) {
    try {
      const meta = JSON.parse(latestTrip.metadataJson) as { status?: unknown; tripToken?: unknown };
      if (meta.status === "STARTED" && typeof meta.tripToken === "string" && meta.tripToken) tripToken = meta.tripToken;
    } catch {
      tripToken = null;
    }
  }
  if (!tripToken) return { ok: false, message: "No active trip found for selected bus." };

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "BUS_STUDENT_DROP",
      entityType: "Bus",
      entityId: parsed.data.busId,
      metadataJson: JSON.stringify({
        studentId: student.id,
        tripToken,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        at: new Date().toISOString(),
        byUserId: session.userId
      })
    }
  });

  await notifyParentsOnStudentDrop({
    schoolId: session.schoolId,
    busId: parsed.data.busId,
    busName: bus.name,
    studentId: student.id,
    studentName: student.fullName,
    lat: parsed.data.lat,
    lng: parsed.data.lng
  });

  const assignedStudents = await prisma.student.findMany({
    where: {
      schoolId: session.schoolId,
      transportDetails: { startsWith: "BUS_ASSIGN:" }
    },
    select: { id: true, transportDetails: true }
  });
  const assignedIds = assignedStudents
    .filter((s) => s.transportDetails?.includes(`\"busId\":\"${parsed.data.busId}\"`))
    .map((s) => s.id);

  if (assignedIds.length > 0) {
    const dropLogs = await prisma.auditLog.findMany({
      where: {
        schoolId: session.schoolId,
        action: "BUS_STUDENT_DROP",
        entityType: "Bus",
        entityId: parsed.data.busId
      },
      orderBy: { createdAt: "desc" },
      select: { metadataJson: true }
    });
    const dropped = new Set<string>();
    for (const log of dropLogs) {
      if (!log.metadataJson) continue;
      try {
        const meta = JSON.parse(log.metadataJson) as { studentId?: unknown; tripToken?: unknown };
        if (meta.tripToken !== tripToken || typeof meta.studentId !== "string") continue;
        dropped.add(meta.studentId);
      } catch {
        continue;
      }
    }
    const remaining = assignedIds.filter((id) => !dropped.has(id));
    if (remaining.length === 0) {
      await prisma.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorType: "SCHOOL_USER",
          actorId: session.userId,
          action: "BUS_TRIP_STATUS",
          entityType: "Bus",
          entityId: parsed.data.busId,
          metadataJson: JSON.stringify({ status: "ENDED", tripToken, at: new Date().toISOString(), reason: "all_students_dropped" })
        }
      });
      revalidatePath("/transport");
      return { ok: true, message: "Student drop marked. All assigned students dropped; trip auto-ended." };
    }
  }

  revalidatePath("/transport");
  return { ok: true, message: "Student drop marked and parents notified." };
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
