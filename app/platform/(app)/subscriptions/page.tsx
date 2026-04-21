import Link from "next/link";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureSubscriptionPlanSettings } from "@/lib/subscription";

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function planTone(plan: string): "success" | "info" | "warning" | "neutral" {
  if (plan === "PREMIUM" || plan === "UNLIMITED") return "success";
  if (plan === "BETA") return "info";
  if (plan === "TRIAL") return "warning";
  return "neutral";
}

export default async function PlatformSubscriptionsPage() {
  await requireSuperAdmin();
  await ensureSubscriptionPlanSettings();

  const [planSettings, customPlans, schools] = await Promise.all([
    prisma.subscriptionPlanSetting.findMany({ orderBy: { plan: "asc" } }),
    prisma.customSubscriptionPlan.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.school.findMany({
      include: { subscription: { include: { customPlan: true } } },
      orderBy: { name: "asc" }, take: 300,
    }),
  ]);

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Subscriptions" subtitle="Plan configuration and school billing overview" />

      {/* Standard plans grid */}
      <Card title="Standard Plans" description="Configured durations and prices for each plan tier" accent="indigo">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
          {planSettings.map(p => (
            <div key={p.id} className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={planTone(p.plan)}>{p.plan}</Badge>
              </div>
              <p className="text-lg font-bold text-white/90">{fmt(p.amountCents)}</p>
              <p className="text-[12px] text-white/40 mt-0.5">
                {p.durationDays == null ? "Lifetime — no expiry" : `${p.durationDays} days`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom plans */}
      <Card title="Custom Plans" description="School-specific pricing arrangements" accent="teal">
        {customPlans.length === 0 ? (
          <div className="py-6 text-center text-sm text-white/40">No custom plans configured.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
            {customPlans.map(p => (
              <div key={p.id} className="rounded-[14px] border border-teal-500/20 bg-teal-500/[0.04] px-4 py-3.5">
                <p className="text-[13px] font-semibold text-white/85">{p.name}</p>
                <p className="text-[11px] font-mono text-teal-300/70 mb-2">{p.code}</p>
                <p className="text-lg font-bold text-white/90">{fmt(p.amountCents)}</p>
                <p className="text-[12px] text-white/40 mt-0.5">
                  {p.durationDays == null ? "Lifetime" : `${p.durationDays} days`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schools list */}
      <Card title="All Schools" description={`${schools.length} schools with subscription details`}>
        <div className="divide-y divide-white/[0.06] mt-2">
          {schools.map((s, i) => {
            const sub = s.subscription;
            const planLabel = sub?.plan === "CUSTOM" ? (sub.customPlan?.name ?? "Custom") : (sub?.plan ?? "TRIAL");
            return (
              <div key={s.id} className={`flex flex-wrap items-start gap-4 py-3.5 px-1
                                           hover:bg-white/[0.02] transition
                                           ${i === 0 ? "rounded-t-[12px]" : ""}
                                           ${i === schools.length - 1 ? "rounded-b-[12px]" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/platform/schools/${s.id}`} className="text-[14px] font-semibold text-white/85 hover:text-white transition">
                      {s.name}
                    </Link>
                    <code className="text-[11px] text-white/35">{s.slug}</code>
                    <Badge tone={s.isActive ? "success" : "danger"} dot>{s.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="text-[12px] text-white/40 mt-1 flex flex-wrap gap-3">
                    {sub?.endsAt && <span>Expires {sub.endsAt.toDateString()}</span>}
                    {sub?.status && <span>Status: {sub.status}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-bold text-white/85">{fmt(sub?.amountCents ?? 0)}</p>
                  <Badge tone={planTone(planLabel)}>{planLabel}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
