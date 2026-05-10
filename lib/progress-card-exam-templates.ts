import { db } from "@/lib/db";

export type ProgressCardExamTemplate = {
  id: string;
  examName: string;
  subject: string;
  maxScore: number;
};

const PROGRESS_CARD_TEMPLATE_AUDIT_ACTION = "PROGRESS_CARD_EXAM_TEMPLATES_UPDATE";

function toCleanText(value: unknown, maxLen: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLen);
}

function toMaxScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100) / 100;
}

function parseTemplateFromLine(line: string): Omit<ProgressCardExamTemplate, "id"> | null {
  const base = line.trim();
  if (!base) return null;

  const pipeParts = base.split("|").map((part) => part.trim());
  const commaParts = base.split(",").map((part) => part.trim());
  const parts = pipeParts.length >= 3 ? pipeParts : commaParts;
  if (parts.length < 3) return null;

  const examName = toCleanText(parts[0], 60);
  const subject = toCleanText(parts[1], 60);
  const maxScore = toMaxScore(parts[2]);
  if (!examName || !subject || maxScore === null) return null;

  return { examName, subject, maxScore };
}

function parseTemplateObject(value: unknown): Omit<ProgressCardExamTemplate, "id"> | null {
  if (!value || typeof value !== "object") return null;
  const source = value as { examName?: unknown; subject?: unknown; maxScore?: unknown };
  const examName = toCleanText(source.examName, 60);
  const subject = toCleanText(source.subject, 60);
  const maxScore = toMaxScore(source.maxScore);
  if (!examName || !subject || maxScore === null) return null;
  return { examName, subject, maxScore };
}

function withTemplateIds(templates: Omit<ProgressCardExamTemplate, "id">[]): ProgressCardExamTemplate[] {
  return templates.map((template, index) => ({
    id: `tpl_${index + 1}`,
    ...template
  }));
}

export function normalizeProgressCardExamTemplates(
  raw: string | Array<{ examName?: unknown; subject?: unknown; maxScore?: unknown }> | null | undefined
): ProgressCardExamTemplate[] {
  const parsed: Omit<ProgressCardExamTemplate, "id">[] = [];

  if (typeof raw === "string") {
    for (const line of raw.split(/\n+/g)) {
      const template = parseTemplateFromLine(line);
      if (template) parsed.push(template);
    }
  } else if (Array.isArray(raw)) {
    for (const value of raw) {
      const template = parseTemplateObject(value);
      if (template) parsed.push(template);
    }
  }

  const unique = new Set<string>();
  const normalized: Omit<ProgressCardExamTemplate, "id">[] = [];

  for (const item of parsed) {
    const key = `${item.examName.toLowerCase()}|${item.subject.toLowerCase()}|${item.maxScore.toFixed(2)}`;
    if (unique.has(key)) continue;
    unique.add(key);
    normalized.push(item);
    if (normalized.length >= 250) break;
  }

  return withTemplateIds(normalized);
}

export function toProgressCardExamTemplateLines(templates: ProgressCardExamTemplate[]) {
  return templates.map((template) => `${template.examName} | ${template.subject} | ${template.maxScore}`).join("\n");
}

export function toPersistedProgressCardExamTemplates(templates: ProgressCardExamTemplate[]) {
  return templates.map((template) => ({
    examName: template.examName,
    subject: template.subject,
    maxScore: template.maxScore
  }));
}

export async function getSchoolProgressCardExamTemplates(schoolId: string) {
  const latest = await db.auditLog.findFirst({
    where: {
      schoolId,
      action: PROGRESS_CARD_TEMPLATE_AUDIT_ACTION,
      entityType: "School",
      entityId: schoolId
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });

  if (!latest?.metadataJson) return [];

  try {
    const parsed = JSON.parse(latest.metadataJson) as { templates?: unknown };
    if (!Array.isArray(parsed.templates)) return [];
    return normalizeProgressCardExamTemplates(parsed.templates as Array<{ examName?: unknown; subject?: unknown; maxScore?: unknown }>);
  } catch {
    return [];
  }
}
