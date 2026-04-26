"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBaseModules } from "@/lib/permissions";
import { deleteUploadedImageByUrl, LOGO_MAX_IMAGE_BYTES, saveUploadedImage } from "@/lib/uploads";
import { normalizeTemplate } from "@/lib/id-card-template";
import {
  getSchoolStudentDemographicsConfig,
  normalizeStudentDemographicsConfig
} from "@/lib/student-demographics";
import { getSchoolProfile, normalizeSchoolProfile } from "@/lib/school-profile";
import { getSchoolSupportChatTopics, normalizeSupportChatTopics } from "@/lib/support-chat-topics";

export type SettingsState = { ok: boolean; message?: string };

const Schema = z.object({
  studentIdFormat: z.string().min(1).max(64),
  admissionNoFormat: z.string().min(1).max(64),
  idSequencePad: z.coerce.number().int().min(0).max(10),
  studentIdNext: z.coerce.number().int().min(1).max(1_000_000),
  admissionNoNext: z.coerce.number().int().min(1).max(1_000_000)
});

export async function updateIdSettingsAction(_prevState: SettingsState, formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = Schema.safeParse({
    studentIdFormat: formData.get("studentIdFormat"),
    admissionNoFormat: formData.get("admissionNoFormat"),
    idSequencePad: formData.get("idSequencePad"),
    studentIdNext: formData.get("studentIdNext"),
    admissionNoNext: formData.get("admissionNoNext")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const current = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: {
      studentIdFormat: true,
      admissionNoFormat: true,
      idSequencePad: true,
      studentIdNext: true,
      admissionNoNext: true
    }
  });
  if (!current) throw new Error("Unable to process request.");

  const changed =
    current.studentIdFormat !== parsed.data.studentIdFormat ||
    current.admissionNoFormat !== parsed.data.admissionNoFormat ||
    current.idSequencePad !== parsed.data.idSequencePad ||
    current.studentIdNext !== parsed.data.studentIdNext ||
    current.admissionNoNext !== parsed.data.admissionNoNext;

  if (!changed) return { ok: false, message: "No changes to save." } satisfies SettingsState;

  await prisma.school.update({ where: { id: session.schoolId }, data: parsed.data });

  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved." } satisfies SettingsState;
}

const CreateRoleSchema = z.object({
  name: z.string().min(2).max(40)
});

function toRoleKey(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return base.length ? base : "ROLE";
}

