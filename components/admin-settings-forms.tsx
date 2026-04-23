"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  updateIdSettingsAction,
  renameRoleAction,
  updateSchoolModulesAction,
  type SettingsState,
} from "@/app/(app)/admin/settings/actions";

const initial: SettingsState = { ok: true };

function FormMessage({ state }: { state: SettingsState }) {
  if (!state.message) return null;
  return (
    <div className={[
      "sm:col-span-2 flex items-start gap-2.5 rounded-[12px] border p-3.5 text-sm",
      state.ok
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
        : "border-rose-500/25 bg-rose-500/10 text-rose-200",
    ].join(" ")}>
      <span className="shrink-0">{state.ok ? "✓" : "⚠"}</span>
      {state.message}
    </div>
  );
}

/* ─── ID Settings ──────────────────────────────── */
export function IdSettingsClientForm(props: {
  studentIdFormat: string;
  admissionNoFormat: string;
  idSequencePad: number;
  studentIdNext: number;
  admissionNoNext: number;
}) {
  const [state, action, pending] = useActionState(updateIdSettingsAction, initial);

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <Label required>Student ID format</Label>
        <Input name="studentIdFormat" defaultValue={props.studentIdFormat} placeholder="STU-{YYYY}-{SEQ}" required />
        <p className="mt-1 text-[11px] text-white/35">Tokens: <code className="text-white/50">{"{YYYY}"}</code> and <code className="text-white/50">{"{SEQ}"}</code></p>
      </div>
      <div>
        <Label required>Admission No format</Label>
        <Input name="admissionNoFormat" defaultValue={props.admissionNoFormat} placeholder="ADM-{YYYY}-{SEQ}" required />
      </div>
      <div>
        <Label required>Sequence padding</Label>
        <Input name="idSequencePad" type="number" defaultValue={props.idSequencePad} min={0} max={10} required />
        <p className="mt-1 text-[11px] text-white/35">pad=4 → 0001, 0002…</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Next Student Seq</Label>
          <Input name="studentIdNext" type="number" defaultValue={props.studentIdNext} min={1} required />
        </div>
        <div>
          <Label required>Next Admission Seq</Label>
          <Input name="admissionNoNext" type="number" defaultValue={props.admissionNoNext} min={1} required />
        </div>
      </div>

      <FormMessage state={state} />

      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Saving…
            </span>
          ) : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Rename Role ──────────────────────────────── */
export function RenameRoleClientForm({ roleId, defaultName }: { roleId: string; defaultName: string }) {
  const [state, action, pending] = useActionState(renameRoleAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="roleId" value={roleId} />
      <div className="flex-1 min-w-40">
        <Label>New name</Label>
        <Input name="newName" defaultValue={defaultName} />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Saving…
          </span>
        ) : "Rename"}
      </Button>
      {state.message && (
        <p className={`text-xs w-full ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</p>
      )}
    </form>
  );
}

/* ─── School Modules ───────────────────────────── */
const MODULE_ICONS: Record<string, string> = {
  STUDENTS:      "👥",
  FEES:          "💳",
  ATTENDANCE:    "✅",
  COMMUNICATION: "📢",
  ACADEMICS:     "📚",
  REPORTS:       "📊",
  NOTIFICATIONS: "🔔",
  SETTINGS:      "⚙️",
  DASHBOARD:     "◈",
  USERS:         "🛡",
};

export function SchoolModulesClientForm(props: {
  modules: Array<{ id: string; key: string; name: string; enabled: boolean }>;
}) {
  const [state, action, pending] = useActionState(updateSchoolModulesAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {props.modules.map(m => (
          <label
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.08]
                        bg-white/[0.03] px-4 py-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer
                        has-[:checked]:border-indigo-400/25 has-[:checked]:bg-indigo-500/[0.07]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{MODULE_ICONS[m.key] ?? "•"}</span>
              <div>
                <div className="text-[13px] font-semibold text-white/85">{m.name}</div>
                <div className="text-[11px] text-white/35">{m.key}</div>
              </div>
            </div>
            <input
              type="checkbox"
              name="enabledModuleIds"
              value={m.id}
              defaultChecked={m.enabled}
              className="h-[18px] w-[18px] rounded-[5px] accent-indigo-500 cursor-pointer"
            />
          </label>
        ))}
        {props.modules.length === 0 && (
          <p className="text-sm text-white/50">No modules found.</p>
        )}
      </div>

      <FormMessage state={state} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Saving…
            </span>
          ) : "Save modules"}
        </Button>
      </div>
    </form>
  );
}
