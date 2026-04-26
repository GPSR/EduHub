import Link from "next/link";
import { Card, Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureBaseModules } from "@/lib/permissions";
import { ApplyIndustryTemplatesForm, CreateCustomSubscriptionForm, CreateModuleForm, SubscriptionPlanSettingsForm } from "./ui";
import { ensureSubscriptionPlanSettings } from "@/lib/subscription";

const MODULE_ICONS: Record<string, string> = {
  STUDENTS: "👥", FEES: "💳", ATTENDANCE: "✅", TIMETABLE: "🗓️", COMMUNICATION: "📢",
  ACADEMICS: "📚", LEARNING_CENTER: "🧠", REPORTS: "📊", NOTIFICATIONS: "🔔",
  GALLERY: "🖼️", YOUTUBE_LEARNING: "▶️", SCHOOL_CALENDAR: "🗓️", LEAVE_REQUESTS: "📝",
  TEACHER_SALARY: "💼", SETTINGS: "⚙️", DASHBOARD: "◈", USERS: "🛡",
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function PlatformSettingsPage() {
  await requireSuperAdmin();
  await ensureBaseModules();
  await ensureSubscriptionPlanSettings();

  const [modules, planSettings, customPlans] = await Promise.all([
    prisma.module.findMany({ orderBy: { name: "asc" } }),
    prisma.subscriptionPlanSetting.findMany(),
    prisma.customSubscriptionPlan.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const planByKey       = new Map(planSettings.map(p => [p.plan, p.durationDays]));
  const planAmountByKey = new Map(planSettings.map(p => [p.plan, p.amountCents]));

  return (
    <div className="space-y-5 animate-fade-up pb-safe">
      <SectionHeader title="Platform Settings" subtitle="Modules, subscription plans and global configuration" />

      {/* Modules */}
      <Card title="Available Modules" description="Click a module to edit its fields and defaults" accent="indigo">
        <div className="mb-4 mt-1">
          <CreateModuleForm />
        </div>
        <div className="mb-4">
          <ApplyIndustryTemplatesForm />
        </div>
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {modules.map(m => (
            <Link
              key={m.id}
              href={`/platform/settings/modules/${m.id}`}
              className="flex items-center gap-2.5 rounded-[13px] border border-white/[0.08]
                         min-h-[56px] bg-white/[0.03] px-3.5 py-3 hover:bg-white/[0.07] hover:border-white/[0.13]
                         active:bg-white/[0.08]
                         transition-all group"
            >
              <span className="text-lg">{MODULE_ICONS[m.key] ?? "•"}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white/80 group-hover:text-white/95 transition truncate">{m.name}</p>
                <p className="text-[10px] text-white/35 break-all">{m.key}</p>
              </div>
            </Link>
          ))}
          {modules.length === 0 && <p className="text-sm text-white/40 col-span-full">No modules found.</p>}
        </div>
      </Card>

      {/* Subscription plan settings */}
      <Card title="Subscription Plans" description="Set durations and prices for standard plan tiers" accent="teal">
        <SubscriptionPlanSettingsForm
          premiumDays={planByKey.get("PREMIUM") ?? 730}
          defaultDays={planByKey.get("DEFAULT") ?? 365}
          defaultAmount={(planAmountByKey.get("DEFAULT") ?? 0) / 100}
          betaAmount={(planAmountByKey.get("BETA") ?? 0) / 100}
          unlimitedAmount={(planAmountByKey.get("UNLIMITED") ?? 0) / 100}
        />
      </Card>

      {/* Custom plans */}
      <Card title="Custom Plans" description="One-off pricing arrangements for specific schools" accent="indigo">
        <div className="mb-5">
          <CreateCustomSubscriptionForm />
        </div>
        {customPlans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
            {customPlans.map(p => (
              <div key={p.id} className="rounded-[13px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <p className="text-[13px] font-semibold text-white/85">{p.name}</p>
                <p className="text-[11px] font-mono text-white/40 mt-0.5">{p.code}</p>
                <p className="text-[14px] font-bold text-white/90 mt-2">{fmt(p.amountCents)}</p>
                <p className="text-[11px] text-white/35">
                  {p.durationDays == null ? "Lifetime" : `${p.durationDays} days`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">No custom plans yet.</p>
        )}
      </Card>
    </div>
  );
}
