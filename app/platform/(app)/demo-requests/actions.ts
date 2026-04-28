"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";

const UpdateDemoRequestSchema = z.object({
  requestId: z.string().cuid("Invalid request identifier."),
  status: z.enum(["NEW", "CONTACTED", "CLOSED", "NOT_AVAILABLE"], { message: "Invalid request status." }),
  note: z
    .string()
    .max(500, "Note is too long.")
    .optional()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : null;
    }),
});

export async function updateDemoRequestAction(formData: FormData) {
  const { user } = await requirePlatformUser();

  const parsed = UpdateDemoRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return;
  }

  await db.demoRequest.updateMany({
    where: {
      id: parsed.data.requestId,
      reviewedAt: null,
    },
    data: {
      status: parsed.data.status,
      note: parsed.data.note,
      reviewedByPlatformUserId: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/platform/demo-requests");
  revalidatePath("/platform");
}
