import { Card, Input, Label, Button, Select, Badge, SectionHeader, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { IdSettingsClientForm, RenameRoleClientForm, SchoolModulesClientForm } from "@/components/admin-settings-forms";
import Image from "next/image";
import { getSchoolIdCardTemplate } from "@/lib/id-card-template";
import { getSchoolStudentDemographicsConfig, type StudentDemographicsConfig } from "@/lib/student-demographics";
import { getSchoolProfile, type SchoolProfile } from "@/lib/school-profile";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ roleId?: string }>;
}) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const { roleId } = await searchParams;
  const [school, roles, schoolModules, classes, idCardTemplate, demographicsConfig, schoolProfile] = await Promise.all([
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
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }]
    }),
    getSchoolIdCardTemplate(session.schoolId),
    getSchoolStudentDemographicsConfig(session.schoolId),
    getSchoolProfile(session.schoolId)
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

      <Card title="Branding Logo" description="Upload school logo shown in app header." accent="teal">
        <SchoolLogoPanel logoUrl={school.brandingLogoUrl} />
      </Card>

      <Card title="School Profile" description="Update school address shown in student virtual ID cards." accent="teal">
        <SchoolProfilePanel profile={schoolProfile} />
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

      <Card title="Class Configuration" description="Configure classes/sections used during student admission." accent="teal">
        <ClassConfigPanel
          classes={classes.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
        />
      </Card>

      <Card title="Student Demographics" description="Configure Gender and Blood Group dropdown options used in admissions." accent="teal">
        <StudentDemographicsConfigPanel config={demographicsConfig} />
      </Card>

      <Card title="Virtual ID Card Template" description="Design student virtual ID card layout and fields." accent="indigo">
        <IdCardTemplatePanel template={idCardTemplate} />
      </Card>
    </div>
  );
}

async function SchoolLogoPanel({ logoUrl }: { logoUrl?: string | null }) {
  const { uploadSchoolLogoAction } = await import("./actions");
  return (
    <form action={uploadSchoolLogoAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <Image src={logoUrl} alt="School logo" width={56} height={56} className="h-14 w-14 rounded-[12px] object-cover border border-white/[0.10]" />
        ) : (
          <div className="h-14 w-14 rounded-[12px] border border-white/[0.10] bg-white/[0.04] grid place-items-center text-[11px] text-white/40">No logo</div>
        )}
        <div className="min-w-0">
          <Label required>Upload logo</Label>
          <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required />
          <p className="mt-1 text-[11px] text-white/35">JPG/PNG/WEBP, max 3MB</p>
        </div>
      </div>
      <div className="md:justify-self-end">
        <Button type="submit">Upload logo</Button>
      </div>
    </form>
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

async function ClassConfigPanel({
  classes
}: {
  classes: Array<{ id: string; name: string; section: string }>;
}) {
  const { createClassConfigAction, deleteClassConfigAction } = await import("./actions");

  return (
    <div className="space-y-4">
      <form action={createClassConfigAction} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <Label required>Class name</Label>
          <Input name="name" placeholder="Grade 1" required />
        </div>
        <div>
          <Label>Section</Label>
          <Input name="section" placeholder="A" />
        </div>
        <div>
          <Button type="submit">+ Add Class</Button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {classes.map((c) => (
          <div key={c.id} className="rounded-[13px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white/85 truncate">{c.name}{c.section ? ` - ${c.section}` : ""}</div>
              <div className="text-[11px] text-white/35">Configured class</div>
            </div>
            <form action={deleteClassConfigAction}>
              <input type="hidden" name="classId" value={c.id} />
              <Button type="submit" variant="danger" size="sm">Delete</Button>
            </form>
          </div>
        ))}
        {classes.length === 0 ? <p className="text-sm text-white/50">No classes configured yet.</p> : null}
      </div>
    </div>
  );
}

async function IdCardTemplatePanel({ template }: { template: Awaited<ReturnType<typeof getSchoolIdCardTemplate>> }) {
  const { saveIdCardTemplateAction } = await import("./actions");
  return (
    <form action={saveIdCardTemplateAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label required>School label</Label>
        <Input name="schoolLabel" defaultValue={template.schoolLabel} required />
      </div>
      <div>
        <Label required>Header text</Label>
        <Input name="headerText" defaultValue={template.headerText} required />
      </div>
      <div>
        <Label>Footer fallback text</Label>
        <Input name="footerText" defaultValue={template.footerText} />
        <p className="mt-1 text-[11px] text-white/35">Used only when School Profile address is empty.</p>
      </div>
      <div>
        <Label required>Background (CSS color/gradient)</Label>
        <Input name="background" defaultValue={template.background} required />
      </div>
      <div>
        <Label required>Accent color</Label>
        <Input name="accent" defaultValue={template.accent} required />
      </div>
      <div>
        <Label required>Text color</Label>
        <Input name="textColor" defaultValue={template.textColor} required />
      </div>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="showPhoto" defaultChecked={template.showPhoto} className="h-4 w-4 accent-indigo-500" />
        Show student photo/avatar
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="showParent" defaultChecked={template.showParent} className="h-4 w-4 accent-indigo-500" />
        Show parent details
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80 md:col-span-2">
        <input type="checkbox" name="showGuardian" defaultChecked={template.showGuardian} className="h-4 w-4 accent-indigo-500" />
        Show guardian details
      </label>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">Save ID card template</Button>
      </div>
    </form>
  );
}

async function SchoolProfilePanel({ profile }: { profile: SchoolProfile }) {
  const { updateSchoolProfileAction } = await import("./actions");
  return (
    <form action={updateSchoolProfileAction} className="grid grid-cols-1 gap-4">
      <div>
        <Label>School address</Label>
        <Textarea
          name="address"
          rows={3}
          defaultValue={profile.address}
          placeholder="Full school address to show on virtual ID card footer"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save school profile</Button>
      </div>
    </form>
  );
}

async function StudentDemographicsConfigPanel({ config }: { config: StudentDemographicsConfig }) {
  const { updateStudentDemographicsConfigAction } = await import("./actions");
  return (
    <form action={updateStudentDemographicsConfigAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label required>Gender options</Label>
        <Textarea
          name="genders"
          rows={6}
          defaultValue={config.genders.join("\n")}
          placeholder={"Male\nFemale\nOther"}
        />
        <p className="mt-1 text-[11px] text-white/35">One option per line (or comma-separated).</p>
      </div>
      <div>
        <Label required>Blood group options</Label>
        <Textarea
          name="bloodGroups"
          rows={6}
          defaultValue={config.bloodGroups.join("\n")}
          placeholder={"A+\nA-\nB+\nB-\nAB+\nAB-\nO+\nO-"}
        />
        <p className="mt-1 text-[11px] text-white/35">One option per line (or comma-separated).</p>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">Save demographic options</Button>
      </div>
    </form>
  );
}
