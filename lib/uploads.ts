import { access, mkdir, readdir, rm, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function publicDir() {
  return path.join(process.cwd(), "public");
}

export async function saveUploadedImage(opts: {
  file: File;
  folder: string;
  prefix: string;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const { file, folder, prefix } = opts;

  if (!file || file.size === 0) return { ok: false, message: "Please choose an image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Image must be 3MB or smaller." };
  const ext = ALLOWED.get(file.type);
  if (!ext) return { ok: false, message: "Use JPG, PNG, or WEBP image." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const relDir = path.posix.join("uploads", folder);
  const dirPath = path.join(publicDir(), relDir);
  await mkdir(dirPath, { recursive: true });

  const filename = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const fullPath = path.join(dirPath, filename);
  await writeFile(fullPath, bytes);

  return { ok: true, url: `/${relDir}/${filename}` };
}

export async function deleteUploadedImageByUrl(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const fullPath = path.join(publicDir(), url.replace(/^\//, ""));
  try {
    await unlink(fullPath);
  } catch {
    // Ignore cleanup failures.
  }
}

export async function saveUserProfileImage(userId: string, file: File): Promise<{ ok: true } | { ok: false; message: string }> {
  const saved = await saveUploadedImage({
    file,
    folder: `users/${userId}`,
    prefix: "profile"
  });
  if (!saved.ok) return saved;
  return { ok: true };
}

export async function getUserProfileImageUrl(userId: string): Promise<string | null> {
  const relDir = path.posix.join("uploads", "users", userId);
  const dirPath = path.join(publicDir(), relDir);
  try {
    const files = await readdir(dirPath);
    const match = files
      .filter((f) => /^profile-.*\.(jpg|png|webp)$/i.test(f))
      .sort()
      .pop();
    return match ? `/${relDir}/${match}` : null;
  } catch {
    return null;
  }
}

export async function clearUserProfileImages(userId: string) {
  const relDir = path.posix.join("uploads", "users", userId);
  const dirPath = path.join(publicDir(), relDir);
  try {
    await access(dirPath);
  } catch {
    return;
  }
  try {
    const files = await readdir(dirPath);
    await Promise.all(
      files
        .filter((f) => /^profile-.*\.(jpg|png|webp)$/i.test(f))
        .map((f) => rm(path.join(dirPath, f), { force: true }))
    );
  } catch {
    // Ignore cleanup failures.
  }
}
