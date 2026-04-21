import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureSubscriptionPlanSettings } from "@/lib/subscription";

export default async function PlatformSubscriptionsPage() {
  await requireSuperAdmin();
  await ensureSubscriptionPlanSettings();

  const [planSettings, customPlans, schools] = await Promise.all([
    prisma.subscriptionPlanSetting.findMany({ orderBy: { plan: "asc" } }),
    prisma.customSubscriptionPlan.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.school.findMany({
      include: { subscription: { include: { customPlan: true } } },
      orderBy: { name: "asc" },
      take: 300
    })
  ]);

  return (
    <div className="space-y-6">
      <Card title="Subscription Details" description="Configured plan durations used during subscription assignment.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {planSettings.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="font-semibold">{p.plan}</div>
              <div className="text-sm text-white/70">
                {p.durationDays == null ? "Lifetime (No Expiry)" : `${p.durationDays} days`} • {formatUsdFromCents(p.amountCents)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="text-sm text-white/70 mb-2">Custom plans</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {customPlans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-white/70">
                  {p.code} • {p.durationDays == null ? "Lifetime" : `${p.durationDays} days`} • {formatUsdFromCents(p.amountCents)}
                </div>
              </div>
            ))}
            {customPlans.length === 0 ? <div className="text-sm text-white/60">No custom plans configured.</div> : null}
          </div>
        </div>
      </Card>

      <Card title="Subscribed Schools List" description="All schools and their current subscription details.">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {schools.map((school) => {
            const sub = school.subscription;
            return (
              <div key={school.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{school.name}</div>
                  <Badge tone={school.isActive ? "success" : "danger"}>{school.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                </div>
                <div className="text-xs text-white/60 mt-1">
                  Slug: <code>{school.slug}</code> • Plan: {sub?.plan === "CUSTOM" ? (sub.customPlan?.name ?? "Custom") : (sub?.plan ?? "N/A")} • Amount: {formatUsdFromCents(sub?.amountCents ?? 0)} • Status: {sub?.status ?? "N/A"} •
                  Ends: {sub?.endsAt ? sub.endsAt.toDateString() : "Lifetime / N/A"}
                </div>
              </div>
            );
          })}
          {schools.length === 0 ? <div className="px-4 py-8 text-sm text-white/60">No subscribed schools found.</div> : null}
        </div>
      </Card>
    </div>
  );
}

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
