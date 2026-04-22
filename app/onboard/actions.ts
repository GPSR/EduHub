"use server";

import { prisma } from "@/lib/db";
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
    const fullPhone = `${parsed.data.adminPhoneCountryCode}${parsed.data.adminPhone}`;

    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) return { ok: false, message: "School slug already exists. Try another one." };

    const pending = await prisma.schoolOnboardingRequest.findFirst({
      where: { schoolSlug: slug, status: "PENDING" },
      select: { id: true }
    });
    if (pending) return { ok: false, message: "A pending request already exists for this school slug." };

    await prisma.schoolOnboardingRequest.create({
      data: {
        schoolName: parsed.data.schoolName,
        schoolSlug: slug,
        adminName: parsed.data.adminName,
        adminEmail: email,
        adminPhoneCountryCode: parsed.data.adminPhoneCountryCode,
        adminPhone: fullPhone,
        status: "PENDING"
      }
    });
    return { ok: true, message: "Request submitted. Super admin approval is required before onboarding." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Request submission failed. Please try again." };
  }
}
