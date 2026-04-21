import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

export default async function PlatformSchoolsPage() {
  await requireSuperAdmin();

  const schools = await prisma.school.findMany({
    include: {
      subscription: { include: { customPlan: true } },
      users: { select: { id: true } },
      students: { select: { id: true } }
    },
    orderBy: { name: "asc" },
    take: 500
  });

  return (
    <div className="space-y-6">
      <Card title="Schools" description="Click a school to open its dashboard metrics.">
        <div className="text-sm text-white/60">{schools.length} schools</div>
        <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {schools.map((s) => (
            <Link key={s.id} href={`/platform/schools/${s.id}/dashboard`} className="block px-4 py-3 hover:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {s.name}
                    <span className="text-xs text-white/50">({s.slug})</span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Plan:{" "}
                    {s.subscription?.plan === "CUSTOM" ? (s.subscription.customPlan?.name ?? "Custom") : (s.subscription?.plan ?? "N/A")}{" "}
                    • Students: {s.students.length} • Users: {s.users.length}
                  </div>
                </div>
                <Badge tone={s.isActive ? "success" : "danger"}>{s.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
              </div>
            </Link>
          ))}
          {schools.length === 0 ? <div className="px-4 py-8 text-sm text-white/60">No schools found.</div> : null}
        </div>
      </Card>
    </div>
  );
}
