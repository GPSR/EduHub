"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/db";

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

export async function createBusAction(_prev: TransportState, formData: FormData): Promise<TransportState> {
  const { session } = await requirePermission("TRANSPORT", "EDIT");
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

  const bus = await prisma.bus.findFirst({ where: { id: parsed.data.busId, schoolId: session.schoolId }, select: { id: true } });
  if (!bus) return { ok: false, message: "Bus not found." };

  if (session.roleKey === "BUS_ASSISTANT") {
    const assignment = await prisma.busDriverAssignment.findFirst({
      where: { schoolId: session.schoolId, userId: session.userId, busId: parsed.data.busId },
      select: { id: true }
    });
    if (!assignment) return { ok: false, message: "You can only update your assigned bus." };
  }

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
