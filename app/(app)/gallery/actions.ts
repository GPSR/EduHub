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

function redirectGalleryUploadResult({
  folderId,
  status,
  message
}: {
  folderId?: string;
  status: "success" | "error";
  message?: string;
}): never {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  params.set("uploadStatus", status);
  if (message) params.set("uploadMessage", message);
  redirect(`/gallery?${params.toString()}`);
}

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
  const requestedFolderId = String(formData.get("folderId") ?? "") || undefined;

  if (session.roleKey !== "ADMIN") {
    redirectGalleryUploadResult({
      folderId: requestedFolderId,
      status: "error",
      message: "Only school admin can upload gallery photos."
    });
  }

  const parsed = UploadGalleryItemSchema.safeParse({
    folderId: formData.get("folderId"),
    title: String(formData.get("title") ?? "").trim() || undefined,
    caption: String(formData.get("caption") ?? "").trim() || undefined
  });
  if (!parsed.success) {
    redirectGalleryUploadResult({
      folderId: requestedFolderId,
      status: "error",
      message: "Please check folder and upload input."
    });
  }

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
  if (!folder) {
    redirectGalleryUploadResult({
      folderId: requestedFolderId,
      status: "error",
      message: "Folder not found."
    });
  }

  const canAccessFolder =
    session.roleKey === "ADMIN" ||
    folder.roleAccess.length === 0 ||
    folder.roleAccess.some((access) => access.schoolRoleId === session.roleId);

  if (!canAccessFolder) {
    redirectGalleryUploadResult({
      folderId: requestedFolderId,
      status: "error",
      message: "You do not have permission to upload to this folder."
    });
  }

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) {
    const single = formData.get("image");
    if (single instanceof File && single.size > 0) files.push(single);
  }

  if (files.length === 0) {
    redirectGalleryUploadResult({
      folderId: folder.id,
      status: "error",
      message: "Please upload at least one image."
    });
  }

  let uploadedCount = 0;
  for (const [index, file] of files.entries()) {
    const saved = await saveUploadedImage({
      file,
      folder: `schools/${session.schoolId}/gallery`,
      prefix: "gallery",
      maxBytes: null
    });
    if (!saved.ok) {
      redirectGalleryUploadResult({
        folderId: folder.id,
        status: "error",
        message: `${file.name}: ${saved.message}`
      });
    }

    await prisma.schoolGalleryItem.create({
      data: {
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
      }
    });
    uploadedCount += 1;
  }

  redirectGalleryUploadResult({
    folderId: folder.id,
    status: "success",
    message: `Uploaded ${uploadedCount} image${uploadedCount === 1 ? "" : "s"} successfully.`
  });
}
