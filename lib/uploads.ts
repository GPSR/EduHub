import { prisma } from "@/lib/db";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const MAX_IMAGE_BYTES = 1500 * 1024; // Keep DB payload reasonable.

function toDataUrl(file: File, bytes: Buffer, ext: string) {
  const mime = file.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function validateImage(file: File): Promise<{ ok: true; ext: string; bytes: Buffer } | { ok: false; message: string }> {
  if (!file || file.size === 0) return { ok: false, message: "Please choose an image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Image must be 1.5MB or smaller." };
  const ext = ALLOWED.get(file.type);
  if (!ext) return { ok: false, message: "Use JPG, PNG, or WEBP image." };
  const bytes = Buffer.from(await file.arrayBuffer());
  return { ok: true, ext, bytes };
}

export async function saveUploadedImage(opts: {
  file: File;
  folder: string;
  prefix: string;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const checked = await validateImage(opts.file);
  if (!checked.ok) return checked;
  const dataUrl = toDataUrl(opts.file, checked.bytes, checked.ext);
  return { ok: true, url: dataUrl };
}

export async function deleteUploadedImageByUrl(_url: string | null | undefined) {
  // No-op for DB/data-url based storage.
}

export async function saveUserProfileImage(
  schoolId: string,
  userId: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
  const checked = await validateImage(file);
  if (!checked.ok) return checked;
  const dataUrl = toDataUrl(file, checked.bytes, checked.ext);

  await prisma.auditLog.create({
    data: {
      schoolId,
      actorType: "SCHOOL_USER",
      actorId: userId,
      action: "USER_PROFILE_PHOTO_UPDATE",
      entityType: "User",
      entityId: userId,
      metadataJson: JSON.stringify({ dataUrl, updatedAt: new Date().toISOString() })
    }
  });

  return { ok: true };
}

export async function getUserProfileImageUrl(schoolId: string, userId: string): Promise<string | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      schoolId,
      action: "USER_PROFILE_PHOTO_UPDATE",
      entityType: "User",
      entityId: userId
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  if (!log?.metadataJson) return null;
  try {
    const parsed = JSON.parse(log.metadataJson) as { dataUrl?: unknown };
    return typeof parsed.dataUrl === "string" ? parsed.dataUrl : null;
  } catch {
    return null;
  }
}

export async function clearUserProfileImages(_userId: string) {
  // No-op for audit-log based storage.
}
