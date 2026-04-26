"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { atLeastLevel } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { saveUploadedImage } from "@/lib/uploads";

const CreateGalleryFolderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(220).optional(),
  roleIds: z.array(z.string()).default([])
});

const UploadGalleryItemSchema = z.object({
  folderId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  caption: z.string().trim().max(600).optional()
});

export async function createGalleryFolderAction(formData: FormData) {
  const { session, level } = await requirePermission("GALLERY", "EDIT");
  if (!atLeastLevel(level, "APPROVE") && session.roleKey !== "ADMIN") {
    throw new Error("Only admins and approvers can create gallery folders.");
  }

  const parsed = CreateGalleryFolderSchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    roleIds: formData
      .getAll("roleIds")
      .map((value) => String(value))
      .filter(Boolean)
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const uniqueRoleIds = [...new Set(parsed.data.roleIds)];
  const validRoleIds = uniqueRoleIds.length
    ? (
        await prisma.schoolRole.findMany({
          where: {
            schoolId: session.schoolId,
            id: { in: uniqueRoleIds }
          },
          select: { id: true }
        })
      ).map((role) => role.id)
    : [];

  const folder = await prisma.schoolGalleryFolder.create({
    data: {
      schoolId: session.schoolId,
      name: parsed.data.name,
      description: parsed.data.description,
      source: "SCHOOL",
      createdByUserId: session.userId,
      roleAccess: validRoleIds.length
        ? {
            createMany: {
              data: validRoleIds.map((schoolRoleId) => ({
                schoolId: session.schoolId,
                schoolRoleId
              }))
            }
          }
        : undefined
    },
    select: { id: true }
  });

  redirect(`/gallery?folderId=${encodeURIComponent(folder.id)}`);
}

export async function uploadGalleryItemAction(formData: FormData) {
  const { session } = await requirePermission("GALLERY", "EDIT");

  const parsed = UploadGalleryItemSchema.safeParse({
    folderId: formData.get("folderId"),
    title: formData.get("title"),
    caption: String(formData.get("caption") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to process request.");

  const folder = await prisma.schoolGalleryFolder.findFirst({
    where: {
      id: parsed.data.folderId,
      schoolId: session.schoolId,
      isActive: true
    },
    select: {
      id: true,
      roleAccess: { select: { schoolRoleId: true } }
    }
  });
  if (!folder) throw new Error("Folder not found.");

  const canAccessFolder =
    session.roleKey === "ADMIN" ||
    folder.roleAccess.length === 0 ||
    folder.roleAccess.some((access) => access.schoolRoleId === session.roleId);

  if (!canAccessFolder) {
    throw new Error("You do not have permission to upload to this folder.");
  }

  const file = formData.get("image");
  if (!(file instanceof File)) throw new Error("Please upload an image.");

  const saved = await saveUploadedImage({
    file,
    folder: `schools/${session.schoolId}/gallery`,
    prefix: "gallery"
  });
  if (!saved.ok) throw new Error(saved.message);

  await prisma.schoolGalleryItem.create({
    data: {
      schoolId: session.schoolId,
      folderId: folder.id,
      title: parsed.data.title,
      caption: parsed.data.caption,
      imageUrl: saved.url,
      createdByUserId: session.userId
    }
  });

  redirect(`/gallery?folderId=${encodeURIComponent(folder.id)}`);
}
