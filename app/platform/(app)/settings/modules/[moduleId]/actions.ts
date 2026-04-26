"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { applyIndustryModuleTemplates } from "@/lib/module-industry-templates";

export type ModuleFieldState = { ok: boolean; message?: string };
export type ModuleTemplateState = { ok: boolean; message?: string };

const FieldSchema = z.object({
  moduleId: z.string().min(1),
  label: z.string().trim().min(2).max(64),
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Field key must be uppercase letters/numbers/underscore."),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "DROPDOWN", "CHECKBOX", "TEXTAREA"]),
  optionsCsv: z.string().optional(),
  isRequired: z.coerce.boolean().optional()
});

export async function addModuleFieldAction(_prev: ModuleFieldState, formData: FormData): Promise<ModuleFieldState> {
  const { session } = await requireSuperAdmin();
  const parsed = FieldSchema.safeParse({
    moduleId: formData.get("moduleId"),
    label: formData.get("label"),
    key: formData.get("key"),
    fieldType: formData.get("fieldType"),
    optionsCsv: formData.get("optionsCsv"),
    isRequired: formData.get("isRequired") ? true : false
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const module = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!module) return { ok: false, message: "Module not found." };

  const duplicate = await prisma.moduleField.findFirst({
    where: { moduleId: parsed.data.moduleId, key: parsed.data.key },
    select: { id: true }
  });
  if (duplicate) return { ok: false, message: "Field key already exists in this module." };

  const isDropdown = parsed.data.fieldType === "DROPDOWN";
  const options = (parsed.data.optionsCsv ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (isDropdown && options.length < 2) {
    return { ok: false, message: "Dropdown needs at least 2 options (comma separated)." };
  }

  const maxOrder = await prisma.moduleField.aggregate({
    where: { moduleId: parsed.data.moduleId },
    _max: { sortOrder: true }
  });

  await prisma.moduleField.create({
    data: {
      moduleId: parsed.data.moduleId,
      label: parsed.data.label,
      key: parsed.data.key,
      fieldType: parsed.data.fieldType,
      optionsJson: isDropdown ? JSON.stringify(options) : null,
      isRequired: Boolean(parsed.data.isRequired),
      isActive: true,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1
    }
  });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_MODULE_FIELD_ADDED",
    entityType: "Module",
    entityId: parsed.data.moduleId,
    metadata: { key: parsed.data.key, label: parsed.data.label, fieldType: parsed.data.fieldType }
  });

  revalidatePath(`/platform/settings/modules/${parsed.data.moduleId}`);
  revalidatePath("/platform/settings");
  return { ok: true, message: "Field added." };
}

const DeleteFieldSchema = z.object({
  moduleId: z.string().min(1),
  fieldId: z.string().min(1)
});

export async function deleteModuleFieldAction(formData: FormData) {
  const { session } = await requireSuperAdmin();
  const parsed = DeleteFieldSchema.safeParse({
    moduleId: formData.get("moduleId"),
    fieldId: formData.get("fieldId")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const field = await prisma.moduleField.findFirst({
    where: { id: parsed.data.fieldId, moduleId: parsed.data.moduleId }
  });
  if (!field) throw new Error("Unable to process request.");

  await prisma.moduleField.delete({ where: { id: field.id } });

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_MODULE_FIELD_REMOVED",
    entityType: "ModuleField",
    entityId: field.id,
    metadata: { moduleId: parsed.data.moduleId, key: field.key, label: field.label }
  });

  revalidatePath(`/platform/settings/modules/${parsed.data.moduleId}`);
  revalidatePath("/platform/settings");
}

const ApplyModuleTemplateSchema = z.object({
  moduleId: z.string().min(1)
});

export async function applyModuleIndustryTemplateAction(
  _prev: ModuleTemplateState,
  formData: FormData
): Promise<ModuleTemplateState> {
  const { session } = await requireSuperAdmin();
  const parsed = ApplyModuleTemplateSchema.safeParse({
    moduleId: formData.get("moduleId")
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const module = await prisma.module.findUnique({
    where: { id: parsed.data.moduleId },
    select: { id: true, key: true, name: true }
  });
  if (!module) return { ok: false, message: "Module not found." };

  const result = await applyIndustryModuleTemplates({ moduleKeys: [module.key] });
  const moduleSummary = result.details.find((item) => item.moduleId === module.id);

  if (!moduleSummary) {
    return {
      ok: false,
      message: `No industry template is defined for ${module.name} (${module.key}) yet.`
    };
  }

  await auditLog({
    actor: { type: "PLATFORM_USER", id: session.platformUserId },
    action: "PLATFORM_MODULE_TEMPLATE_APPLIED",
    entityType: "Module",
    entityId: module.id,
    metadata: {
      moduleKey: module.key,
      createdFields: moduleSummary.createdFields,
      reactivatedFields: moduleSummary.reactivatedFields,
      skippedFields: moduleSummary.skippedFields
    }
  });

  revalidatePath(`/platform/settings/modules/${module.id}`);
  revalidatePath("/platform/settings");

  return {
    ok: true,
    message: `Applied template to ${module.name}: ${moduleSummary.createdFields} field(s) added, ${moduleSummary.reactivatedFields} reactivated, ${moduleSummary.skippedFields} already present.`
  };
}
