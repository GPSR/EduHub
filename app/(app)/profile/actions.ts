"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearUserProfileImages, saveUserProfileImage } from "@/lib/uploads";

export type ProfileState = { ok: boolean; message?: string };

const UpdateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().email().max(120),
  gender: z.string().trim().max(20).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  alternatePhoneNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().trim().max(80).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional()
});

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireUser();
  const parsed = UpdateProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    gender: formData.get("gender"),
    phoneNumber: formData.get("phoneNumber"),
    alternatePhoneNumber: formData.get("alternatePhoneNumber"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    country: formData.get("country"),
    postalCode: formData.get("postalCode"),
    dateOfBirth: formData.get("dateOfBirth"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    notes: formData.get("notes")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your inputs." };

  const email = parsed.data.email.toLowerCase();
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const name = `${firstName} ${lastName}`.trim();
  const toNull = (v?: string) => {
    const s = (v ?? "").trim();
    return s.length ? s : null;
  };
  const parsedDob = parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null;
  const dateOfBirth = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      firstName: true,
      lastName: true,
      gender: true,
      phoneNumber: true,
      alternatePhoneNumber: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      dateOfBirth: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      notes: true
    }
  });
  if (!current) return { ok: false, message: "Unable to update profile right now." };
  const changed =
    current.name !== name ||
    current.email.toLowerCase() !== email ||
    (current.firstName ?? "") !== firstName ||
    (current.lastName ?? "") !== lastName ||
    (current.gender ?? "") !== (toNull(parsed.data.gender) ?? "") ||
    (current.phoneNumber ?? "") !== (toNull(parsed.data.phoneNumber) ?? "") ||
    (current.alternatePhoneNumber ?? "") !== (toNull(parsed.data.alternatePhoneNumber) ?? "") ||
    (current.address ?? "") !== (toNull(parsed.data.address) ?? "") ||
    (current.city ?? "") !== (toNull(parsed.data.city) ?? "") ||
    (current.state ?? "") !== (toNull(parsed.data.state) ?? "") ||
    (current.country ?? "") !== (toNull(parsed.data.country) ?? "") ||
    (current.postalCode ?? "") !== (toNull(parsed.data.postalCode) ?? "") ||
    (current.dateOfBirth?.toISOString().slice(0, 10) ?? "") !== (dateOfBirth?.toISOString().slice(0, 10) ?? "") ||
    (current.emergencyContactName ?? "") !== (toNull(parsed.data.emergencyContactName) ?? "") ||
    (current.emergencyContactPhone ?? "") !== (toNull(parsed.data.emergencyContactPhone) ?? "") ||
    (current.notes ?? "") !== (toNull(parsed.data.notes) ?? "");
  if (!changed) return { ok: false, message: "No changes to save." };

  const existing = await prisma.user.findFirst({
    where: { schoolId: user.schoolId, email, id: { not: user.id } },
    select: { id: true }
  });
  if (existing) return { ok: false, message: "That email is already used in this school." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email,
      firstName,
      lastName,
      gender: toNull(parsed.data.gender),
      phoneNumber: toNull(parsed.data.phoneNumber),
      alternatePhoneNumber: toNull(parsed.data.alternatePhoneNumber),
      address: toNull(parsed.data.address),
      city: toNull(parsed.data.city),
      state: toNull(parsed.data.state),
      country: toNull(parsed.data.country),
      postalCode: toNull(parsed.data.postalCode),
      dateOfBirth,
      emergencyContactName: toNull(parsed.data.emergencyContactName),
      emergencyContactPhone: toNull(parsed.data.emergencyContactPhone),
      notes: toNull(parsed.data.notes)
    }
  });

  return { ok: true, message: "Profile updated." };
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
});

export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireUser();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) return { ok: false, message: "Please check your inputs." };
  if (parsed.data.newPassword !== parsed.data.confirmPassword) return { ok: false, message: "Passwords do not match." };
  if (parsed.data.currentPassword === parsed.data.newPassword)
    return { ok: false, message: "New password must be different." };

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, message: "Current password is incorrect." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  return { ok: true, message: "Password updated." };
}

export async function uploadProfilePhotoAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File)) return { ok: false, message: "Please choose an image." };

  await clearUserProfileImages(user.id);
  const saved = await saveUserProfileImage(user.id, file);
  if (!saved.ok) return { ok: false, message: saved.message };
  return { ok: true, message: "Profile photo updated." };
}
