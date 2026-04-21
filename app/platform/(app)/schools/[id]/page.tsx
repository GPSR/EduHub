import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ensureBaseModules } from "@/lib/permissions";
import { impersonateSchoolAction, impersonateUserAction } from "./actions";

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
      modules: { include: { module: true } }
    }
  });
  if (!school) return notFound();

  const modules = await prisma.module.findMany({ orderBy: { name: "asc" } });
  const schoolEnabledByModuleId = new Map(school.modules.map((m) => [m.moduleId, m.enabled]));
  const schoolModules = modules.map((m) => ({
    id: m.id,
    key: m.key,
    name: m.name,
    enabled: schoolEnabledByModuleId.get(m.id) ?? false
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{school.name}</div>
          <div className="text-sm text-white/60">
            Slug: <code>{school.slug}</code> • Plan: {school.subscription?.plan ?? "TRIAL"} •{" "}
            {school.isActive ? "Active" : "Inactive"}
          </div>
        </div>
        <Link href="/platform" className="text-sm text-white/70 hover:text-white">
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Actions">
          <div className="flex flex-wrap gap-3">
            <Link href={`/login?schoolSlug=${encodeURIComponent(school.slug)}`}>
              <Button variant="secondary">Open school login</Button>
            </Link>
            <form action={impersonateSchoolAction} method="post">
              <input type="hidden" name="schoolId" value={school.id} />
              <Button type="submit">Impersonate (Admin)</Button>
            </form>
            <Link href="/platform/schools/new">
              <Button variant="secondary">+ Add school</Button>
            </Link>
          </div>
          <div className="mt-3 text-xs text-white/50">
            Impersonation signs you in as the earliest-created <code>ADMIN</code> user for that school.
          </div>
        </Card>

        <Card title="Invite Admin">
          <InviteForm schoolId={school.id} />
        </Card>
      </div>

      <Card title="Impersonate Any Role" description="Choose a user to sign in as for troubleshooting and support.">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {school.users.map((u) => (
            <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">
                  {u.name} <span className="text-xs text-white/50">({u.schoolRole.name})</span>
                </div>
                <div className="text-xs text-white/60">{u.email}</div>
              </div>
              <form action={impersonateUserAction} method="post">
                <input type="hidden" name="schoolId" value={school.id} />
                <input type="hidden" name="userId" value={u.id} />
                <Button type="submit" variant="secondary">
                  Impersonate
                </Button>
              </form>
            </div>
          ))}
          {school.users.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No users found for this school.</div>
          ) : null}
        </div>
      </Card>

      <Card title="Recent Invites">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {school.invites.map((inv) => (
            <div key={inv.id} className="px-4 py-3">
              <div className="font-medium">{inv.email}</div>
              <div className="text-xs text-white/60">
                Expires: {inv.expiresAt.toDateString()} • Status:{" "}
                {inv.usedAt ? `USED (${inv.usedAt.toDateString()})` : "PENDING"}
              </div>
              <div className="mt-2 text-xs text-white/50">
                Invite link: <code>{`/accept-invite?token=${inv.token}`}</code>
              </div>
            </div>
          ))}
          {school.invites.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No invites yet.</div>
          ) : null}
        </div>
      </Card>

      <Card title="School Modules" description="Super admin can enable or disable modules for this school.">
        <SchoolModulesForm schoolId={school.id} modules={schoolModules} />
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="text-sm text-white/70 mb-2">Customize fields per module for this school:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {schoolModules.map((m) => (
              <Link
                key={m.id}
                href={`/platform/schools/${school.id}/modules/${m.id}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.07] transition flex items-center justify-between"
              >
                <span>{m.name}</span>
                <span className="text-xs text-white/60">{m.enabled ? "Enabled" : "Disabled"}</span>
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

async function SchoolModulesForm(props: {
  schoolId: string;
  modules: Array<{ id: string; key: string; name: string; enabled: boolean }>;
}) {
  const { PlatformSchoolModulesForm } = await import("./ui");
  return <PlatformSchoolModulesForm schoolId={props.schoolId} modules={props.modules} />;
}
