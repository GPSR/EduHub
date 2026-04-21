import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";

export default async function SchoolAuditPage() {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const logs = await prisma.auditLog.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const schoolUserIds = Array.from(
    new Set(logs.filter((l) => l.actorType === "SCHOOL_USER" && l.actorId).map((l) => l.actorId as string))
  );
  const schoolUsers = schoolUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: schoolUserIds } },
        select: { id: true, name: true, email: true, schoolRole: { select: { name: true } } }
      })
    : [];
  const schoolUserById = new Map(schoolUsers.map((u) => [u.id, u]));

  return (
    <Card title="School Activity Log" description="Easy-to-read timeline of activity in this school.">
      <div className="mt-2 text-sm text-white/70">
        <Badge>{logs.length} activities</Badge>
      </div>
      <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
        {logs.map((l) => (
          <div key={l.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="font-medium">{humanizeToken(l.action)}</div>
              <div className="text-xs text-white/50">{formatDateTime(l.createdAt)}</div>
            </div>
            <div className="text-xs text-white/70 mt-1">
              <span className="text-white/50">Who:</span>{" "}
              {formatActor({
                actorType: l.actorType,
                actorId: l.actorId,
                schoolUserById
              })}{" "}
              • <span className="text-white/50">Target:</span>{" "}
              {l.entityType ? `${humanizeToken(l.entityType)} ${l.entityId ?? ""}`.trim() : "N/A"}
            </div>
            {l.metadataJson ? <MetadataRow metadataJson={l.metadataJson} /> : null}
          </div>
        ))}
        {logs.length === 0 ? <div className="px-4 py-8 text-sm text-white/60">No activity yet.</div> : null}
      </div>
    </Card>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function humanizeToken(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActor({
  actorType,
  actorId,
  schoolUserById
}: {
  actorType: "PLATFORM_USER" | "SCHOOL_USER" | "SYSTEM";
  actorId: string | null;
  schoolUserById: Map<string, { id: string; name: string; email: string; schoolRole: { name: string } | null }>;
}) {
  if (actorType === "SYSTEM") return "System";
  if (!actorId) return humanizeToken(actorType);
  if (actorType === "SCHOOL_USER") {
    const actor = schoolUserById.get(actorId);
    return actor
      ? `${actor.name} (${actor.email})${actor.schoolRole?.name ? ` - ${actor.schoolRole.name}` : ""}`
      : `School User (${actorId})`;
  }
  return `Platform User (${actorId})`;
}

function MetadataRow({ metadataJson }: { metadataJson: string }) {
  const parsed = safeParseMetadata(metadataJson);
  if (!parsed) return null;
  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span key={key} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/80">
          {humanizeToken(key)}: {String(value)}
        </span>
      ))}
    </div>
  );
}

function safeParseMetadata(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
