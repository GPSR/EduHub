import Link from "next/link";
import { Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

export default async function PlatformSchoolsPage() {
  await requireSuperAdmin();

  const schools = await prisma.school.findMany({
    include: { subscription: { include: { customPlan: true } }, users: { select: { id: true } }, students: { select: { id: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Schools" subtitle={`${schools.length} total schools on the platform`} />

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04]">
        {schools.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/40">No schools onboarded yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {schools.map((s, i) => {
              const planLabel = s.subscription?.plan === "CUSTOM"
                ? (s.subscription.customPlan?.name ?? "Custom") : (s.subscription?.plan ?? "N/A");
              return (
                <Link
                  key={s.id}
                  href={`/platform/schools/${s.id}/dashboard`}
                  className={`flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors
                               ${i === 0 ? "rounded-t-[22px]" : ""}
                               ${i === schools.length-1 ? "rounded-b-[22px]" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-white/90">{s.name}</span>
                      <span className="text-[12px] text-white/35">({s.slug})</span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-1 flex flex-wrap gap-3">
                      <span>👥 {s.students.length} students</span>
                      <span>🏫 {s.users.length} users</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={planLabel === "PREMIUM" || planLabel === "UNLIMITED" ? "success" : planLabel === "TRIAL" ? "warning" : "neutral"}>
                      {planLabel}
                    </Badge>
                    <Badge tone={s.isActive ? "success" : "danger"} dot>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/20">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
