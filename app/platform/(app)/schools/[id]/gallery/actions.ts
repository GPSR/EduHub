"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlatformSchoolAccess } from "@/lib/platform-require";
import { saveUploadedImage } from "@/lib/uploads";

const CreatePlatformGalleryFolderSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(220).optional(),
  roleIds: z.array(z.string()).default([])
});

const UploadPlatformGalleryItemSchema = z.object({
  schoolId: z.string().min(1),
  folderId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  caption: z.string().trim().max(600).optional()
});

export async function createPlatformGalleryFolderAction(formData: FormData) {
  const parsed = CreatePlatformGalleryFolderSchema.safeParse({
    schoolId: formData.get("schoolId"),
    name: formData.get("name"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    roleIds: formData
      .getAll("roleIds")
      .map((value) => String(value))
      .filter(Boolean)
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const { session } = await requirePlatformSchoolAccess(parsed.data.schoolId);

  const uniqueRoleIds = [...new Set(parsed.data.roleIds)];
  const validRoleIds = uniqueRoleIds.length
    ? (
        await prisma.schoolRole.findMany({
          where: {
            schoolId: parsed.data.schoolId,
            id: { in: uniqueRoleIds }
          },
          select: { id: true }
        })
      ).map((role) => role.id)
    : [];

  const folder = await prisma.schoolGalleryFolder.create({
    data: {
      schoolId: parsed.data.schoolId,
      name: parsed.data.name,
      description: parsed.data.description,
      source: "PLATFORM",
      createdByPlatformUserId: session.platformUserId,
      roleAccess: validRoleIds.length
        ? {
            createMany: {
              data: validRoleIds.map((schoolRoleId) => ({
                schoolId: parsed.data.schoolId,
                schoolRoleId
              }))
            }
          }
        : undefined
    },
    select: { id: true }
  });

  redirect(`/platform/schools/${encodeURIComponent(parsed.data.schoolId)}/gallery?folderId=${encodeURIComponent(folder.id)}`);
}

export async function uploadPlatformGalleryItemAction(formData: FormData) {
  const parsed = UploadPlatformGalleryItemSchema.safeParse({
    schoolId: formData.get("schoolId"),
    folderId: formData.get("folderId"),
    title: formData.get("title"),
    caption: String(formData.get("caption") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const { session } = await requirePlatformSchoolAccess(parsed.data.schoolId);

  const folder = await prisma.schoolGalleryFolder.findFirst({
    where: {
      id: parsed.data.folderId,
      schoolId: parsed.data.schoolId,
      isActive: true
    },
    select: { id: true }
  });
  if (!folder) throw new Error("Folder not found.");

  const file = formData.get("image");
  if (!(file instanceof File)) throw new Error("Please upload an image.");

  const saved = await saveUploadedImage({
    file,
    folder: `schools/${parsed.data.schoolId}/gallery`,
    prefix: "platform-gallery"
  });
  if (!saved.ok) throw new Error(saved.message);

  await prisma.schoolGalleryItem.create({
    data: {
      schoolId: parsed.data.schoolId,
      folderId: folder.id,
      title: parsed.data.title,
      caption: parsed.data.caption,
      imageUrl: saved.url,
      createdByPlatformUserId: session.platformUserId
    }
  });

  redirect(`/platform/schools/${encodeURIComponent(parsed.data.schoolId)}/gallery?folderId=${encodeURIComponent(folder.id)}`);
}
