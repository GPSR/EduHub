"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { z } from "zod";

const SlugSchema = z
  .string()
  .min(2, "School slug is required.")
  .max(64, "School slug is too long.")
  .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only.");

export type SchoolSlugState = { ok: boolean; message?: string };

export async function validateSchoolSlugAction(
  _prev: SchoolSlugState,
  formData: FormData
): Promise<SchoolSlugState> {
  const raw = String(formData.get("schoolSlug") ?? "").trim();
  const parsed = SlugSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid school slug." };

  const slug = parsed.data.toLowerCase();
  const school = await prisma.school.findUnique({ where: { slug } });
  if (!school) return { ok: false, message: "No school found for that slug." };
  if (!school.isActive) return { ok: false, message: "This school is currently inactive." };

  redirect(`/login?schoolSlug=${encodeURIComponent(slug)}`);
}

