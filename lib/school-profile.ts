import { db } from "@/lib/db";

export type SchoolProfile = {
  address: string;
};

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  address: ""
};

function sanitizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 300);
}

export function normalizeSchoolProfile(input: Partial<SchoolProfile> | null | undefined): SchoolProfile {
  const p = input ?? {};
  return {
    address: sanitizeAddress(p.address)
  };
}

export async function getSchoolProfile(schoolId: string): Promise<SchoolProfile> {
  const log = await db.auditLog.findFirst({
    where: { schoolId, action: "SCHOOL_PROFILE_UPDATE", entityType: "School", entityId: schoolId },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  if (!log?.metadataJson) return DEFAULT_SCHOOL_PROFILE;
  try {
    const parsed = JSON.parse(log.metadataJson) as Partial<SchoolProfile>;
    return normalizeSchoolProfile(parsed);
  } catch {
    return DEFAULT_SCHOOL_PROFILE;
  }
}
