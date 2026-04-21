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

export default async function PlatformAuditPage() {
  await requireSuperAdmin();
  const logs = await prisma.auditLog.findMany({
    where: { actorType: { in: ["PLATFORM_USER", "SYSTEM"] } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  const puIds = Array.from(new Set(logs.filter(l => l.actorType === "PLATFORM_USER" && l.actorId).map(l => l.actorId as string)));
  const pUsers = puIds.length ? await prisma.platformUser.findMany({ where: { id: { in: puIds } }, select: { id: true, name: true, email: true } }) : [];
  const byId = new Map(pUsers.map(u => [u.id, u]));

  function actor(actorType: string, actorId: string | null) {
    if (actorType === "SYSTEM") return "System";
    if (!actorId) return humanize(actorType);
    if (actorType === "PLATFORM_USER") { const u = byId.get(actorId); return u ? `${u.name} (${u.email})` : `Platform User`; }
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
                      {l.schoolId && <><span className="text-white/20">·</span><span>School: {l.schoolId}</span></>}
                      {l.entityType && <><span className="text-white/20">·</span><span>{humanize(l.entityType)}{l.entityId ? ` ${l.entityId}` : ""}</span></>}
                    </div>
                    {meta && Object.entries(meta).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(meta).map(([k, v]) => (
                          <span key={k} className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/55">
                            {humanize(k)}: {String(v)}
                          </span>
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
