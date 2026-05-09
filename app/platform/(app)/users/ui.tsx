"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { CheckboxBulkActions } from "@/components/checkbox-bulk-actions";
import {
  approvePlatformUserAction,
  createPlatformUserAction,
  deletePlatformUserAction,
  resetPlatformUserPasswordAction,
  rejectPlatformUserAction,
  togglePlatformUserActiveAction,
  updatePlatformUserPasswordAction,
  updatePlatformUserAction,
  type PlatformUserAdminState
} from "./actions";

const initialState: PlatformUserAdminState = { ok: true };

export function CreatePlatformUserForm() {
  const [state, action, pending] = useActionState(createPlatformUserAction, initialState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <Label>Name</Label>
        <Input name="name" placeholder="Support Agent" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={10} required />
      </div>
      <div>
        <Label>Role</Label>
        <input type="hidden" name="role" value="SUPPORT_USER" />
        <Input value="SUPPORT_USER" readOnly />
      </div>
      {state.message ? (
        <div className={"md:col-span-4 rounded-2xl border p-3 text-sm " + (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")}>
          {state.message}
        </div>
      ) : null}
      <div className="md:col-span-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create platform user (Pending)"}
        </Button>
      </div>
    </form>
  );
}

export function ApprovePlatformUserForm({
  platformUserId,
  schools
}: {
  platformUserId: string;
  schools: Array<{ id: string; name: string; slug: string }>;
}) {
  const [approveState, approveAction, approvePending] = useActionState(approvePlatformUserAction, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectPlatformUserAction, initialState);

  return (
    <div className="space-y-3">
      <form action={approveAction} className="space-y-3">
        <input type="hidden" name="platformUserId" value={platformUserId} />
        <CheckboxBulkActions fieldName="schoolIds" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {schools.map((s) => (
            <label key={s.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm">
              <input type="checkbox" name="schoolIds" value={s.id} className="h-4 w-4 accent-indigo-500" />
              {s.name} <span className="text-white/50">({s.slug})</span>
            </label>
          ))}
        </div>
        {approveState.message ? (
          <div className={"rounded-2xl border p-3 text-sm " + (approveState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")}>
            {approveState.message}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={approvePending}>
            {approvePending ? "Approving..." : "Approve + Assign Schools"}
          </Button>
        </div>
      </form>

      <form action={rejectAction} className="flex justify-end">
        <input type="hidden" name="platformUserId" value={platformUserId} />
        {rejectState.message ? <div className="mr-3 text-xs text-white/70">{rejectState.message}</div> : null}
        <Button type="submit" variant="danger" disabled={rejectPending}>
          {rejectPending ? "Rejecting..." : "Reject"}
        </Button>
      </form>
    </div>
  );
}

export function ManagePlatformUserForm({
  platformUserId,
  name,
  email,
  isActive,
  schools,
  assignedSchoolIds,
  isSuperAdmin = false
}: {
  platformUserId: string;
  name: string;
  email: string;
  isActive: boolean;
  schools: Array<{ id: string; name: string; slug: string }>;
  assignedSchoolIds: string[];
  isSuperAdmin?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updatePlatformUserAction, initialState);
  const [toggleState, toggleAction, togglePending] = useActionState(togglePlatformUserActiveAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deletePlatformUserAction, initialState);

  const assignedSchoolNames = schools
    .filter((s) => assignedSchoolIds.includes(s.id))
    .map((s) => s.name);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="text-xs text-white/70">
          {isSuperAdmin
            ? "Super admin controls: password reset and direct password update."
            : `Assigned schools: ${assignedSchoolNames.length ? assignedSchoolNames.join(", ") : "None"}`}
        </div>
        <div className="flex items-center gap-2">
          {!isSuperAdmin ? (
            <Button type="button" variant="secondary" onClick={() => setIsEditing((v) => !v)}>
              {isEditing ? "Close" : "Edit"}
            </Button>
          ) : null}
          <ManagePlatformUserPasswordPopup
            platformUserId={platformUserId}
            name={name}
            email={email}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>

      {!isSuperAdmin && isEditing ? (
        <>
          <form action={updateAction} className="space-y-3">
            <input type="hidden" name="platformUserId" value={platformUserId} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input name="name" defaultValue={name} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={email} required />
              </div>
            </div>
            <CheckboxBulkActions fieldName="schoolIds" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {schools.map((s) => (
                <label key={s.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="schoolIds"
                    value={s.id}
                    defaultChecked={assignedSchoolIds.includes(s.id)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  {s.name} <span className="text-white/50">({s.slug})</span>
                </label>
              ))}
            </div>
            {updateState.message ? (
              <div className={"rounded-2xl border p-3 text-sm " + (updateState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")}>
                {updateState.message}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={updatePending}>
                {updatePending ? "Saving..." : "Save + Reassign Schools"}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <form action={toggleAction} className="flex items-center gap-2">
              <input type="hidden" name="platformUserId" value={platformUserId} />
              {toggleState.message ? <div className="text-xs text-white/70">{toggleState.message}</div> : null}
              <Button type="submit" variant="secondary" disabled={togglePending}>
                {togglePending ? "Updating..." : isActive ? "Deactivate" : "Activate"}
              </Button>
            </form>
            <form action={deleteAction} className="flex items-center gap-2">
              <input type="hidden" name="platformUserId" value={platformUserId} />
              {deleteState.message ? <div className="text-xs text-white/70">{deleteState.message}</div> : null}
              <Button type="submit" variant="danger" disabled={deletePending}>
                {deletePending ? "Deleting..." : "Delete user"}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ManagePlatformUserPasswordPopup({
  platformUserId,
  name,
  email,
  isSuperAdmin
}: {
  platformUserId: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordState, passwordAction, passwordPending] = useActionState(resetPlatformUserPasswordAction, initialState);
  const [updatePasswordState, updatePasswordAction, updatePasswordPending] = useActionState(updatePlatformUserPasswordAction, initialState);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Manage Password
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-[1] w-full sm:max-w-2xl rounded-t-[22px] sm:rounded-[24px] border border-white/[0.10] bg-[#060912]/97 shadow-[0_-20px_60px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-[16px] font-semibold text-white/95">Manage Password</h3>
                <p className="text-[12px] text-white/50 mt-0.5">
                  {name} · {email} {isSuperAdmin ? "· SUPER_ADMIN" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[10px] border border-white/[0.10] bg-white/[0.04] p-2 text-white/60 hover:text-white hover:bg-white/[0.10] transition"
                aria-label="Close password popup"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="max-h-[76vh] overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
              <form action={passwordAction} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <input type="hidden" name="platformUserId" value={platformUserId} />
                <div className="text-sm font-medium">Reset password by email</div>
                <p className="text-xs text-white/60">A secure reset link will be sent and expires in 30 minutes.</p>
                {passwordState.message ? (
                  <div className={"rounded-2xl border p-3 text-sm " + (passwordState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")}>
                    {passwordState.message}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordPending}>
                    {passwordPending ? "Sending..." : "Send Reset Email"}
                  </Button>
                </div>
              </form>

              <form action={updatePasswordAction} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <input type="hidden" name="platformUserId" value={platformUserId} />
                <div className="text-sm font-medium">Update password directly</div>
                <p className="text-xs text-white/60">Set a new password immediately for this user.</p>
                <label className="inline-flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Show password while typing
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>New password</Label>
                    <Input name="newPassword" type={showPassword ? "text" : "password"} minLength={10} required autoComplete="new-password" />
                  </div>
                  <div>
                    <Label>Confirm password</Label>
                    <Input name="confirmPassword" type={showPassword ? "text" : "password"} minLength={10} required autoComplete="new-password" />
                  </div>
                </div>
                {updatePasswordState.message ? (
                  <div className={"rounded-2xl border p-3 text-sm " + (updatePasswordState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")}>
                    {updatePasswordState.message}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button type="submit" disabled={updatePasswordPending}>
                    {updatePasswordPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
