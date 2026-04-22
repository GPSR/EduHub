import { Card, Input, Label, Button, Select, Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { IdSettingsClientForm, RenameRoleClientForm, SchoolModulesClientForm } from "@/components/admin-settings-forms";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ roleId?: string }>;
}) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const { roleId } = await searchParams;
  const [school, roles, schoolModules] = await Promise.all([
    prisma.school.findUnique({ where: { id: session.schoolId } }),
    prisma.schoolRole.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.schoolModule.findMany({
      where: { schoolId: session.schoolId },
      include: { module: true },
      orderBy: { module: { name: "asc" } },
    }),
  ]);

  if (!school) {
    return (
      <Card>
        <p className="text-sm text-white/60">School not found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Settings" subtitle="Configure your school's modules, IDs, and roles" />

      <Card title="ID Generation" description="Auto-generated Student ID and Admission No formats. Tokens: {YYYY} and {SEQ}." accent="indigo">
        <IdSettingsClientForm
          studentIdFormat={school.studentIdFormat}
          admissionNoFormat={school.admissionNoFormat}
          idSequencePad={school.idSequencePad}
          studentIdNext={school.studentIdNext}
          admissionNoNext={school.admissionNoNext}
        />
      </Card>

      <Card title="School Modules" description="Enable or disable modules for all roles." accent="teal">
        <SchoolModulesClientForm
          modules={schoolModules.map(m => ({ id: m.module.id, name: m.module.name, key: m.module.key, enabled: m.enabled }))}
        />
      </Card>

      <Card title="Roles" description="Create, rename, and delete roles for your school." accent="indigo">
        <RolesPanel
          schoolId={school.id}
          roles={roles.map(r => ({ id: r.id, key: r.key, name: r.name, isSystem: r.isSystem }))}
          selectedRoleId={roleId}
        />
      </Card>
    </div>
  );
}

async function RolesPanel({
  schoolId, roles, selectedRoleId,
}: {
  schoolId: string;
  roles: Array<{ id: string; key: string; name: string; isSystem: boolean }>;
  selectedRoleId?: string;
}) {
  const { createRoleAction, deleteRoleAction } = await import("./actions");

  const counts = await prisma.user.groupBy({
    by: ["schoolRoleId"],
    where: { schoolId },
    _count: { _all: true },
  });
  const countByRoleId = new Map(counts.map(c => [c.schoolRoleId, c._count._all]));

  const activeRoleId = roles.some(r => r.id === selectedRoleId) ? selectedRoleId : roles[0]?.id;
  const activeRole   = roles.find(r => r.id === activeRoleId);

  return (
    <div className="space-y-5">
      {/* Role list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {roles.map(r => (
          <a
            key={r.id}
            href={`/admin/settings?roleId=${r.id}`}
            className={`rounded-[13px] border px-3 py-2.5 text-sm transition-all
                         ${r.id === activeRoleId
                           ? "border-indigo-400/30 bg-indigo-500/[0.15] text-white"
                           : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/85"}`}
          >
            <div className="font-medium truncate">{r.name}</div>
            <div className="text-[11px] text-white/35 mt-0.5">
              {countByRoleId.get(r.id) ?? 0} user{(countByRoleId.get(r.id) ?? 0) !== 1 ? "s" : ""}
              {r.isSystem && " · System"}
            </div>
          </a>
        ))}
      </div>

      {/* Selected role panel */}
      {activeRole && (
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-white/90">{activeRole.name}</span>
                <Badge tone={activeRole.isSystem ? "info" : "neutral"}>
                  {activeRole.isSystem ? "System" : "Custom"}
                </Badge>
              </div>
              <p className="text-[12px] text-white/40 mt-0.5">
                Key: <code className="text-white/55">{activeRole.key}</code>
                {" · "}{countByRoleId.get(activeRole.id) ?? 0} user{(countByRoleId.get(activeRole.id) ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            {!activeRole.isSystem && (
              <form action={deleteRoleAction}>
                <input type="hidden" name="roleId" value={activeRole.id} />
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={(countByRoleId.get(activeRole.id) ?? 0) > 0}
                >
                  Delete role
                </Button>
              </form>
            )}
          </div>
          <RenameRoleClientForm roleId={activeRole.id} defaultName={activeRole.name} />
        </div>
      )}

      {/* Add role */}
      <div className="border-t border-white/[0.07] pt-4">
        <p className="text-[12px] font-medium text-white/45 mb-3">Create new role</p>
        <form action={createRoleAction} className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Role name</Label>
            <Input name="name" placeholder="e.g. Librarian" required />
          </div>
          <Button type="submit" size="md">+ Add role</Button>
        </form>
      </div>
    </div>
  );
}
