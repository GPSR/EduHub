import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { AddModuleFieldForm } from "./ui";
import { deleteModuleFieldAction } from "./actions";

export default async function PlatformModuleSettingsPage({
  params
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireSuperAdmin();
  const { moduleId } = await params;

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { fields: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!module) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{module.name} Fields</div>
          <div className="text-sm text-white/60">
            Module key: <code>{module.key}</code>
          </div>
        </div>
        <Link href="/platform/settings" className="text-sm text-white/70 hover:text-white">
          ← Back to settings
        </Link>
      </div>

      <Card title="Add Field" description="Create new fields for this module. These are available for school-level customization.">
        <AddModuleFieldForm moduleId={module.id} />
      </Card>

      <Card title="Current Fields">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {module.fields.map((field) => (
            <div key={field.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {field.label}
                  <Badge>{field.fieldType}</Badge>
                  {field.isRequired ? <Badge tone="info">Required</Badge> : null}
                </div>
                <div className="text-xs text-white/60">
                  Key: <code>{field.key}</code>
                  {field.optionsJson ? (
                    <>
                      {" "}
                      • Options: {(safeParseOptions(field.optionsJson) ?? []).join(", ")}
                    </>
                  ) : null}
                </div>
              </div>
              <form action={deleteModuleFieldAction}>
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="fieldId" value={field.id} />
                <Button type="submit" variant="danger">
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
