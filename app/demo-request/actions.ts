"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const NAME_REGEX = /^[A-Za-z][A-Za-z '.-]{1,59}$/;
const SCHOOL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 '&().,-]{1,119}$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;
const NORMALIZE_SPACES_REGEX = /\s+/g;

function normalizeTextValue(value: unknown) {
  if (typeof value !== "string") return value;
  return value.replace(NORMALIZE_SPACES_REGEX, " ").trim();
}

const DemoRequestSchema = z.object({
  firstName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "First name is required.", invalid_type_error: "First name is required." })
      .min(2, "First name must be at least 2 characters.")
      .max(60, "First name is too long.")
      .regex(NAME_REGEX, "Enter a valid first name.")
  ),
  lastName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Last name is required.", invalid_type_error: "Last name is required." })
      .min(2, "Last name must be at least 2 characters.")
      .max(60, "Last name is too long.")
      .regex(NAME_REGEX, "Enter a valid last name.")
  ),
  schoolName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "School name is required.", invalid_type_error: "School name is required." })
      .min(2, "School name must be at least 2 characters.")
      .max(120, "School name is too long.")
      .regex(SCHOOL_NAME_REGEX, "Enter a valid school name.")
  ),
  address: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Address is required.", invalid_type_error: "Address is required." })
      .min(10, "Address must be at least 10 characters.")
      .max(280, "Address is too long.")
  ),
  email: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Email ID is required.", invalid_type_error: "Email ID is required." })
      .max(120, "Email ID is too long.")
      .email("Enter a valid email ID.")
      .transform((value) => value.toLowerCase())
  ),
  mobileNumber: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Mobile number is required.", invalid_type_error: "Mobile number is required." })
      .regex(PHONE_REGEX, "Enter a valid mobile number.")
  ),
  bestTime: z.enum(
    [
      "Morning (9:00 AM - 12:00 PM EST)",
      "Afternoon (12:00 PM - 4:00 PM EST)",
      "Evening (4:00 PM - 7:00 PM EST)",
      "Anytime during business hours (EST)",
    ],
    { message: "Please select the best time to reach you." }
  ),
});

export type DemoRequestState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "schoolName" | "address" | "email" | "mobileNumber" | "bestTime", string>>;
};

export async function createDemoRequestAction(_prev: DemoRequestState, formData: FormData): Promise<DemoRequestState> {
  const parsed = DemoRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    schoolName: formData.get("schoolName"),
    address: formData.get("address"),
    email: formData.get("email"),
    mobileNumber: formData.get("mobileNumber"),
    bestTime: formData.get("bestTime"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        firstName: flat.firstName?.[0],
        lastName: flat.lastName?.[0],
        schoolName: flat.schoolName?.[0],
        address: flat.address?.[0],
        email: flat.email?.[0],
        mobileNumber: flat.mobileNumber?.[0],
        bestTime: flat.bestTime?.[0],
      },
    };
  }

  const phoneDigits = parsed.data.mobileNumber.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: { mobileNumber: "Mobile number must contain 10 to 15 digits." },
    };
  }

  const normalized = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    schoolName: parsed.data.schoolName,
    address: parsed.data.address,
    email: parsed.data.email,
    mobileNumber: parsed.data.mobileNumber,
    bestTimeToReach: parsed.data.bestTime,
  };

  try {
    const recentDuplicate = await prisma.demoRequest.findFirst({
      where: {
        email: normalized.email,
        schoolName: { equals: normalized.schoolName, mode: "insensitive" },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { id: true },
    });

    if (recentDuplicate) {
      return {
        ok: false,
        message: "A demo request was already submitted recently. Our team will contact you shortly.",
      };
    }

    await prisma.demoRequest.create({ data: normalized });
    revalidatePath("/platform/demo-requests");
    revalidatePath("/platform");

    return {
      ok: true,
      message: "Thank you for requesting a demo. Our team will contact you within 24 hours to schedule your personalized walkthrough.",
      fieldErrors: {},
    };
  } catch (error) {
    console.error("createDemoRequestAction failed:", error);
    return {
      ok: false,
      message: "Unable to submit demo request right now. Please try again in a few minutes.",
    };
  }
}
