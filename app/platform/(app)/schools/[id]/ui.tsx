"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { CheckboxBulkActions } from "@/components/checkbox-bulk-actions";
import {
  createAdminInviteAction,
  updateSchoolAdminPasswordAction,
  updatePlatformSchoolModulesAction,
  type InviteState,
  type PlatformSchoolModulesState,
  type UpdateSchoolAdminPasswordState
} from "./actions";

const initialState: InviteState = { ok: true };
const initialModulesState: PlatformSchoolModulesState = { ok: true };
const initialPasswordState: UpdateSchoolAdminPasswordState = { ok: true };

export function PlatformInviteForm({ schoolId }: { schoolId: string }) {
  const [state, action, pending] = useActionState(createAdminInviteAction, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div>
        <Label>Admin email</Label>
        <Input name="adminEmail" type="email" placeholder="admin@school.com" required />
      </div>

      {state.message ? (
        <div
          className={
            "rounded-xl border p-3 text-sm " +
            (state.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200")
          }
        >
          <p>{state.message}</p>
          {state.ok && state.inviteUrl ? (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-emerald-200/90 break-all">{state.inviteUrl}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(state.inviteUrl ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  {copied ? "Copied" : "Copy invite link"}
                </Button>
                <a
                  href={state.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.10] bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.12] hover:border-white/[0.18] transition-all"
                >
                  Open link
                </a>
              </div>
              <p className="text-[11px] text-white/70">
                Email: {state.emailSent ? "Sent" : "Not sent"} · SMS: {state.smsSent ? "Sent" : "Not sent"}
              </p>
              {state.errors?.length ? (
                <p className="text-[11px] text-white/65">Reason: {state.errors.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
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
      <CheckboxBulkActions fieldName="enabledModuleIds" />
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

export function PlatformSchoolAdminPasswordForm({
  schoolId,
  userId
}: {
  schoolId: string;
  userId: string;
}) {
  const [state, action, pending] = useActionState(updateSchoolAdminPasswordAction, initialPasswordState);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="userId" value={userId} />
      <div className="text-xs text-white/65">Set a new password directly for this school admin.</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label required>New password</Label>
          <Input name="newPassword" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <div>
          <Label required>Confirm password</Label>
          <Input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" />
        </div>
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
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}
