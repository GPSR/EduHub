import { prisma } from "@/lib/db";

export const DEFAULT_SUPPORT_CHAT_TOPICS = [
  "Fees",
  "Salary",
  "Leaves",
  "Bus Route",
  "Progress Card",
  "Complaint",
  "Others"
] as const;

const SUPPORT_TOPICS_AUDIT_ACTION = "SUPPORT_CHAT_TOPICS_CONFIG_UPDATE";

function dedupeTopics(topics: string[]) {
  const unique = new Set<string>();
  const normalized: string[] = [];

  for (const value of topics) {
    const topic = value.trim().replace(/\s+/g, " ");
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    normalized.push(topic.slice(0, 60));
  }

  return normalized;
}

export function normalizeSupportChatTopics(raw: string | string[] | null | undefined) {
  const values = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(/[\n,]/g)
        .map((entry) => entry.trim());

  const normalized = dedupeTopics(values);
  return normalized.length > 0 ? normalized : [...DEFAULT_SUPPORT_CHAT_TOPICS];
}

export async function getSchoolSupportChatTopics(schoolId: string) {
  const latest = await prisma.auditLog.findFirst({
    where: {
      schoolId,
      action: SUPPORT_TOPICS_AUDIT_ACTION,
      entityType: "School",
      entityId: schoolId
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true }
  });

  if (!latest?.metadataJson) return [...DEFAULT_SUPPORT_CHAT_TOPICS];

  try {
    const parsed = JSON.parse(latest.metadataJson) as { topics?: unknown };
    if (!Array.isArray(parsed.topics)) return [...DEFAULT_SUPPORT_CHAT_TOPICS];
    return normalizeSupportChatTopics(parsed.topics.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return [...DEFAULT_SUPPORT_CHAT_TOPICS];
  }
}
