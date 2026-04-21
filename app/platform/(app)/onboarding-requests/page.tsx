import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { RequestApprovalForm } from "./ui";
import { ensureBaseModules } from "@/lib/permissions";

export default async function PlatformOnboardingRequestsPage() {
  await requireSuperAdmin();
  await ensureBaseModules();

  const [requests, modules, schoolModules] = await Promise.all([
    prisma.schoolOnboardingRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200
    }),
    prisma.module.findMany({ orderBy: { name: "asc" } }),
    prisma.schoolModule.findMany({ where: { enabled: true }, select: { moduleId: true } })
  ]);

  const defaultEnabled = new Set(schoolModules.map((m) => m.moduleId));
  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <Card title="Onboarding Requests" description="Approve or reject new school onboarding requests.">
        <div className="text-sm text-white/70">
          <Badge tone="info">{pending.length} pending</Badge>
          <span className="ml-2 text-white/50">{history.length} processed</span>
        </div>
      </Card>

      <Card title="Pending Requests">
        <div className="space-y-4">
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold">{r.schoolName}</div>
              <div className="text-xs text-white/60 mt-1">
                Slug: <code>{r.schoolSlug}</code> • Admin: {r.adminName} ({r.adminEmail}) • Submitted:{" "}
                {r.createdAt.toLocaleString()}
              </div>
              <div className="mt-4">
                <RequestApprovalForm
                  requestId={r.id}
                  modules={modules.map((m) => ({
                    id: m.id,
                    key: m.key,
                    name: m.name,
                    enabledByDefault: defaultEnabled.has(m.id)
                  }))}
                />
              </div>
            </div>
          ))}
          {pending.length === 0 ? <div className="text-sm text-white/60">No pending requests.</div> : null}
        </div>
      </Card>

      <Card title="Processed Requests">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {history.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{r.schoolName}</div>
                <Badge tone={r.status === "APPROVED" ? "success" : "danger"}>{r.status}</Badge>
              </div>
              <div className="text-xs text-white/60 mt-1">
                Slug: <code>{r.schoolSlug}</code> • Admin: {r.adminEmail}
              </div>
              {r.note ? <div className="text-xs text-white/70 mt-1">Note: {r.note}</div> : null}
            </div>
          ))}
          {history.length === 0 ? <div className="px-4 py-8 text-sm text-white/60">No processed requests.</div> : null}
        </div>
      </Card>
    </div>
  );
}
