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
  title: z.string().trim().min(2).max(120).optional(),
  caption: z.string().trim().max(600).optional()
});

function redirectPlatformGalleryUploadResult({
  schoolId,
  folderId,
  status,
  message
}: {
  schoolId?: string;
  folderId?: string;
  status: "success" | "error";
  message?: string;
}): never {
  if (!schoolId) {
    redirect("/platform/gallery");
  }
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  params.set("uploadStatus", status);
  if (message) params.set("uploadMessage", message);
  redirect(`/platform/schools/${encodeURIComponent(schoolId)}/gallery?${params.toString()}`);
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
  const requestedSchoolId = String(formData.get("schoolId") ?? "") || undefined;
  const requestedFolderId = String(formData.get("folderId") ?? "") || undefined;

  const parsed = UploadPlatformGalleryItemSchema.safeParse({
    schoolId: formData.get("schoolId"),
    folderId: formData.get("folderId"),
    title: String(formData.get("title") ?? "").trim() || undefined,
    caption: String(formData.get("caption") ?? "").trim() || undefined
  });
  if (!parsed.success) {
    redirectPlatformGalleryUploadResult({
      schoolId: requestedSchoolId,
      folderId: requestedFolderId,
      status: "error",
      message: "Please check folder and upload input."
    });
  }

  const { session, user } = await requirePlatformSchoolAccess(parsed.data.schoolId);
  if (user.role !== "SUPER_ADMIN") {
    redirectPlatformGalleryUploadResult({
      schoolId: parsed.data.schoolId,
      folderId: parsed.data.folderId,
      status: "error",
      message: "Only platform super admin can upload photos."
    });
  }

  const folder = await prisma.schoolGalleryFolder.findFirst({
    where: {
      id: parsed.data.folderId,
      schoolId: parsed.data.schoolId,
      isActive: true
    },
    select: { id: true }
  });
  if (!folder) {
    redirectPlatformGalleryUploadResult({
      schoolId: parsed.data.schoolId,
      folderId: parsed.data.folderId,
      status: "error",
      message: "Folder not found."
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
    redirectPlatformGalleryUploadResult({
      schoolId: parsed.data.schoolId,
      folderId: folder.id,
      status: "error",
      message: "Please upload at least one image."
    });
  }

  let uploadedCount = 0;
  for (const [index, file] of files.entries()) {
    const saved = await saveUploadedImage({
      file,
      folder: `schools/${parsed.data.schoolId}/gallery`,
      prefix: "platform-gallery",
      maxBytes: null
    });
    if (!saved.ok) {
      redirectPlatformGalleryUploadResult({
        schoolId: parsed.data.schoolId,
        folderId: folder.id,
        status: "error",
        message: `${file.name}: ${saved.message}`
      });
    }

    await prisma.schoolGalleryItem.create({
      data: {
        schoolId: parsed.data.schoolId,
        folderId: folder.id,
        title: resolveItemTitle({
          explicitTitle: parsed.data.title,
          fileName: file.name,
          index,
          total: files.length
        }),
        caption: parsed.data.caption,
        imageUrl: saved.url,
        createdByPlatformUserId: session.platformUserId
      }
    });
    uploadedCount += 1;
  }

  redirectPlatformGalleryUploadResult({
    schoolId: parsed.data.schoolId,
    folderId: folder.id,
    status: "success",
    message: `Uploaded ${uploadedCount} image${uploadedCount === 1 ? "" : "s"} successfully.`
  });
}
