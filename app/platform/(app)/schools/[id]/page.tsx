import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button, Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureBaseModules } from "@/lib/permissions";
import { impersonateSchoolAction, impersonateUserAction } from "./actions";

const MODULE_ICONS: Record<string, string> = {
  STUDENTS: "👥", FEES: "💳", ATTENDANCE: "✅", TIMETABLE: "🗓️", COMMUNICATION: "📢",
  ACADEMICS: "📚", LEARNING_CENTER: "🧠", REPORTS: "📊", NOTIFICATIONS: "🔔",
  GALLERY: "🖼️", YOUTUBE_LEARNING: "▶️", SCHOOL_CALENDAR: "🗓️", LEAVE_REQUESTS: "📝",
  TEACHER_SALARY: "💼", SETTINGS: "⚙️", DASHBOARD: "◈", USERS: "🛡",
};

function avatarColor(name: string) {
  const c = ["from-indigo-400 to-indigo-600","from-violet-400 to-violet-600","from-teal-400 to-teal-600","from-rose-400 to-rose-600","from-amber-400 to-amber-600"];
  return c[name.charCodeAt(0) % c.length];
}

export default async function PlatformSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  await ensureBaseModules();

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      subscription: true,
      invites: { orderBy: { createdAt: "desc" }, take: 20 },
      users: { orderBy: { createdAt: "asc" }, take: 200, include: { schoolRole: true } },
      modules: { include: { module: true } },
    },
  });
  if (!school) return notFound();

  const modules = await prisma.module.findMany({ orderBy: { name: "asc" } });
  const enabledByModuleId = new Map(school.modules.map(m => [m.moduleId, m.enabled]));
  const schoolModules = modules.map(m => ({ id: m.id, key: m.key, name: m.name, enabled: enabledByModuleId.get(m.id) ?? false }));
  const schoolAdminUsers = school.users.filter((u) => u.schoolRole.key === "ADMIN");

  const plan = school.subscription?.plan ?? "TRIAL";

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/platform" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
        ← Platform Dashboard
      </Link>

      {/* School hero */}
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white/95 tracking-tight">{school.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="text-[12px] text-white/40">{school.slug}</code>
              <Badge tone={school.isActive ? "success" : "danger"} dot>{school.isActive ? "Active" : "Inactive"}</Badge>
              <Badge tone={plan === "PREMIUM" || plan === "UNLIMITED" ? "success" : plan === "TRIAL" ? "warning" : "neutral"}>{plan}</Badge>
              {school.subscription?.endsAt && (
                <Badge tone="neutral">Expires {school.subscription.endsAt.toDateString()}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/platform/schools/${school.id}/gallery`}>
              <Button variant="secondary" size="sm">Manage gallery</Button>
            </Link>
            <Link href={`/login?schoolSlug=${encodeURIComponent(school.slug)}`}>
              <Button variant="secondary" size="sm">School login</Button>
            </Link>
            <form action={impersonateSchoolAction} method="post">
              <input type="hidden" name="schoolId" value={school.id} />
              <Button type="submit" size="sm">Impersonate admin</Button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Invite form */}
        <Card title="Invite Admin User" accent="indigo">
          <InviteForm schoolId={school.id} />
        </Card>

        {/* Recent invites */}
        <Card title="Recent Invites (Masked)" accent="teal">
          {school.invites.length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No invites sent yet.</p>
          ) : (
            <div className="space-y-2 mt-1">
              {school.invites.map(inv => {
                const [n, d] = inv.email.split("@");
                const maskedEmail = n && d ? `${n.slice(0, 2)}***@${d}` : "hidden";
                return (
                <div key={inv.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-white/80 truncate">{maskedEmail}</p>
                    <Badge tone={inv.usedAt ? "success" : "neutral"}>{inv.usedAt ? "Used" : "Pending"}</Badge>
                  </div>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Expires {inv.expiresAt.toDateString()}
                    {inv.usedAt && ` · Used ${inv.usedAt.toDateString()}`}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Impersonate school admins only */}
      <Card title="School Admin Access" description="For support, sign in only as school admin users">
        {schoolAdminUsers.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">No school admin users found.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] mt-2">
            {schoolAdminUsers.map((u, i) => {
              const initials = u.name.trim().split(/\s+/).map((p: string) => p[0]).slice(0,2).join("").toUpperCase();
              return (
                <div
                  key={u.id}
                  id={`school-admin-${u.id}`}
                  className={`flex flex-wrap items-center gap-3 py-3 px-1 scroll-mt-24 target:bg-indigo-500/[0.08]
                                              ${i === 0 ? "rounded-t-[12px]" : ""}
                                              ${i === schoolAdminUsers.length - 1 ? "rounded-b-[12px]" : ""}
                                              hover:bg-white/[0.03] transition`}>
                  <div className={`hidden sm:grid h-8 w-8 shrink-0 place-items-center rounded-[9px]
                                    bg-gradient-to-b ${avatarColor(u.name)} text-[11px] font-bold text-white`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/85 truncate">{u.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{u.schoolRole.name}</p>
                  </div>
                  <form action={impersonateUserAction} method="post">
                    <input type="hidden" name="schoolId" value={school.id} />
                    <input type="hidden" name="userId"   value={u.id} />
                    <Button type="submit" variant="secondary" size="sm">Sign in as</Button>
                  </form>

                  <details className="w-full rounded-[12px] border border-white/[0.07] bg-white/[0.03]">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Update School Admin Password
                    </summary>
                    <div className="border-t border-white/[0.07] p-3">
                      <SchoolAdminPasswordForm schoolId={school.id} userId={u.id} />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modules */}
      <Card title="School Modules" description="Enable or disable modules and customize fields per module">
        <SchoolModulesForm schoolId={school.id} modules={schoolModules} />
        <div className="mt-5 pt-4 border-t border-white/[0.07]">
          <p className="text-[12px] font-medium text-white/40 mb-3 uppercase tracking-wider">Customize per module</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {schoolModules.map(m => (
              <Link
                key={m.id}
                href={`/platform/schools/${school.id}/modules/${m.id}`}
                className="flex items-center gap-2 rounded-[12px] border border-white/[0.07]
                           bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.07] hover:border-white/[0.12] transition group"
              >
                <span className="text-sm">{MODULE_ICONS[m.key] ?? "•"}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-white/75 group-hover:text-white/90 transition truncate">{m.name}</p>
                  <p className="text-[10px] text-white/35">{m.enabled ? "Enabled" : "Disabled"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

async function InviteForm({ schoolId }: { schoolId: string }) {
  const { PlatformInviteForm } = await import("./ui");
  return <PlatformInviteForm schoolId={schoolId} />;
}

async function SchoolModulesForm(props: { schoolId: string; modules: Array<{ id: string; key: string; name: string; enabled: boolean }> }) {
  const { PlatformSchoolModulesForm } = await import("./ui");
  return <PlatformSchoolModulesForm schoolId={props.schoolId} modules={props.modules} />;
}

async function SchoolAdminPasswordForm({ schoolId, userId }: { schoolId: string; userId: string }) {
  const { PlatformSchoolAdminPasswordForm } = await import("./ui");
  return <PlatformSchoolAdminPasswordForm schoolId={schoolId} userId={userId} />;
}
