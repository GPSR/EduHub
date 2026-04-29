"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const NAME_REGEX = /^[A-Za-z][A-Za-z '.-]{1,59}$/;
const JOB_TITLE_REGEX = /^[A-Za-z][A-Za-z0-9 '&().,/+-]{1,79}$/;
const SCHOOL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 '&().,-]{1,119}$/;
const COUNTRY_CODE_REGEX = /^\+\d{1,4}$/;
const LOCAL_PHONE_REGEX = /^[0-9][0-9()\-\s]{5,18}$/;
const NORMALIZE_SPACES_REGEX = /\s+/g;

function normalizeTextValue(value: unknown) {
  if (typeof value !== "string") return value;
  return value.replace(NORMALIZE_SPACES_REGEX, " ").trim();
}

function getDbErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

const DemoRequestSchema = z.object({
  firstName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your first name.", invalid_type_error: "Please enter your first name." })
      .min(2, "First name should be at least 2 characters.")
      .max(60, "First name cannot exceed 60 characters.")
      .regex(NAME_REGEX, "Use letters only. You may include space, apostrophe, dot, or hyphen.")
  ),
  lastName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your last name.", invalid_type_error: "Please enter your last name." })
      .min(2, "Last name should be at least 2 characters.")
      .max(60, "Last name cannot exceed 60 characters.")
      .regex(NAME_REGEX, "Use letters only. You may include space, apostrophe, dot, or hyphen.")
  ),
  jobTitle: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your job title.", invalid_type_error: "Please enter your job title." })
      .min(2, "Job title should be at least 2 characters.")
      .max(80, "Job title cannot exceed 80 characters.")
      .regex(JOB_TITLE_REGEX, "Use letters, numbers, spaces, and basic punctuation.")
  ),
  schoolName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your school name.", invalid_type_error: "Please enter your school name." })
      .min(2, "School name should be at least 2 characters.")
      .max(120, "School name cannot exceed 120 characters.")
      .regex(SCHOOL_NAME_REGEX, "School name can include letters, numbers, spaces, and basic punctuation.")
  ),
  usingEdumerge: z.enum(["Yes", "No"], {
    message: "Please tell us whether you are using EduHub.",
  }),
  hearAboutUs: z.preprocess(
    normalizeTextValue,
    z
      .string({
        required_error: "Please tell us how you heard about us.",
        invalid_type_error: "Please tell us how you heard about us.",
      })
      .min(2, "Please share at least 2 characters.")
      .max(120, "This response cannot exceed 120 characters.")
  ),
  address: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your school address.", invalid_type_error: "Please enter your school address." })
      .min(10, "Address should be at least 10 characters.")
      .max(280, "Address cannot exceed 280 characters.")
  ),
  email: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your email ID.", invalid_type_error: "Please enter your email ID." })
      .max(120, "Email address cannot exceed 120 characters.")
      .email("Please enter a valid email address, like name@school.com.")
      .transform((value) => value.toLowerCase())
  ),
  countryCode: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please select your country code.", invalid_type_error: "Please select your country code." })
      .regex(COUNTRY_CODE_REGEX, "Please select a valid country code.")
  ),
  mobileNumber: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your mobile number.", invalid_type_error: "Please enter your mobile number." })
      .regex(LOCAL_PHONE_REGEX, "Use numbers only. You can include spaces, hyphen, or parentheses.")
  ),
  bestTime: z.enum(
    [
      "Morning (9:00 AM - 12:00 PM EST)",
      "Afternoon (12:00 PM - 4:00 PM EST)",
      "Evening (4:00 PM - 7:00 PM EST)",
      "Anytime during business hours (EST)",
    ],
    { message: "Please select the best time for our team to contact you." }
  ),
});

export type DemoRequestState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<
    Record<
      "firstName" | "lastName" | "jobTitle" | "schoolName" | "usingEdumerge" | "hearAboutUs" | "address" | "email" | "countryCode" | "mobileNumber" | "bestTime",
      string
    >
  >;
};

