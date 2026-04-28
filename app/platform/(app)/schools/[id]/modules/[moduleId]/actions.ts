"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

export type SchoolModuleFieldState = { ok: boolean; message?: string };

const SaveSchema = z.object({
  schoolId: z.string().min(1),
  moduleId: z.string().min(1)
});

export async function saveSchoolModuleFieldSettingsAction(
  _prev: SchoolModuleFieldState,
  formData: FormData
): Promise<SchoolModuleFieldState> {
  const { session } = await requireSuperAdmin();

  const parsed = SaveSchema.safeParse({
    schoolId: formData.get("schoolId"),
    moduleId: formData.get("moduleId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const fields = await db.moduleField.findMany({
    where: { moduleId: parsed.data.moduleId, isActive: true },
    select: { id: true }
  });

  await db.$transaction(async (tx) => {
    for (const field of fields) {
      const enabled = formData.get(`enabled_${field.id}`) ? true : false;
      const required = formData.get(`required_${field.id}`) ? true : false;
      const label = String(formData.get(`label_${field.id}`) ?? "").trim();
      const optionsCsv = String(formData.get(`options_${field.id}`) ?? "").trim();
      const options = optionsCsv
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const optionsOverrideJson = options.length ? JSON.stringify(options) : null;

      await tx.schoolModuleField.upsert({
        where: { schoolId_moduleFieldId: { schoolId: parsed.data.schoolId, moduleFieldId: field.id } },
        update: {
          enabled,
          isRequired: required,
          labelOverride: label || null,
          optionsOverrideJson
        },
        create: {
          schoolId: parsed.data.schoolId,
          moduleFieldId: field.id,
          enabled,
          isRequired: required,
          labelOverride: label || null,
          optionsOverrideJson
        }
      });
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_SCHOOL_MODULE_FIELDS_UPDATED",
    entityType: "School",
    entityId: parsed.data.schoolId,
    schoolId: parsed.data.schoolId,
    metadata: { moduleId: parsed.data.moduleId }
  });

  revalidatePath(`/platform/schools/${parsed.data.schoolId}/modules/${parsed.data.moduleId}`);
  revalidatePath(`/platform/schools/${parsed.data.schoolId}`);
  return { ok: true, message: "School field settings saved." };
}
