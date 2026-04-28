import { Card, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { describeAuditAction, humanizeAuditToken } from "@/lib/audit-display";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";

export default async function SchoolAuditPage() {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const logs = await db.auditLog.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const schoolUserIds = Array.from(
    new Set(logs.filter(l => l.actorType === "SCHOOL_USER" && l.actorId).map(l => l.actorId as string))
  );
  const platformUserIds = Array.from(
    new Set(logs.filter(l => l.actorType === "PLATFORM_USER" && l.actorId).map(l => l.actorId as string))
  );
  const schoolUsers = schoolUserIds.length
    ? await db.user.findMany({
        where: { id: { in: schoolUserIds } },
        select: { id: true, name: true, email: true, schoolRole: { select: { key: true, name: true } } },
      })
    : [];
  const platformUsers = platformUserIds.length
    ? await db.platformUser.findMany({
        where: { id: { in: platformUserIds } },
        select: { id: true, name: true, email: true, role: true }
      })
    : [];
  const schoolUserById = new Map(schoolUsers.map(u => [u.id, u]));
  const platformUserById = new Map(platformUsers.map(u => [u.id, u]));

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
            {logs.map((l, i) => {
              const action = describeAuditAction(l.action);
              const actor = formatActor({
                actorType: l.actorType,
                actorId: l.actorId,
                schoolUserById,
                platformUserById
              });

              return (
                <div
                  key={l.id}
                  className={`flex gap-4 px-4 py-3.5
                               ${i === 0 ? "rounded-t-[16px]" : ""}
                               ${i === logs.length - 1 ? "rounded-b-[16px]" : ""}
                               hover:bg-white/[0.02] transition`}
                >
                  <div className="mt-1.5 shrink-0 flex flex-col items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-400/60" />
                    {i !== logs.length - 1 && <span className="w-px flex-1 min-h-[1rem] bg-white/[0.06]" />}
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-white/90">{action.title}</p>
                        <p className="mt-0.5 text-[12px] text-white/50">{action.description}</p>
                      </div>
                      <time className="text-[11px] text-white/30 shrink-0">{formatDateTime(l.createdAt)}</time>
                    </div>
                    <div className="mt-1.5 text-[12px] text-white/45 flex flex-wrap items-center gap-1.5">
                      <span>{actor.label}</span>
                      {actor.roleBadge && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            actor.isAdmin
                              ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
                              : "border-white/[0.16] bg-white/[0.05] text-white/70"
                          }`}
                        >
                          {actor.roleBadge}
                        </span>
                      )}
                      {l.entityType && (
                        <>
                          <span className="text-white/20">·</span>
                          <span>{humanizeAuditToken(l.entityType)}{l.entityId ? ` ${shortId(l.entityId)}` : ""}</span>
                        </>
                      )}
                    </div>
                    {l.metadataJson && <MetadataRow metadataJson={l.metadataJson} />}
                  </div>
                </div>
              );
            })}
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

function formatActor({ actorType, actorId, schoolUserById, platformUserById }: {
  actorType: "PLATFORM_USER" | "SCHOOL_USER" | "SYSTEM";
  actorId: string | null;
  schoolUserById: Map<string, { id: string; name: string; email: string; schoolRole: { key: string; name: string } | null }>;
  platformUserById: Map<string, { id: string; name: string; email: string; role: "SUPER_ADMIN" | "SUPPORT_USER" }>;
}): { label: string; roleBadge?: string; isAdmin: boolean } {
  if (actorType === "SYSTEM") return { label: "System", roleBadge: "System", isAdmin: false };
  if (!actorId) return { label: humanizeAuditToken(actorType), isAdmin: false };
  if (actorType === "SCHOOL_USER") {
    const actor = schoolUserById.get(actorId);
    if (!actor) return { label: `User ${shortId(actorId)}`, roleBadge: "School User", isAdmin: false };
    const roleName = actor.schoolRole?.name ?? "School User";
    const isAdmin = actor.schoolRole?.key === "ADMIN";
    return { label: actor.name, roleBadge: roleName, isAdmin };
  }
  const platformActor = platformUserById.get(actorId);
  if (platformActor) {
    const roleLabel = platformActor.role === "SUPER_ADMIN" ? "Super Admin" : "Support User";
    return { label: platformActor.name, roleBadge: roleLabel, isAdmin: true };
  }
  return { label: "Platform User", roleBadge: "Platform", isAdmin: false };
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
          <span className="text-white/40">{humanizeAuditToken(key)}:</span>{" "}
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
  if (Array.isArray(value)) return value.length ? value.map((v) => stringifyValue(v)).join(", ") : "None";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("before" in obj || "after" in obj) {
      return `Before: ${stringifyValue(obj.before)} | After: ${stringifyValue(obj.after)}`;
    }
    if ("old" in obj || "new" in obj) {
      return `Old: ${stringifyValue(obj.old)} | New: ${stringifyValue(obj.new)}`;
    }
    const pairs = Object.entries(obj).slice(0, 6).map(([k, v]) => `${humanizeAuditToken(k)}=${stringifyValue(v)}`);
    return pairs.join(", ") || "Updated";
  }
  return String(value);
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
