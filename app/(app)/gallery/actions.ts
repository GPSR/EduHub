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
  title: z.string().trim().min(2).max(120).optional(),
  caption: z.string().trim().max(600).optional()
});

const MAX_GALLERY_UPLOAD_FILES = 20;

function titleFromFileName(fileName: string) {
  const fallback = "Gallery image";
  const normalized = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 2) return fallback;
  return normalized.slice(0, 120);
}

function resolveItemTitle({
  explicitTitle,
  fileName,
  index,
  total
}: {
  explicitTitle?: string;
  fileName: string;
  index: number;
  total: number;
}) {
  const trimmed = explicitTitle?.trim() ?? "";
  if (!trimmed) return titleFromFileName(fileName);

  if (total === 1) return trimmed.slice(0, 120);

  const suffix = ` ${index + 1}`;
  const maxBase = Math.max(2, 120 - suffix.length);
  return `${trimmed.slice(0, maxBase)}${suffix}`;
}

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
    title: String(formData.get("title") ?? "").trim() || undefined,
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

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) {
    const single = formData.get("image");
    if (single instanceof File && single.size > 0) files.push(single);
  }

  if (files.length === 0) throw new Error("Please upload at least one image.");
  if (files.length > MAX_GALLERY_UPLOAD_FILES) {
    throw new Error(`Please upload up to ${MAX_GALLERY_UPLOAD_FILES} images at a time.`);
  }

  const createData: Array<{
    schoolId: string;
    folderId: string;
    title: string;
    caption?: string;
    imageUrl: string;
    createdByUserId: string;
  }> = [];

  for (const [index, file] of files.entries()) {
    const saved = await saveUploadedImage({
      file,
      folder: `schools/${session.schoolId}/gallery`,
      prefix: "gallery"
    });
    if (!saved.ok) throw new Error(`${file.name}: ${saved.message}`);

    createData.push({
      schoolId: session.schoolId,
      folderId: folder.id,
      title: resolveItemTitle({
        explicitTitle: parsed.data.title,
        fileName: file.name,
        index,
        total: files.length
      }),
      caption: parsed.data.caption,
      imageUrl: saved.url,
      createdByUserId: session.userId
    });
  }

  await prisma.schoolGalleryItem.createMany({
    data: createData.map((item) => ({
      schoolId: item.schoolId,
      folderId: item.folderId,
      title: item.title,
      caption: item.caption,
      imageUrl: item.imageUrl,
      createdByUserId: item.createdByUserId
    }))
  });

  redirect(`/gallery?folderId=${encodeURIComponent(folder.id)}`);
}
