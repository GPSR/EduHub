import { db } from "@/lib/db";

export type IdCardTemplate = {
  schoolLabel: string;
  headerText: string;
  footerText: string;
  background: string;
  accent: string;
  textColor: string;
  showPhoto: boolean;
  showParent: boolean;
  showGuardian: boolean;
};

export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplate = {
  schoolLabel: "EduHub School",
  headerText: "Student Virtual ID",
  footerText: "If found, contact school administration.",
  background: "linear-gradient(135deg,#0f172a,#1e293b)",
  accent: "#22c55e",
  textColor: "#f8fafc",
  showPhoto: true,
  showParent: true,
  showGuardian: true
};

function sanitizeHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

function sanitizeText(value: unknown, fallback: string, max = 80) {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v) return fallback;
  return v.slice(0, max);
}

function sanitizeGradient(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v || v.length > 180) return fallback;
  // Allow gradient/color only.
  if (v.includes(";") || v.includes("url(") || v.includes("@")) return fallback;
  return v;
}

export function normalizeTemplate(input: Partial<IdCardTemplate> | null | undefined): IdCardTemplate {
  const t = input ?? {};
  return {
    schoolLabel: sanitizeText(t.schoolLabel, DEFAULT_ID_CARD_TEMPLATE.schoolLabel),
    headerText: sanitizeText(t.headerText, DEFAULT_ID_CARD_TEMPLATE.headerText),
    footerText: sanitizeText(t.footerText, DEFAULT_ID_CARD_TEMPLATE.footerText, 160),
    background: sanitizeGradient(t.background, DEFAULT_ID_CARD_TEMPLATE.background),
    accent: sanitizeHex(t.accent, DEFAULT_ID_CARD_TEMPLATE.accent),
    textColor: sanitizeHex(t.textColor, DEFAULT_ID_CARD_TEMPLATE.textColor),
    showPhoto: typeof t.showPhoto === "boolean" ? t.showPhoto : DEFAULT_ID_CARD_TEMPLATE.showPhoto,
    showParent: typeof t.showParent === "boolean" ? t.showParent : DEFAULT_ID_CARD_TEMPLATE.showParent,
    showGuardian: typeof t.showGuardian === "boolean" ? t.showGuardian : DEFAULT_ID_CARD_TEMPLATE.showGuardian
  };
}

export async function getSchoolIdCardTemplate(schoolId: string): Promise<IdCardTemplate> {
  const log = await db.auditLog.findFirst({
    where: { schoolId, action: "ID_CARD_TEMPLATE_UPDATE", entityType: "School", entityId: schoolId },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });
  if (!log?.metadataJson) return DEFAULT_ID_CARD_TEMPLATE;
  try {
    const parsed = JSON.parse(log.metadataJson) as Partial<IdCardTemplate>;
    return normalizeTemplate(parsed);
  } catch {
    return DEFAULT_ID_CARD_TEMPLATE;
  }
}
