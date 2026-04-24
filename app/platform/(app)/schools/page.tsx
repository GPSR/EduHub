import Link from "next/link";
import { Badge, SectionHeader, Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "hidden";
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function PlatformSchoolsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const schools = await prisma.school.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            {
              users: {
                some: {
                  schoolRole: { key: "ADMIN" },
                  OR: [{ name: { contains: query } }, { email: { contains: query } }]
                }
              }
            }
          ]
        }
      : undefined,
    include: { subscription: { include: { customPlan: true } }, users: { select: { id: true } }, students: { select: { id: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  const adminUsers = schools.length
    ? await prisma.user.findMany({
        where: { schoolId: { in: schools.map((s) => s.id) }, schoolRole: { key: "ADMIN" } },
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

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Schools" subtitle={`${schools.length} total schools on the platform`} />
      <Card>
        <form action="/platform/schools" method="get" className="mx-auto max-w-3xl">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              type="search"
              enterKeyHint="search"
              name="q"
              defaultValue={query}
              list="school-search"
              placeholder="Search schools or school admin"
              className="w-full rounded-full border border-white/[0.12] bg-white/[0.04] pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition"
            />
            <datalist id="school-search">
              {schools.map((s) => (
                <option key={`school-${s.id}`} value={s.name}>{`School · ${s.slug}`}</option>
              ))}
              {adminUsers.map((u) => (
                <option key={`admin-${u.id}`} value={u.name}>{`Admin · ${maskEmail(u.email)}`}</option>
              ))}
            </datalist>
          </div>
        </form>
      </Card>

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
