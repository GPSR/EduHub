import { Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { RequestApprovalForm } from "./ui";
import { ensureBaseModules } from "@/lib/permissions";

export default async function PlatformOnboardingRequestsPage() {
  await requireSuperAdmin();
  await ensureBaseModules();

  const [requests, modules, schoolModules] = await Promise.all([
    db.schoolOnboardingRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        schoolName: true,
        schoolSlug: true,
        adminName: true,
        adminEmail: true,
        status: true,
        note: true,
        createdAt: true
      }
    }),
    db.module.findMany({ orderBy: { name: "asc" } }),
    db.schoolModule.findMany({ where: { enabled: true }, select: { moduleId: true } }),
  ]);

  const defaultEnabled = new Set(schoolModules.map(m => m.moduleId));
  const pending  = requests.filter(r => r.status === "PENDING");
  const history  = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Onboarding Requests"
          subtitle="Approve or reject new school sign-up requests"
        />
        <div className="flex items-center gap-2">
          {pending.length > 0 && <Badge tone="warning" dot>{pending.length} pending</Badge>}
          <Badge tone="neutral">{history.length} processed</Badge>
        </div>
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] py-8">
          <EmptyState icon="✓" title="No pending requests" description="All caught up — new requests will appear here." />
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(r => (
            <div key={r.id} className="rounded-[22px] border border-amber-500/20 bg-amber-500/[0.04] p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[16px] font-bold text-white/95">{r.schoolName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-white/45">
                    <span>Slug: <code className="text-white/60">{r.schoolSlug}</code></span>
                    <span className="text-white/20">·</span>
                    <span>Admin: {r.adminName} ({r.adminEmail})</span>
                    <span className="text-white/20">·</span>
                    <span>Submitted {r.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge tone="warning" dot>Pending</Badge>
              </div>
              <RequestApprovalForm
                requestId={r.id}
                modules={modules.map(m => ({ id: m.id, key: m.key, name: m.name, enabledByDefault: defaultEnabled.has(m.id) }))}
              />
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04]">
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <p className="text-[13px] font-semibold text-white/55 uppercase tracking-wider">Processed</p>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {history.map((r, i) => (
              <div key={r.id} className={`flex items-start justify-between gap-4 px-5 py-4
                                           ${i === history.length - 1 ? "rounded-b-[22px]" : ""}`}>
                <div>
                  <p className="text-[14px] font-semibold text-white/85">{r.schoolName}</p>
                  <div className="text-[12px] text-white/40 mt-0.5 flex flex-wrap gap-2">
                    <span>Slug: <code className="text-white/55">{r.schoolSlug}</code></span>
                    <span>·</span>
                    <span>{r.adminEmail}</span>
                    {r.note && <><span>·</span><span className="italic">{r.note}</span></>}
                  </div>
                </div>
                <Badge tone={r.status === "APPROVED" ? "success" : r.status === "HOLD" ? "warning" : "danger"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