const QUICK_CHAT_NAME_REGEX = /^[A-Za-z][A-Za-z '.-]{1,79}$/;
const QUICK_CHAT_PHONE_REGEX = /^\+?[0-9][0-9()\-\s]{6,19}$/;

const QuickChatLeadSchema = z.object({
  name: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your name.", invalid_type_error: "Please enter your name." })
      .min(2, "Name should be at least 2 characters.")
      .max(80, "Name cannot exceed 80 characters.")
      .regex(QUICK_CHAT_NAME_REGEX, "Use letters only. You may include space, apostrophe, dot, or hyphen.")
  ),
  schoolName: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your school name.", invalid_type_error: "Please enter your school name." })
      .min(2, "School name should be at least 2 characters.")
      .max(120, "School name cannot exceed 120 characters.")
      .regex(SCHOOL_NAME_REGEX, "School name can include letters, numbers, spaces, and basic punctuation.")
  ),
  email: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your email.", invalid_type_error: "Please enter your email." })
      .max(120, "Email address cannot exceed 120 characters.")
      .email("Please enter a valid email address, like name@school.com.")
      .transform((value) => value.toLowerCase())
  ),
  phone: z.preprocess(
    normalizeTextValue,
    z
      .string({ required_error: "Please enter your mobile number.", invalid_type_error: "Please enter your mobile number." })
      .regex(QUICK_CHAT_PHONE_REGEX, "Use numbers only. You can include +, spaces, hyphen, or parentheses.")
  )
});

export type QuickChatLeadState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"name" | "schoolName" | "email" | "phone", string>>;
};

function splitQuickChatName(fullName: string) {
  const parts = fullName.replace(NORMALIZE_SPACES_REGEX, " ").trim().split(" ").filter(Boolean);
  const firstName = parts[0] ?? "EduHub";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "Contact";
  return { firstName, lastName };
}

