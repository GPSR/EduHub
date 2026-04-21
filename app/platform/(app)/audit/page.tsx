import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

export default async function PlatformAuditPage() {
  await requireSuperAdmin();
  const logs = await prisma.auditLog.findMany({
    where: { actorType: { in: ["PLATFORM_USER", "SYSTEM"] } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const platformUserIds = Array.from(
    new Set(logs.filter((l) => l.actorType === "PLATFORM_USER" && l.actorId).map((l) => l.actorId as string))
  );
  const platformUsers = platformUserIds.length
    ? await prisma.platformUser.findMany({
        where: { id: { in: platformUserIds } },
        select: { id: true, name: true, email: true }
      })
    : [];
  const platformUserById = new Map(platformUsers.map((u) => [u.id, u]));

  return (
    <Card title="Platform Activity Log" description="Easy-to-read timeline of platform changes.">
      <div className="mt-2 text-sm text-white/70">
        <Badge>{logs.length} activities</Badge>
      </div>
      <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
        {logs.map((l) => (
          <div key={l.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="font-medium">{formatAction(l.action)}</div>
              <div className="text-xs text-white/50">{formatDateTime(l.createdAt)}</div>
            </div>
            <div className="text-xs text-white/70 mt-1">
              <span className="text-white/50">Who:</span>{" "}
              {formatActor({
                actorType: l.actorType,
                actorId: l.actorId,
                platformUserById
              })}{" "}
              • <span className="text-white/50">School:</span> {l.schoolId ?? "N/A"} •{" "}
              <span className="text-white/50">Target:</span>{" "}
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

function formatAction(action: string) {
  return humanizeToken(action);
}

function formatActor({
  actorType,
  actorId,
  platformUserById
}: {
  actorType: "PLATFORM_USER" | "SCHOOL_USER" | "SYSTEM";
  actorId: string | null;
  platformUserById: Map<string, { id: string; name: string; email: string }>;
}) {
  if (actorType === "SYSTEM") return "System";
  if (!actorId) return humanizeToken(actorType);
  if (actorType === "PLATFORM_USER") {
    const actor = platformUserById.get(actorId);
    return actor ? `${actor.name} (${actor.email})` : `Platform User (${actorId})`;
  }
  return `School User (${actorId})`;
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
