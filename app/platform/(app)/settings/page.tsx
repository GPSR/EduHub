import Link from "next/link";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureBaseModules } from "@/lib/permissions";
import { CreateCustomSubscriptionForm, CreateModuleForm, SubscriptionPlanSettingsForm } from "./ui";
import { ensureSubscriptionPlanSettings } from "@/lib/subscription";

export default async function PlatformSettingsPage() {
  await requireSuperAdmin();
  await ensureBaseModules();
  await ensureSubscriptionPlanSettings();

  const [modules, planSettings, customPlans] = await Promise.all([
    prisma.module.findMany({ orderBy: { name: "asc" } }),
    prisma.subscriptionPlanSetting.findMany(),
    prisma.customSubscriptionPlan.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  const planByKey = new Map(planSettings.map((p) => [p.plan, p.durationDays]));
  const planAmountByKey = new Map(planSettings.map((p) => [p.plan, p.amountCents]));
  const premiumDays = planByKey.get("PREMIUM") ?? 730;
  const defaultDays = planByKey.get("DEFAULT") ?? 365;
  const defaultAmount = (planAmountByKey.get("DEFAULT") ?? 0) / 100;
  const betaAmount = (planAmountByKey.get("BETA") ?? 0) / 100;
  const unlimitedAmount = (planAmountByKey.get("UNLIMITED") ?? 0) / 100;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Platform Settings</div>
        <div className="text-sm text-white/60">
          View all school modules and open a school to assign/customize enabled modules.
        </div>
      </div>

      <Card title="Available Modules">
        <CreateModuleForm />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((m) => (
            <Link
              key={m.id}
              href={`/platform/settings/modules/${m.id}`}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:bg-white/[0.08] transition"
            >
              <div className="font-semibold text-sm">{m.name}</div>
              <div className="text-xs text-white/50">{m.key}</div>
            </Link>
          ))}
          {modules.length === 0 ? <div className="text-sm text-white/60">No modules found.</div> : null}
        </div>
      </Card>

      <Card
        title="Subscription Mapping"
        description="Configure plan durations used while assigning school subscriptions."
      >
        <SubscriptionPlanSettingsForm
          premiumDays={premiumDays}
          defaultDays={defaultDays}
          defaultAmount={defaultAmount}
          betaAmount={betaAmount}
          unlimitedAmount={unlimitedAmount}
        />
        <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
          <div className="text-sm text-white/70">Create custom subscription plans</div>
          <CreateCustomSubscriptionForm />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {customPlans.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-white/60">
                  {p.code} • {p.durationDays == null ? "Lifetime" : `${p.durationDays} days`} • {formatUsdFromCents(p.amountCents)}
                </div>
              </div>
            ))}
            {customPlans.length === 0 ? <div className="text-sm text-white/60">No custom plans yet.</div> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