export async function createQuickChatLeadAction(
  _prev: QuickChatLeadState,
  formData: FormData
): Promise<QuickChatLeadState> {
  const parsed = QuickChatLeadSchema.safeParse({
    name: formData.get("name"),
    schoolName: formData.get("schoolName"),
    email: formData.get("email"),
    phone: formData.get("phone")
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Please share valid contact details.",
      fieldErrors: {
        name: flat.name?.[0],
        schoolName: flat.schoolName?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0]
      }
    };
  }

  const digits = parsed.data.phone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) {
    return {
      ok: false,
      message: "Please share valid contact details.",
      fieldErrors: { phone: "Mobile number should contain 6 to 15 digits." }
    };
  }

  const { firstName, lastName } = splitQuickChatName(parsed.data.name);

  try {
    const recentCandidates = await db.demoRequest.findMany({
      where: {
        email: parsed.data.email,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
      },
      select: { id: true, schoolName: true },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const schoolNameKey = parsed.data.schoolName.trim().toLowerCase();
    const duplicate = recentCandidates.find((candidate) => candidate.schoolName.trim().toLowerCase() === schoolNameKey);
    if (duplicate) {
      return {
        ok: true,
        message: "Welcome to EduHub. We already received your details. Our team will get back to you within 2 hours.",
        fieldErrors: {}
      };
    }

    await db.demoRequest.create({
      data: {
        firstName,
        lastName,
        jobTitle: "AI Chat Lead",
        schoolName: parsed.data.schoolName,
        isUsingEdumerge: null,
        hearAboutUs: "AI chat widget",
        address: "Shared via AI chat widget on landing page.",
        email: parsed.data.email,
        mobileNumber: parsed.data.phone,
        bestTimeToReach: "Anytime during business hours (EST)"
      }
    });

    try {
      revalidatePath("/platform/demo-requests");
      revalidatePath("/platform");
    } catch (revalidateError) {
      console.warn("createQuickChatLeadAction revalidate failed:", revalidateError);
    }

    return {
      ok: true,
      message: "Welcome to EduHub. Thanks for sharing your details. Our team will get back to you within 2 hours.",
      fieldErrors: {}
    };
  } catch (error) {
    console.error("createQuickChatLeadAction failed:", error);
    const dbErrorCode = getDbErrorCode(error);
    if (dbErrorCode && ["P1001", "P1002", "P1017"].includes(dbErrorCode)) {
      return {
        ok: false,
        message: "We are unable to connect right now. Please try again in a minute."
      };
    }
    return {
      ok: false,
      message: "Unable to submit your details right now. Please try again in a few minutes."
    };
  }
}

export async function createDemoRequestAction(_prev: DemoRequestState, formData: FormData): Promise<DemoRequestState> {
  const parsed = DemoRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    jobTitle: formData.get("jobTitle"),
    schoolName: formData.get("schoolName"),
    usingEdumerge: formData.get("usingEdumerge"),
    hearAboutUs: formData.get("hearAboutUs"),
    address: formData.get("address"),
    email: formData.get("email"),
    countryCode: formData.get("countryCode"),
    mobileNumber: formData.get("mobileNumber"),
    bestTime: formData.get("bestTime"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Please fix the highlighted details and submit again.",
      fieldErrors: {
        firstName: flat.firstName?.[0],
        lastName: flat.lastName?.[0],
        jobTitle: flat.jobTitle?.[0],
        schoolName: flat.schoolName?.[0],
        usingEdumerge: flat.usingEdumerge?.[0],
        hearAboutUs: flat.hearAboutUs?.[0],
        address: flat.address?.[0],
        email: flat.email?.[0],
        countryCode: flat.countryCode?.[0],
        mobileNumber: flat.mobileNumber?.[0],
        bestTime: flat.bestTime?.[0],
      },
    };
  }

  const phoneDigits = parsed.data.mobileNumber.replace(/\D/g, "");
  if (phoneDigits.length < 6 || phoneDigits.length > 14) {
    return {
      ok: false,
      message: "Please fix the highlighted details and submit again.",
      fieldErrors: { mobileNumber: "Mobile number should contain 6 to 14 digits (without country code)." },
    };
  }

  const normalized = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    jobTitle: parsed.data.jobTitle,
    schoolName: parsed.data.schoolName,
    isUsingEdumerge: parsed.data.usingEdumerge === "Yes",
    hearAboutUs: parsed.data.hearAboutUs,
    address: parsed.data.address,
    email: parsed.data.email,
    mobileNumber: `${parsed.data.countryCode} ${parsed.data.mobileNumber}`.replace(NORMALIZE_SPACES_REGEX, " ").trim(),
    bestTimeToReach: parsed.data.bestTime,
  };

  try {
    const recentCandidates = await db.demoRequest.findMany({
      where: {
        email: normalized.email,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { id: true, schoolName: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const schoolNameKey = normalized.schoolName.trim().toLowerCase();
    const recentDuplicate = recentCandidates.find((candidate) => candidate.schoolName.trim().toLowerCase() === schoolNameKey);

    if (recentDuplicate) {
      return {
        ok: false,
        message: "A demo request was already submitted recently. Our team will contact you shortly.",
      };
    }

    let submitted = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await db.demoRequest.create({ data: normalized });
        submitted = true;
        break;
      } catch (error) {
        const isLastAttempt = attempt === 2;
        const code = getDbErrorCode(error) ?? "";
        const transientCodes = new Set(["P1001", "P1002", "P1017"]);

        if (!isLastAttempt && transientCodes.has(code)) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }
        throw error;
      }
    }

    if (!submitted) {
      throw new Error("Demo request submission did not complete.");
    }

    try {
      revalidatePath("/platform/demo-requests");
      revalidatePath("/platform");
    } catch (revalidateError) {
      // Revalidation should never block a successful demo submission.
      console.warn("createDemoRequestAction revalidate failed:", revalidateError);
    }

    return {
      ok: true,
      message: "Thank you for requesting a demo. Our team will contact you within 24 hours to schedule your personalized walkthrough.",
      fieldErrors: {},
    };
  } catch (error) {
    console.error("createDemoRequestAction failed:", error);
    const dbErrorCode = getDbErrorCode(error);
    if (dbErrorCode === "P2021") {
      return {
        ok: false,
        message: "Demo request service is syncing. Please try again in 1 minute.",
      };
    }
    if (dbErrorCode && ["P1001", "P1002", "P1017"].includes(dbErrorCode)) {
      return {
        ok: false,
        message: "We are unable to connect right now. Please try again in a minute.",
      };
    }
    if (dbErrorCode === "P1000") {
      return {
        ok: false,
        message: "Demo request service is temporarily unavailable. Please contact support if this continues.",
      };
    }
    return {
      ok: false,
      message: "Unable to submit demo request right now. Please try again in a few minutes.",
    };
  }
}
