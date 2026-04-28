import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { getIndustryTemplateByModuleKey } from "@/lib/module-industry-templates";
import { AddModuleFieldForm, ApplyModuleTemplateForm } from "./ui";
import { deleteModuleFieldAction } from "./actions";

export default async function PlatformModuleSettingsPage({
  params
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireSuperAdmin();
  const { moduleId } = await params;

  const module = await db.module.findUnique({
    where: { id: moduleId },
    include: { fields: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!module) return notFound();
  const industryTemplate = getIndustryTemplateByModuleKey(module.key);

  return (
    <div className="space-y-6 pb-safe">
      <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="text-xl sm:text-2xl font-semibold break-words">{module.name} Fields</div>
          <div className="text-sm text-white/60 break-all">
            Module key: <code className="break-all">{module.key}</code>
          </div>
        </div>
        <Link href="/platform/settings" className="text-sm text-white/70 hover:text-white active:text-white">
          ← Back to settings
        </Link>
      </div>

      <Card title="Add Field" description="Create new fields for this module. These are available for school-level customization.">
        <AddModuleFieldForm moduleId={module.id} />
      </Card>

      {industryTemplate ? (
        <Card
          title="Industry Workflow And Defaults"
          description="Recommended business flow and field set for this module."
          accent="teal"
        >
          <div className="space-y-4">
            <p className="text-sm text-white/75">{industryTemplate.purpose}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Workflow</p>
              <ol className="list-decimal space-y-1 pl-4 sm:pl-5 text-sm text-white/75">
                {industryTemplate.workflow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Recommended fields</p>
              <div className="flex flex-wrap gap-1.5">
                {industryTemplate.fields.map((field) => (
                  <Badge key={field.key} tone="neutral">
                    {field.label}
                  </Badge>
                ))}
              </div>
            </div>
            <ApplyModuleTemplateForm moduleId={module.id} />
          </div>
        </Card>
      ) : null}

      <Card title="Current Fields">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {module.fields.map((field) => (
            <div key={field.id} className="px-3.5 sm:px-4 py-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="font-medium flex flex-wrap items-center gap-2">
                  {field.label}
                  <Badge>{field.fieldType}</Badge>
                  {field.isRequired ? <Badge tone="info">Required</Badge> : null}
                </div>
                <div className="text-xs text-white/60 break-words">
                  Key: <code className="break-all">{field.key}</code>
                  {field.optionsJson ? (
                    <>
                      {" "}
                      • Options: <span className="break-words">{(safeParseOptions(field.optionsJson) ?? []).join(", ")}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <form action={deleteModuleFieldAction}>
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="fieldId" value={field.id} />
                <Button type="submit" variant="danger" className="w-full sm:w-auto">
                  Remove
                </Button>
              </form>
            </div>
          ))}
          {module.fields.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/60">No fields yet. Add your first field above.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function safeParseOptions(json: string): string[] | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((v) => String(v));
  } catch {
    return null;
  }
}