export async function createRoleAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = CreateRoleSchema.safeParse({
    name: formData.get("name")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const baseKey = toRoleKey(parsed.data.name);
  let key = baseKey;
  for (let i = 2; i < 100; i++) {
    const exists = await prisma.schoolRole.findFirst({
      where: { schoolId: session.schoolId, key }
    });
    if (!exists) break;
    key = `${baseKey}_${i}`;
  }

  const role = await prisma.schoolRole.create({ data: { schoolId: session.schoolId, name: parsed.data.name, key, isSystem: false } });

  redirect(`/admin/settings?roleId=${encodeURIComponent(role.id)}`);
}

const RenameRoleSchema = z.object({
  roleId: z.string().min(1),
  newName: z.string().min(2).max(40)
});

export async function renameRoleAction(_prevState: SettingsState, formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = RenameRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    newName: formData.get("newName")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const role = await prisma.schoolRole.findFirst({
    where: { id: parsed.data.roleId, schoolId: session.schoolId }
  });
  if (!role) throw new Error("Unable to process request.");
  if (role.key === "ADMIN") throw new Error("Admin role name cannot be changed.");
  if (role.name === parsed.data.newName) return { ok: false, message: "No changes to save." } satisfies SettingsState;

  await prisma.schoolRole.update({
    where: { id: role.id },
    data: { name: parsed.data.newName }
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved." } satisfies SettingsState;
}

const DeleteRoleSchema = z.object({ roleId: z.string().min(1) });

export async function deleteRoleAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = DeleteRoleSchema.safeParse({ roleId: formData.get("roleId") });
  if (!parsed.success) throw new Error("Unable to process request.");

  const role = await prisma.schoolRole.findFirst({
    where: { id: parsed.data.roleId, schoolId: session.schoolId }
  });
  if (!role) redirect("/admin/settings");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");

  const usersCount = await prisma.user.count({ where: { schoolId: session.schoolId, schoolRoleId: role.id } });
  const invitesCount = await prisma.schoolInvite.count({ where: { schoolId: session.schoolId, schoolRoleId: role.id } });
  if (usersCount > 0 || invitesCount > 0) throw new Error("Role is in use and cannot be deleted.");

  await prisma.roleModulePermission.deleteMany({ where: { schoolId: session.schoolId, schoolRoleId: role.id } });
  await prisma.schoolRole.delete({ where: { id: role.id } });

  redirect("/admin/settings");
}

const CreateClassSchema = z.object({
  name: z.string().min(1).max(40),
  section: z.string().max(20).optional()
});

export async function createClassConfigAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = CreateClassSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    section: String(formData.get("section") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  await prisma.class.upsert({
    where: {
      schoolId_name_section: {
        schoolId: session.schoolId,
        name: parsed.data.name,
        section: parsed.data.section ?? ""
      }
    },
    update: {},
    create: {
      schoolId: session.schoolId,
      name: parsed.data.name,
      section: parsed.data.section ?? ""
    }
  });

  redirect("/admin/settings");
}

const DeleteClassSchema = z.object({ classId: z.string().min(1) });

export async function deleteClassConfigAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = DeleteClassSchema.safeParse({ classId: formData.get("classId") });
  if (!parsed.success) throw new Error("Unable to process request.");

  const cls = await prisma.class.findFirst({
    where: { id: parsed.data.classId, schoolId: session.schoolId },
    select: { id: true }
  });
  if (!cls) redirect("/admin/settings");

  const studentsCount = await prisma.student.count({ where: { schoolId: session.schoolId, classId: cls.id } });
  if (studentsCount > 0) throw new Error("Class has students and cannot be deleted.");

  await prisma.class.delete({ where: { id: cls.id } });
  redirect("/admin/settings");
}

export async function uploadSchoolLogoAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const basePath = "/admin/settings";
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${basePath}?logoUploadStatus=error&logoUploadMessage=${encodeURIComponent("Please choose a logo image.")}`);
  }

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { brandingLogoUrl: true }
  });
  if (!school) redirect(`${basePath}?logoUploadStatus=error&logoUploadMessage=${encodeURIComponent("School not found.")}`);

  const saved = await saveUploadedImage({
    file,
    folder: `schools/${session.schoolId}`,
    prefix: "logo",
    maxBytes: LOGO_MAX_IMAGE_BYTES
  });
  if (!saved.ok) {
    redirect(`${basePath}?logoUploadStatus=error&logoUploadMessage=${encodeURIComponent(saved.message)}`);
  }

  await prisma.school.update({
    where: { id: session.schoolId },
    data: { brandingLogoUrl: saved.url }
  });

  await deleteUploadedImageByUrl(school.brandingLogoUrl);
  redirect(`${basePath}?logoUploadStatus=success`);
}

export async function saveIdCardTemplateAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const template = normalizeTemplate({
    schoolLabel: String(formData.get("schoolLabel") ?? ""),
    headerText: String(formData.get("headerText") ?? ""),
    footerText: String(formData.get("footerText") ?? ""),
    background: String(formData.get("background") ?? ""),
    accent: String(formData.get("accent") ?? ""),
    textColor: String(formData.get("textColor") ?? ""),
    showPhoto: Boolean(formData.get("showPhoto")),
    showParent: Boolean(formData.get("showParent")),
    showGuardian: Boolean(formData.get("showGuardian"))
  });

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "ID_CARD_TEMPLATE_UPDATE",
      entityType: "School",
      entityId: session.schoolId,
      metadataJson: JSON.stringify(template)
    }
  });

  redirect("/admin/settings");
}

export async function updateSchoolModulesAction(_prevState: SettingsState, formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  await ensureBaseModules();

  const allModules = await prisma.module.findMany({ select: { id: true } });
  const enabled = new Set(
    formData
      .getAll("enabledModuleIds")
      .map((v) => String(v))
      .filter(Boolean)
  );

  const current = await prisma.schoolModule.findMany({
    where: { schoolId: session.schoolId },
    select: { moduleId: true, enabled: true }
  });
  const currentByModuleId = new Map(current.map((m) => [m.moduleId, m.enabled]));
  const changed = allModules.some((m) => (currentByModuleId.get(m.id) ?? false) !== enabled.has(m.id));
  if (!changed) return { ok: false, message: "No changes to save." } satisfies SettingsState;

  await prisma.$transaction(async (tx) => {
    for (const m of allModules) {
      await tx.schoolModule.upsert({
        where: { schoolId_moduleId: { schoolId: session.schoolId, moduleId: m.id } },
        update: { enabled: enabled.has(m.id) },
        create: { schoolId: session.schoolId, moduleId: m.id, enabled: enabled.has(m.id) }
      });
    }
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved." } satisfies SettingsState;
}

const DemographicsConfigSchema = z.object({
  genders: z.string().max(1000).optional().default(""),
  bloodGroups: z.string().max(1000).optional().default("")
});

export async function updateStudentDemographicsConfigAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = DemographicsConfigSchema.safeParse({
    genders: String(formData.get("genders") ?? ""),
    bloodGroups: String(formData.get("bloodGroups") ?? "")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const current = await getSchoolStudentDemographicsConfig(session.schoolId);
  const next = normalizeStudentDemographicsConfig({
    genders: parsed.data.genders,
    bloodGroups: parsed.data.bloodGroups
  });
  if (JSON.stringify(current) === JSON.stringify(next)) redirect("/admin/settings");

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "STUDENT_DEMOGRAPHICS_CONFIG_UPDATE",
      entityType: "School",
      entityId: session.schoolId,
      metadataJson: JSON.stringify(next)
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/students/new");
  redirect("/admin/settings");
}

const SchoolProfileSchema = z.object({
  address: z.string().max(300).optional().default("")
});

export async function updateSchoolProfileAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = SchoolProfileSchema.safeParse({
    address: String(formData.get("address") ?? "")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const current = await getSchoolProfile(session.schoolId);
  const next = normalizeSchoolProfile({ address: parsed.data.address });
  if (JSON.stringify(current) === JSON.stringify(next)) redirect("/admin/settings");

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "SCHOOL_PROFILE_UPDATE",
      entityType: "School",
      entityId: session.schoolId,
      metadataJson: JSON.stringify(next)
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/students");
  redirect("/admin/settings");
}

const SupportChatTopicsSchema = z.object({
  topics: z.string().max(2200).optional().default("")
});

export async function updateSupportChatTopicsAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const parsed = SupportChatTopicsSchema.safeParse({
    topics: String(formData.get("topics") ?? "")
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const current = await getSchoolSupportChatTopics(session.schoolId);
  const next = normalizeSupportChatTopics(parsed.data.topics);
  if (JSON.stringify(current) === JSON.stringify(next)) redirect("/admin/settings");

  await prisma.auditLog.create({
    data: {
      schoolId: session.schoolId,
      actorType: "SCHOOL_USER",
      actorId: session.userId,
      action: "SUPPORT_CHAT_TOPICS_CONFIG_UPDATE",
      entityType: "School",
      entityId: session.schoolId,
      metadataJson: JSON.stringify({ topics: next })
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/support");
  redirect("/admin/settings");
}

// Role-module permission editing intentionally omitted (role list CRUD only).
