"use server";

import { db } from "@/lib/db";
import { z } from "zod";

export type OnboardState = { ok: boolean; message?: string };

const OnboardSchema = z.object({
  schoolName: z.string().min(2),
  schoolSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only."),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPhoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
  adminPhone: z.string().min(6).max(15)
});

export async function onboardAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const parsed = OnboardSchema.safeParse({
      schoolName: formData.get("schoolName"),
      schoolSlug: formData.get("schoolSlug"),
      adminName: formData.get("adminName"),
      adminEmail: formData.get("adminEmail"),
      adminPhoneCountryCode: String(formData.get("adminPhoneCountryCode") ?? "").trim(),
      adminPhone: String(formData.get("adminPhone") ?? "").replace(/\D/g, "")
    });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please check your inputs.";
      return { ok: false, message };
    }

    const slug = parsed.data.schoolSlug.toLowerCase();
    const email = parsed.data.adminEmail.toLowerCase();
    const existing = await db.school.findUnique({ where: { slug } });
    if (existing) return { ok: false, message: "School slug already exists. Try another one." };

    const pending = await db.schoolOnboardingRequest.findFirst({
      where: { schoolSlug: slug, status: "PENDING" },
      select: { id: true }
    });
    if (pending) return { ok: false, message: "A pending request already exists for this school slug." };

    try {
      await db.schoolOnboardingRequest.create({
        data: {
          schoolName: parsed.data.schoolName,
          schoolSlug: slug,
          adminName: parsed.data.adminName,
          adminEmail: email,
          adminPhoneCountryCode: parsed.data.adminPhoneCountryCode,
          adminPhone: parsed.data.adminPhone
        }
      });
    } catch {
      // Backward compatibility for environments where new phone columns
      // are not migrated yet.
      await db.schoolOnboardingRequest.create({
        data: {
          schoolName: parsed.data.schoolName,
          schoolSlug: slug,
          adminName: parsed.data.adminName,
          adminEmail: email
        }
      });
    }
    return {
      ok: true,
      message:
        "Request submitted successfully. Our team will respond within 24 hours after reviewing your onboarding details. You will receive an approval status update by email."
    };
  } catch (e) {
    console.error("onboardAction error:", e);
    const raw = e instanceof Error ? e.message : "unknown_error";
    if (raw.toLowerCase().includes("database_url") || raw.toLowerCase().includes("neon_database_url")) {
      return { ok: false, message: "Server is missing NEON_DATABASE_URL configuration." };
    }
    if (raw.toLowerCase().includes("unique constraint")) {
      return { ok: false, message: "A similar onboarding request already exists." };
    }
    return { ok: false, message: "Request submission failed. Please try again shortly." };
  }
}
