"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { saveSchoolModuleFieldSettingsAction, type SchoolModuleFieldState } from "./actions";

const initialState: SchoolModuleFieldState = { ok: true };

export function SchoolModuleFieldSettingsForm({
  schoolId,
  moduleId,
  fields
}: {
  schoolId: string;
  moduleId: string;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    fieldType: string;
    defaultRequired: boolean;
    defaultOptions: string[];
    enabled: boolean;
    required: boolean;
    labelValue: string;
    optionsValue: string;
  }>;
}) {
  const [state, action, pending] = useActionState(saveSchoolModuleFieldSettingsAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="moduleId" value={moduleId} />

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{field.label}</div>
                <div className="text-xs text-white/50">
                  {field.key} • {field.fieldType}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  name={`enabled_${field.id}`}
                  defaultChecked={field.enabled}
                  className="h-4 w-4 accent-indigo-500"
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  name={`required_${field.id}`}
                  defaultChecked={field.required}
                  className="h-4 w-4 accent-indigo-500"
                />
                Required
              </label>
              <input
                name={`label_${field.id}`}
                defaultValue={field.labelValue}
                placeholder={`Label (default: ${field.label})`}
                className="mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-2.5 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition placeholder:text-white/35"
              />
            </div>

            {field.fieldType === "DROPDOWN" ? (
              <div>
                <div className="text-sm text-white/70">Dropdown options override</div>
                <input
                  name={`options_${field.id}`}
                  defaultValue={field.optionsValue}
                  placeholder={`Default: ${field.defaultOptions.join(", ")}`}
                  className="mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-2.5 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition placeholder:text-white/35"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {state.message ? (
        <div
          className={
            "rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save school field settings"}
        </Button>
      </div>
    </form>
  );
}
