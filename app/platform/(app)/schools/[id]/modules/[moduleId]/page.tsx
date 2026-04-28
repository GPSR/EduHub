import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { SchoolModuleFieldSettingsForm } from "./ui";

export default async function PlatformSchoolModuleFieldsPage({
  params
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  await requireSuperAdmin();
  const { id: schoolId, moduleId } = await params;

  const [school, module, fields, overrides] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
    db.module.findUnique({ where: { id: moduleId }, select: { id: true, name: true, key: true } }),
    db.moduleField.findMany({
      where: { moduleId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    db.schoolModuleField.findMany({
      where: { schoolId, moduleField: { moduleId } },
      select: {
        moduleFieldId: true,
        enabled: true,
        isRequired: true,
        labelOverride: true,
        optionsOverrideJson: true
      }
    })
  ]);

  if (!school || !module) return notFound();

  const overrideByFieldId = new Map(overrides.map((o) => [o.moduleFieldId, o]));

  const uiFields = fields.map((field) => {
    const override = overrideByFieldId.get(field.id);
    const defaultOptions = parseOptions(field.optionsJson);
    const overrideOptions = parseOptions(override?.optionsOverrideJson ?? null);
    return {
      id: field.id,
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      defaultRequired: field.isRequired,
      defaultOptions,
      enabled: override?.enabled ?? true,
      required: override?.isRequired ?? field.isRequired,
      labelValue: override?.labelOverride ?? "",
      optionsValue: overrideOptions.join(", ")
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{school.name} • {module.name}</div>
          <div className="text-sm text-white/60">
            Customize module fields for this school. Module key: <code>{module.key}</code>
          </div>
        </div>
        <Link href={`/platform/schools/${school.id}`} className="text-sm text-white/70 hover:text-white">
          ← Back to school
        </Link>
      </div>

      <Card
        title="School-Level Module Field Customization"
        description="Enable/disable fields and customize required/label/options for this school."
      >
        <SchoolModuleFieldSettingsForm schoolId={school.id} moduleId={module.id} fields={uiFields} />
      </Card>
    </div>
  );
}

function parseOptions(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v));
  } catch {
    return [];
  }
}
