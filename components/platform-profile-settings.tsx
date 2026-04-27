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
  const [editingPassword, setEditingPassword] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);

  useEffect(() => {
    if (profileState.ok && profileState.message) setEditingProfile(false);
  }, [profileState]);

  useEffect(() => {
    if (pwState.ok && pwState.message) setEditingPassword(false);
  }, [pwState]);

  useEffect(() => {
    if (editingProfile) setProfileExpanded(true);
  }, [editingProfile]);

  useEffect(() => {
    if (editingPassword) setPasswordExpanded(true);
  }, [editingPassword]);

  return (
    <div className="space-y-6">
      <Card
        title="Profile"
        description={editingProfile ? "Edit your profile details" : profileExpanded ? "View your profile details" : "Collapsed by default. Click view to expand."}
        action={editingProfile ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileExpanded((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-[#1a2945] transition"
            >
              {profileExpanded ? "▴ Hide" : "▾ View"}
            </button>
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-[#1a2945] transition"
            >
              ✎ Edit
            </button>
          </div>
        )}
      >
        {!editingProfile && !profileExpanded ? (
          <p className="text-sm text-white/55">
            Profile information is collapsed. Tap <span className="text-white/80 font-medium">View</span> to expand details.
          </p>
        ) : !editingProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValueRow label="Name" value={name} />
            <ValueRow label="Email" value={email} />
          </div>
        ) : (
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
              <Button type="button" variant="secondary" onClick={() => setEditingProfile(false)} disabled={profilePending}>
                Cancel
              </Button>
              <Button type="submit" disabled={profilePending}>
                {profilePending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <BiometricLockSettings />

      <Card
        title="Change password"
        description={editingPassword ? "Use a strong password with at least 10 characters" : passwordExpanded ? "Use a strong password with at least 10 characters" : "Collapsed by default. Click view to open password section."}
        action={editingPassword ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPasswordExpanded((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-[#1a2945] transition"
            >
              {passwordExpanded ? "▴ Hide" : "▾ View"}
            </button>
            <button
              type="button"
              onClick={() => setEditingPassword(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-[#1a2945] transition"
            >
              ✎ Edit
            </button>
          </div>
        )}
      >
        {!editingPassword && !passwordExpanded ? (
          <p className="text-sm text-white/55">
            Password section is collapsed. Tap <span className="text-white/80 font-medium">View</span> to expand.
          </p>
        ) : !editingPassword ? (
          <p className="text-sm text-white/55">
            Your password is hidden for security. Click the edit icon to change it.
          </p>
        ) : (
          <form action={pwAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <FormMsg state={pwState} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingPassword(false)} disabled={pwPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pwPending}>
                {pwPending ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
