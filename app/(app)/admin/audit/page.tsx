import { Card, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";

export default async function SchoolAuditPage() {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const logs = await prisma.auditLog.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const schoolUserIds = Array.from(
    new Set(logs.filter(l => l.actorType === "SCHOOL_USER" && l.actorId).map(l => l.actorId as string))
  );
  const schoolUsers = schoolUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: schoolUserIds } },
        select: { id: true, name: true, email: true, schoolRole: { select: { name: true } } },
      })
    : [];
  const schoolUserById = new Map(schoolUsers.map(u => [u.id, u]));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Audit Logs" subtitle="Timeline of all activity in your school" />
        <Badge tone="neutral">{logs.length} events</Badge>
      </div>

      <Card>
        {logs.length === 0 ? (
          <EmptyState icon="🔍" title="No activity yet" />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {logs.map((l, i) => (
              <div
                key={l.id}
                className={`flex gap-4 px-4 py-3.5
                             ${i === 0 ? "rounded-t-[16px]" : ""}
                             ${i === logs.length - 1 ? "rounded-b-[16px]" : ""}
                             hover:bg-white/[0.02] transition`}
              >
                {/* Timeline dot */}
                <div className="mt-1.5 shrink-0 flex flex-col items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-400/60" />
                  {i !== logs.length - 1 && <span className="w-px flex-1 min-h-[1rem] bg-white/[0.06]" />}
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="text-[14px] font-semibold text-white/85">{humanizeToken(l.action)}</p>
                    <time className="text-[11px] text-white/30 shrink-0">{formatDateTime(l.createdAt)}</time>
                  </div>
                  <div className="mt-1 text-[12px] text-white/45 flex flex-wrap items-center gap-1.5">
                    <span>{formatActor({ actorType: l.actorType, actorId: l.actorId, schoolUserById })}</span>
                    {l.entityType && (
                      <>
                        <span className="text-white/20">·</span>
                        <span>{humanizeToken(l.entityType)}{l.entityId ? ` ${shortId(l.entityId)}` : ""}</span>
                      </>
                    )}
                  </div>
                  {l.metadataJson && <MetadataRow metadataJson={l.metadataJson} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(date);
}

function humanizeToken(value: string) {
  return value.toLowerCase().split("_").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function formatActor({ actorType, actorId, schoolUserById }: {
  actorType: "PLATFORM_USER" | "SCHOOL_USER" | "SYSTEM";
  actorId: string | null;
  schoolUserById: Map<string, { id: string; name: string; email: string; schoolRole: { name: string } | null }>;
}) {
  if (actorType === "SYSTEM") return "System";
  if (!actorId) return humanizeToken(actorType);
  if (actorType === "SCHOOL_USER") {
    const actor = schoolUserById.get(actorId);
    return actor
      ? `${actor.name}${actor.schoolRole?.name ? ` (${actor.schoolRole.name})` : ""}`
      : `User ${actorId}`;
  }
  return `Platform User`;
}

function MetadataRow({ metadataJson }: { metadataJson: string }) {
  const parsed = safeParseMetadata(metadataJson);
  if (!parsed) return null;
  const entries = formatMetadataEntries(parsed);
  if (!entries.length) return null;
  return (
    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-[10px] border border-white/[0.10] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/65 leading-relaxed break-words"
        >
          <span className="text-white/40">{humanizeToken(key)}:</span>{" "}
          <span className="break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

function safeParseMetadata(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch { return null; }
}

function shortId(v: string) {
  if (v.length <= 14) return v;
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.length > 140 ? `${value.slice(0, 140)}...` : value;
  if (Array.isArray(value)) return value.length ? `${value.length} item(s)` : "0 item(s)";
  return "Updated";
}

function formatMetadataEntries(parsed: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "selectedModules") {
      const ids = String(value ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      out.push([key, ids.length ? `${ids.length} module(s) selected` : "No modules selected"]);
      continue;
    }
    if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
      out.push([key, "Hidden"]);
      continue;
    }
    if (typeof value === "string" && /(cmo|cui)[a-z0-9]{8,}/i.test(value)) {
      out.push([key, shortId(value)]);
      continue;
    }
    out.push([key, stringifyValue(value)]);
  }
  return out;
}
