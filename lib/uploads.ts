import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export const DEFAULT_MAX_IMAGE_BYTES = 1500 * 1024; // Keep DB payload reasonable.
export const LOGO_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

function formatMegabytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
}

function toDataUrl(file: File, bytes: Buffer, ext: string) {
  const mime = file.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function validateImage(
  file: File,
  maxBytes: number | null = DEFAULT_MAX_IMAGE_BYTES
): Promise<{ ok: true; ext: string; bytes: Buffer } | { ok: false; message: string }> {
  if (!file || file.size === 0) return { ok: false, message: "Please choose an image." };
  if (typeof maxBytes === "number" && file.size > maxBytes) {
    return { ok: false, message: `Image must be ${formatMegabytes(maxBytes)} or smaller.` };
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) return { ok: false, message: "Use JPG, PNG, or WEBP image." };
  const bytes = Buffer.from(await file.arrayBuffer());
  return { ok: true, ext, bytes };
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function resolveFolderSegments(folder: string) {
  const segments = folder
    .split("/")
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean);
  return segments.length ? segments : ["misc"];
}

export async function saveUploadedImage(opts: {
  file: File;
  folder: string;
  prefix: string;
  maxBytes?: number | null;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const checked = await validateImage(opts.file, opts.maxBytes);
  if (!checked.ok) return checked;

  const folderSegments = resolveFolderSegments(opts.folder);
  const safePrefix = sanitizePathSegment(opts.prefix) || "img";
  const fileName = `${safePrefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${checked.ext}`;
  const targetDir = path.join(PUBLIC_UPLOADS_ROOT, ...folderSegments);

  try {
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, fileName), checked.bytes);
    return { ok: true, url: `/uploads/${[...folderSegments, fileName].join("/")}` };
  } catch {
    // Fallback to data URLs if filesystem write is not available in the runtime.
    const dataUrl = toDataUrl(opts.file, checked.bytes, checked.ext);
    return { ok: true, url: dataUrl };
  }
}

export async function deleteUploadedImageByUrl(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;

  const relativePath = decodeURIComponent(url.replace(/^\/uploads\//, "").split("?")[0] ?? "");
  const resolvedPath = path.resolve(PUBLIC_UPLOADS_ROOT, relativePath);
  if (!resolvedPath.startsWith(PUBLIC_UPLOADS_ROOT + path.sep)) return;

  try {
    await rm(resolvedPath, { force: true });
  } catch {
    // Ignore cleanup failures to keep delete flow non-blocking.
  }
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

export async function savePlatformUserProfileImage(
  platformUserId: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
  const checked = await validateImage(file);
  if (!checked.ok) return checked;
  const dataUrl = toDataUrl(file, checked.bytes, checked.ext);

  await prisma.auditLog.create({
    data: {
      schoolId: null,
      actorType: "PLATFORM_USER",
      actorId: platformUserId,
      action: "PLATFORM_USER_PROFILE_PHOTO_UPDATE",
      entityType: "PlatformUser",
      entityId: platformUserId,
      metadataJson: JSON.stringify({ dataUrl, updatedAt: new Date().toISOString() })
    }
  });

  return { ok: true };
}

export async function getPlatformUserProfileImageUrl(platformUserId: string): Promise<string | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      action: "PLATFORM_USER_PROFILE_PHOTO_UPDATE",
      entityType: "PlatformUser",
      entityId: platformUserId
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

export async function clearPlatformUserProfileImages(_platformUserId: string) {
  // No-op for audit-log based storage.
}
