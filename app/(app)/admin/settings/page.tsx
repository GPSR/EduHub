import { Card, Input, Label, Button, Select, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { IdSettingsClientForm, RenameRoleClientForm, SchoolModulesClientForm } from "@/components/admin-settings-forms";

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ roleId?: string }>;
}) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const { roleId } = await searchParams;
  const [school, roles, schoolModules] = await Promise.all([
    prisma.school.findUnique({ where: { id: session.schoolId } }),
    prisma.schoolRole.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }]
    }),
    prisma.schoolModule.findMany({
      where: { schoolId: session.schoolId },
      include: { module: true },
      orderBy: { module: { name: "asc" } }
    })
  ]);
  if (!school) {
    return (
      <Card title="Settings">
        <div className="text-sm text-white/70">School not found.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="ID Generation"
        description="Configure auto-generated Student ID and Admission No formats. Tokens: {YYYY} and {SEQ}."
      >
        <IdSettingsClientForm
          studentIdFormat={school.studentIdFormat}
          admissionNoFormat={school.admissionNoFormat}
          idSequencePad={school.idSequencePad}
          studentIdNext={school.studentIdNext}
          admissionNoNext={school.admissionNoNext}
        />
      </Card>

      <Card title="School Modules" description="Enable/disable modules for this school (affects all roles).">
        <SchoolModulesClientForm
          modules={schoolModules.map((m) => ({ id: m.module.id, name: m.module.name, key: m.module.key, enabled: m.enabled }))}
        />
      </Card>

      <Card title="Roles" description="Create, rename, and delete roles for your school.">
        <RolesPanel
          schoolId={school.id}
          roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, isSystem: r.isSystem }))}
          selectedRoleId={roleId}
        />
      </Card>
    </div>
  );
}

async function RolesPanel({
  schoolId,
  roles,
  selectedRoleId
}: {
  schoolId: string;
  roles: Array<{ id: string; key: string; name: string; isSystem: boolean }>;
  selectedRoleId?: string;
}) {
  const { createRoleAction, deleteRoleAction } = await import("./actions");

  const counts = await prisma.user.groupBy({
    by: ["schoolRoleId"],
    where: { schoolId },
    _count: { _all: true }
  });
  const countByRoleId = new Map(counts.map((c) => [c.schoolRoleId, c._count._all]));

  const activeRoleId = roles.some((r) => r.id === selectedRoleId) ? selectedRoleId : roles[0]?.id;
  const activeRole = roles.find((r) => r.id === activeRoleId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form action={createRoleAction} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <Label>Role name</Label>
            <Input name="name" placeholder="Librarian" required />
          </div>
          <div className="flex justify-end md:justify-start">
            <Button type="submit">+ Add role</Button>
          </div>
        </form>

        <form action="/admin/settings" method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Select role</Label>
            <Select name="roleId" defaultValue={activeRoleId}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.isSystem ? "System" : "Custom"})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end md:justify-start">
            <Button type="submit" variant="secondary">
              Load role
            </Button>
          </div>
        </form>
      </div>

      {activeRole ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {activeRole.name} {activeRole.isSystem ? <Badge tone="info">System</Badge> : <Badge>Custom</Badge>}
              </div>
              <div className="text-xs text-white/60">
                Key: <code>{activeRole.key}</code> • Users: {countByRoleId.get(activeRole.id) ?? 0}
              </div>
            </div>
          <div className="flex flex-wrap items-center gap-2">
            <RenameRoleClientForm roleId={activeRole.id} defaultName={activeRole.name} />
            {!activeRole.isSystem ? (
              <form action={deleteRoleAction}>
                <input type="hidden" name="roleId" value={activeRole.id} />
                <Button type="submit" variant="danger" disabled={(countByRoleId.get(activeRole.id) ?? 0) > 0}>
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-white/60">Create a role to manage permissions.</div>
      )}
    </div>
  );
}
