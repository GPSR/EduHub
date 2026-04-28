"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  changePlatformPasswordAction,
  updatePlatformProfileAction,
  type PlatformProfileState
} from "@/app/platform/(app)/profile/actions";
import { BiometricLockSettings } from "@/components/biometric-lock-settings";

const initialState: PlatformProfileState = { ok: true };

function FormMsg({ state }: { state: PlatformProfileState }) {
  if (!state.message) return null;
  return (
    <div
      className={[
        "rounded-2xl border p-3 text-sm",
        state.ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
      ].join(" ")}
    >
      {state.message}
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[14px] text-white/80 break-all">{value || "—"}</p>
    </div>
  );
}

export function PlatformProfileSettings({
  name,
  email
}: {
  name: string;
  email: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updatePlatformProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePlatformPasswordAction, initialState);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (profileState.ok && profileState.message) {
      setEditingProfile(false);
    }
  }, [profileState]);

  useEffect(() => {
    if (pwState.ok && pwState.message) setEditingPassword(false);
  }, [pwState]);

  return (
    <div className="space-y-3">
      <Card
        title="Profile"
        description={editingProfile ? "Edit your profile details" : undefined}
        className={profileOpen || editingProfile ? "p-3.5 sm:p-4" : "p-3 sm:p-3.5"}
        action={editingProfile ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-label={profileOpen ? "Collapse profile details" : "Expand profile details"}
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">{profileOpen ? "▾" : "▸"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProfile(true);
                setProfileOpen(true);
              }}
              aria-label="Edit profile"
              className={[
                "sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border transition",
                editingProfile
                  ? "border-blue-300/40 bg-blue-500/20 text-blue-100"
                  : "border-white/[0.14] bg-[#0f1728]/90 text-white/85 hover:bg-[#1a2945]",
              ].join(" ")}
            >
              <span aria-hidden className="text-[14px] leading-none">✎</span>
            </button>
          </div>
        )}
      >
        {!editingProfile && profileOpen ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5">
            <ValueRow label="Name" value={name} />
            <ValueRow label="Email" value={email} />
          </div>
        ) : editingProfile ? (
          <form action={profileAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label required>Name</Label>
              <Input name="name" defaultValue={name} required />
            </div>
            <div>
              <Label required>Email</Label>
              <Input name="email" type="email" defaultValue={email} required />
            </div>
            <div className="md:col-span-2">
              <FormMsg state={profileState} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingProfile(false);
                }}
                disabled={profilePending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={profilePending}>
                {profilePending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <BiometricLockSettings />

      <Card
        title="Change Password"
        description={editingPassword ? "Update your account password" : undefined}
        className={passwordOpen || editingPassword ? "p-3.5 sm:p-4" : "p-3 sm:p-3.5"}
        action={editingPassword ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPasswordOpen((current) => !current)}
              aria-label={passwordOpen ? "Collapse password details" : "Expand password details"}
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">{passwordOpen ? "▾" : "▸"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPassword(true);
                setPasswordOpen(true);
              }}
              aria-label="Edit password"
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">✎</span>
            </button>
          </div>
        )}
      >
        {!editingPassword && passwordOpen ? (
          <div className="grid grid-cols-1 gap-3">
            <ValueRow label="Password" value="Hidden for security" />
          </div>
        ) : editingPassword ? (
          <form action={pwAction} className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <Label required>Current password</Label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div>
              <Label required>New password</Label>
              <Input name="newPassword" type="password" minLength={10} required />
            </div>
            <div>
              <Label required>Confirm new password</Label>
              <Input name="confirmPassword" type="password" minLength={10} required />
            </div>
            <div>
              <FormMsg state={pwState} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingPassword(false)} disabled={pwPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pwPending}>
                {pwPending ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
