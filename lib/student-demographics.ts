import { db } from "@/lib/db";

export type StudentDemographicsConfig = {
  genders: string[];
  bloodGroups: string[];
};

export const DEFAULT_STUDENT_DEMOGRAPHICS_CONFIG: StudentDemographicsConfig = {
  genders: ["Male", "Female", "Other"],
  bloodGroups: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
};

function sanitizeOptionList(value: unknown, fallback: string[], maxItems = 20, maxLen = 24): string[] {
  const raw =
    typeof value === "string"
      ? value.split(/[\n,]+/)
      : Array.isArray(value)
        ? value.map((v) => String(v))
        : [];

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const clean = item.trim().replace(/\s+/g, " ").slice(0, maxLen);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(clean);
    if (unique.length >= maxItems) break;
  }

  return unique.length > 0 ? unique : fallback;
}

export function normalizeStudentDemographicsConfig(
  input:
    | {
        genders?: string[] | string;
        bloodGroups?: string[] | string;
      }
    | null
    | undefined
): StudentDemographicsConfig {
  const d = input ?? {};
  return {
    genders: sanitizeOptionList(d.genders, DEFAULT_STUDENT_DEMOGRAPHICS_CONFIG.genders),
    bloodGroups: sanitizeOptionList(d.bloodGroups, DEFAULT_STUDENT_DEMOGRAPHICS_CONFIG.bloodGroups)
  };
}

export async function getSchoolStudentDemographicsConfig(schoolId: string): Promise<StudentDemographicsConfig> {
  const log = await db.auditLog.findFirst({
    where: {
      schoolId,
      action: "STUDENT_DEMOGRAPHICS_CONFIG_UPDATE",
      entityType: "School",
      entityId: schoolId
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  if (!log?.metadataJson) return DEFAULT_STUDENT_DEMOGRAPHICS_CONFIG;
  try {
    const parsed = JSON.parse(log.metadataJson) as Partial<StudentDemographicsConfig>;
    return normalizeStudentDemographicsConfig(parsed);
  } catch {
    return DEFAULT_STUDENT_DEMOGRAPHICS_CONFIG;
  }
}
