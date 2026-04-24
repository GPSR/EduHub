import Link from "next/link";
import { Badge, SectionHeader, Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

const STATUS_VALUES = ["ALL", "ACTIVE", "INACTIVE"] as const;
const PLAN_VALUES = ["ALL", "TRIAL", "BETA", "PREMIUM", "UNLIMITED", "CUSTOM"] as const;
const SORT_VALUES = ["NAME_ASC", "NAME_DESC", "NEWEST", "STUDENTS_DESC"] as const;
const ADMIN_VALUES = ["ALL", "WITH_ADMIN", "NO_ADMIN"] as const;

function parseFilter<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: T[number]
): T[number] {
  if (value && (allowed as readonly string[]).includes(value)) return value as T[number];
  return fallback;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "hidden";
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function PlatformSchoolsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; plan?: string; sort?: string; admin?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const status = parseFilter(params.status, STATUS_VALUES, "ALL");
  const plan = parseFilter(params.plan, PLAN_VALUES, "ALL");
  const sort = parseFilter(params.sort, SORT_VALUES, "NAME_ASC");
  const admin = parseFilter(params.admin, ADMIN_VALUES, "ALL");

  const where: Record<string, unknown> = {};
  if (status === "ACTIVE") where.isActive = true;
  if (status === "INACTIVE") where.isActive = false;
  if (admin === "WITH_ADMIN") where.users = { some: { schoolRole: { key: "ADMIN" } } };
  if (admin === "NO_ADMIN") where.users = { none: { schoolRole: { key: "ADMIN" } } };

  const schools = await prisma.school.findMany({
    where,
    include: { subscription: { include: { customPlan: true } }, users: { select: { id: true } }, students: { select: { id: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  const planFilteredSchools = plan === "ALL"
    ? schools
    : schools.filter((s) => (s.subscription?.plan ?? "N/A") === plan);

  const sortedSchools = [...planFilteredSchools];
  if (sort === "NAME_DESC") {
    sortedSchools.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sort === "NEWEST") {
    sortedSchools.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sort === "STUDENTS_DESC") {
    sortedSchools.sort((a, b) => (b.students.length - a.students.length) || a.name.localeCompare(b.name));
  }

  const adminUsers = sortedSchools.length
    ? await prisma.user.findMany({
      where: { schoolId: { in: sortedSchools.map((s) => s.id) }, schoolRole: { key: "ADMIN" } },
        select: { id: true, schoolId: true, name: true, email: true },
        orderBy: { name: "asc" }
      })
    : [];
  const adminBySchoolId = new Map<string, Array<{ id: string; name: string; email: string }>>();
  for (const admin of adminUsers) {
    const arr = adminBySchoolId.get(admin.schoolId) ?? [];
    arr.push({ id: admin.id, name: admin.name, email: admin.email });
    adminBySchoolId.set(admin.schoolId, arr);
  }
  const hasActiveFilters = status !== "ALL" || plan !== "ALL" || admin !== "ALL" || sort !== "NAME_ASC";
  const subtitle = `${sortedSchools.length} school${sortedSchools.length !== 1 ? "s" : ""} shown${hasActiveFilters ? " · filtered" : ""}`;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Schools" subtitle={subtitle} />
      <Card>
        <form action="/platform/schools" method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition"
            >
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Plan</label>
            <select
              name="plan"
              defaultValue={plan}
              className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition"
            >
              <option value="ALL">All plans</option>
              <option value="TRIAL">Trial</option>
              <option value="BETA">Beta</option>
              <option value="PREMIUM">Premium</option>
              <option value="UNLIMITED">Unlimited</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Admin</label>
            <select
              name="admin"
              defaultValue={admin}
              className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition"
            >
              <option value="ALL">All schools</option>
              <option value="WITH_ADMIN">With admin</option>
              <option value="NO_ADMIN">No admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Sort</label>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition"
            >
              <option value="NAME_ASC">Name A-Z</option>
              <option value="NAME_DESC">Name Z-A</option>
              <option value="NEWEST">Newest first</option>
              <option value="STUDENTS_DESC">Most students</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-1">
            <Link
              href="/platform/schools"
              className="rounded-[11px] border border-white/[0.10] bg-white/[0.05] px-3.5 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.10] transition"
            >
              Reset
            </Link>
            <button
              type="submit"
              className="rounded-[11px] bg-gradient-to-b from-indigo-400 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.5)] hover:from-indigo-300 hover:to-indigo-500 transition"
            >
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04]">
        {sortedSchools.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/40">No schools onboarded yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {sortedSchools.map((s, i) => {
              const planLabel = s.subscription?.plan === "CUSTOM"
                ? (s.subscription.customPlan?.name ?? "Custom") : (s.subscription?.plan ?? "N/A");
              return (
                <Link
                  key={s.id}
                  href={`/platform/schools/${s.id}/dashboard`}
                  className={`flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors
                               ${i === 0 ? "rounded-t-[22px]" : ""}
                               ${i === sortedSchools.length-1 ? "rounded-b-[22px]" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-white/90">{s.name}</span>
                      <span className="text-[12px] text-white/35">({s.slug})</span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-1 flex flex-wrap gap-3">
                      <span>
                        Admins: {(adminBySchoolId.get(s.id) ?? []).map((a) => `${a.name} (${maskEmail(a.email)})`).join(", ") || "Not assigned"}
                      </span>
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
