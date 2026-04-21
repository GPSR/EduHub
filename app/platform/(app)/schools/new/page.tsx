import Link from "next/link";
import { Card, Input, Label, Button, Select } from "@/components/ui";
import { createSchoolInviteAction } from "./actions";
import { requireSuperAdmin } from "@/lib/platform-require";

export default async function NewSchoolPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Add School</div>
          <div className="text-sm text-white/60">Create a school and generate an admin invite link.</div>
        </div>
        <Link href="/platform" className="text-sm text-white/70 hover:text-white">
          ← Back
        </Link>
      </div>

      <Card title="School Details">
        <CreateSchoolForm />
      </Card>
    </div>
  );
}

async function CreateSchoolForm() {
  const { SchoolCreateForm } = await import("./ui");
  return <SchoolCreateForm />;
}
