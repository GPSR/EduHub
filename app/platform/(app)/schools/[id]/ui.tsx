"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  createAdminInviteAction,
  updatePlatformSchoolModulesAction,
  type InviteState,
  type PlatformSchoolModulesState
} from "./actions";

const initialState: InviteState = { ok: true };
const initialModulesState: PlatformSchoolModulesState = { ok: true };

export function PlatformInviteForm({ schoolId }: { schoolId: string }) {
  const [state, action, pending] = useActionState(createAdminInviteAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div>
        <Label>Admin email</Label>
        <Input name="adminEmail" type="email" placeholder="admin@school.com" required />
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Generating..." : "Generate invite"}
      </Button>
    </form>
  );
}

export function PlatformSchoolModulesForm(props: {
  schoolId: string;
  modules: Array<{ id: string; key: string; name: string; enabled: boolean }>;
}) {
  const [state, action, pending] = useActionState(updatePlatformSchoolModulesAction, initialModulesState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="schoolId" value={props.schoolId} />
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
            <input
              type="checkbox"
              name="enabledModuleIds"
              value={m.id}
              defaultChecked={m.enabled}
              className="h-5 w-5 accent-indigo-500"
            />
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
