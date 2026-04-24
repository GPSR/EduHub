import { Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
function humanize(v: string) {
  return v.toLowerCase().split("_").map(p => p[0].toUpperCase() + p.slice(1)).join(" ");
}
function safeMeta(json: string): Record<string, unknown> | null {
  try { const p = JSON.parse(json) as unknown; return (p && typeof p === "object" && !Array.isArray(p)) ? p as Record<string, unknown> : null; } catch { return null; }
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
    const pairs = Object.entries(obj).slice(0, 6).map(([k, v]) => `${humanize(k)}=${stringifyValue(v)}`);
    return pairs.join(", ") || "Updated";
  }
  return String(value);
}
function formatMetaEntries(meta: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(meta)) {
    if (k === "selectedModules") {
      const ids = String(v ?? "").split(",").map(x => x.trim()).filter(Boolean);
      out.push([k, ids.length ? `${ids.length} module(s) selected` : "No modules selected"]);
      continue;
    }
    if (k.toLowerCase().includes("password") || k.toLowerCase().includes("token")) {
      out.push([k, "Hidden"]);
      continue;
    }
    if (typeof v === "string" && /(cmo|cui)[a-z0-9]{8,}/i.test(v)) {
      out.push([k, shortId(v)]);
      continue;
    }
    out.push([k, stringifyValue(v)]);
  }
  return out;
}

export default async function PlatformAuditPage() {
  await requireSuperAdmin();
  const rawLogs = await prisma.auditLog.findMany({
    where: { actorType: { in: ["PLATFORM_USER", "SCHOOL_USER", "SYSTEM"] } },
    orderBy: { createdAt: "desc" }, take: 500,
  });
  const puIds = Array.from(new Set(rawLogs.filter(l => l.actorType === "PLATFORM_USER" && l.actorId).map(l => l.actorId as string)));
  const suIds = Array.from(new Set(rawLogs.filter(l => l.actorType === "SCHOOL_USER" && l.actorId).map(l => l.actorId as string)));
  const pUsers = puIds.length
    ? await prisma.platformUser.findMany({
        where: { id: { in: puIds } },
        select: { id: true, name: true, email: true, role: true }
      })
    : [];
  const sUsers = suIds.length
    ? await prisma.user.findMany({
        where: { id: { in: suIds } },
        select: {
          id: true,
          name: true,
          email: true,
          schoolRole: { select: { key: true, name: true } }
        }
      })
    : [];
  const byId = new Map(pUsers.map(u => [u.id, u]));
  const schoolUserById = new Map(sUsers.map(u => [u.id, u]));
  const logs = rawLogs
    .filter((l) => {
      if (l.actorType !== "SCHOOL_USER") return true;
      const user = l.actorId ? schoolUserById.get(l.actorId) : undefined;
      return user?.schoolRole?.key === "ADMIN";
    })
    .slice(0, 200);

  function actor(actorType: string, actorId: string | null) {
    if (actorType === "SYSTEM") return "System";
    if (!actorId) return humanize(actorType);
    if (actorType === "PLATFORM_USER") {
      const u = byId.get(actorId);
      if (!u) return "Platform User";
      const roleLabel = u.role === "SUPER_ADMIN" ? "Super Admin" : "Support User";
      return `${u.name} (${roleLabel})`;
    }
    const schoolUser = schoolUserById.get(actorId);
    if (schoolUser) return `${schoolUser.name} (${schoolUser.schoolRole?.name ?? "School User"})`;
    return "School User";
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Platform Audit Log" subtitle="Timeline of all platform-level activity" />
        <Badge tone="neutral">{logs.length} events</Badge>
      </div>

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04]">
        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/40">No platform activity yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {logs.map((l, i) => {
              const meta = l.metadataJson ? safeMeta(l.metadataJson) : null;
              return (
                <div key={l.id} className={`flex gap-4 px-5 py-4 hover:bg-white/[0.02] transition
                                              ${i === 0 ? "rounded-t-[22px]" : ""}
                                              ${i === logs.length - 1 ? "rounded-b-[22px]" : ""}`}>
                  <div className="mt-1.5 shrink-0 flex flex-col items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-400/50" />
                    {i !== logs.length - 1 && <span className="w-px flex-1 min-h-[1rem] bg-white/[0.05]" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p className="text-[14px] font-semibold text-white/85">{humanize(l.action)}</p>
                      <time className="text-[11px] text-white/30 shrink-0">{fmt(l.createdAt)}</time>
                    </div>
                    <div className="mt-1 text-[12px] text-white/45 flex flex-wrap items-center gap-1.5">
                      <span>{actor(l.actorType, l.actorId)}</span>
                      {l.schoolId && <><span className="text-white/20">·</span><span>School: {shortId(l.schoolId)}</span></>}
                      {l.entityType && <><span className="text-white/20">·</span><span>{humanize(l.entityType)}{l.entityId ? ` ${shortId(l.entityId)}` : ""}</span></>}
                    </div>
                    {meta && Object.entries(meta).length > 0 && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {formatMetaEntries(meta).map(([k, v]) => (
                          <div
                            key={k}
                            className="rounded-[10px] border border-white/[0.10] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/65 leading-relaxed break-words"
                          >
                            <span className="text-white/40">{humanize(k)}:</span>{" "}
                            <span className="break-words">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
