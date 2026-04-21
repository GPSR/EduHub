"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { updateIdSettingsAction, renameRoleAction, updateSchoolModulesAction, type SettingsState } from "@/app/(app)/admin/settings/actions";

const initial: SettingsState = { ok: true };

export function IdSettingsClientForm(props: {
  studentIdFormat: string;
  admissionNoFormat: string;
  idSequencePad: number;
  studentIdNext: number;
  admissionNoNext: number;
}) {
  const [state, action, pending] = useActionState(updateIdSettingsAction, initial);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <div>
        <Label>Student ID format</Label>
        <Input name="studentIdFormat" defaultValue={props.studentIdFormat} placeholder="STU-{YYYY}-{SEQ}" required />
      </div>
      <div>
        <Label>Admission No format</Label>
        <Input name="admissionNoFormat" defaultValue={props.admissionNoFormat} placeholder="ADM-{YYYY}-{SEQ}" required />
      </div>
      <div>
        <Label>Sequence padding</Label>
        <Input name="idSequencePad" type="number" defaultValue={props.idSequencePad} min={0} max={10} required />
        <div className="mt-1 text-xs text-white/50">Example: pad=4 → 0001, 0002…</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Next Student Seq</Label>
          <Input name="studentIdNext" type="number" defaultValue={props.studentIdNext} min={1} required />
        </div>
        <div>
          <Label>Next Admission Seq</Label>
          <Input name="admissionNoNext" type="number" defaultValue={props.admissionNoNext} min={1} required />
        </div>
      </div>

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
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

export function RenameRoleClientForm({ roleId, defaultName }: { roleId: string; defaultName: string }) {
  const [state, action, pending] = useActionState(renameRoleAction, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="roleId" value={roleId} />
      <Input name="newName" defaultValue={defaultName} className="w-56" />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Rename"}
      </Button>
      {state.message ? <span className="text-xs text-white/60">{state.message}</span> : null}
    </form>
  );
}

export function SchoolModulesClientForm(props: {
  modules: Array<{ id: string; key: string; name: string; enabled: boolean }>;
}) {
  const [state, action, pending] = useActionState(updateSchoolModulesAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {props.modules.map((m) => (
          <label
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:bg-white/[0.06] transition"
          >
            <div>
              <div className="font-semibold text-sm">{m.name}</div>
              <div className="text-xs text-white/50">{m.key}</div>
            </div>
            <input type="checkbox" name="enabledModuleIds" value={m.id} defaultChecked={m.enabled} className="h-5 w-5 accent-indigo-500" />
          </label>
        ))}
        {props.modules.length === 0 ? <div className="text-sm text-white/60">No modules found.</div> : null}
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
          {pending ? "Saving..." : "Save modules"}
        </Button>
      </div>
    </form>
  );
}
