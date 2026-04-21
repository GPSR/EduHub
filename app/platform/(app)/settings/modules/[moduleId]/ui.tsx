"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { addModuleFieldAction, type ModuleFieldState } from "./actions";

const initialState: ModuleFieldState = { ok: true };

export function AddModuleFieldForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState(addModuleFieldAction, initialState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
      <input type="hidden" name="moduleId" value={moduleId} />
      <div>
        <Label>Field label</Label>
        <Input name="label" placeholder="Student Name" required />
      </div>
      <div>
        <Label>Field key</Label>
        <Input name="key" placeholder="STUDENT_NAME" required />
      </div>
      <div>
        <Label>Field type</Label>
        <Select name="fieldType" defaultValue="TEXT">
          <option value="TEXT">Text</option>
          <option value="NUMBER">Number</option>
          <option value="DATE">Date</option>
          <option value="DROPDOWN">Dropdown</option>
          <option value="CHECKBOX">Checkbox</option>
          <option value="TEXTAREA">Textarea</option>
        </Select>
      </div>
      <div>
        <Label>Dropdown options (comma separated)</Label>
        <Input name="optionsCsv" placeholder="Option A, Option B, Option C" />
      </div>
      <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="isRequired" className="h-4 w-4 accent-indigo-500" />
        Required field
      </label>

      {state.message ? (
        <div
          className={
            "md:col-span-2 rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add field"}
        </Button>
      </div>
    </form>
  );
}
