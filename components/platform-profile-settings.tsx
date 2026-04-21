"use client";

import { useActionState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  changePlatformPasswordAction,
  updatePlatformProfileAction,
  type PlatformProfileState
} from "@/app/platform/(app)/profile/actions";

const initialState: PlatformProfileState = { ok: true };

export function PlatformProfileSettings({
  name,
  email
}: {
  name: string;
  email: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updatePlatformProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePlatformPasswordAction, initialState);

  return (
    <div className="space-y-6">
      <Card title="Personal info" description="Update your platform account details">
        <form action={profileAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={name} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={email} required />
          </div>

          {profileState.message ? (
            <div
              className={
                "md:col-span-2 rounded-2xl border p-3 text-sm " +
                (profileState.ok
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200")
              }
            >
              {profileState.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Change password" description="Use a strong password with at least 10 characters">
        <form action={pwAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="md:col-span-2">
            <Label>Current password</Label>
            <Input name="currentPassword" type="password" required />
          </div>
          <div>
            <Label>New password</Label>
            <Input name="newPassword" type="password" minLength={10} required />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input name="confirmPassword" type="password" minLength={10} required />
          </div>

          {pwState.message ? (
            <div
              className={
                "md:col-span-2 rounded-2xl border p-3 text-sm " +
                (pwState.ok
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200")
              }
            >
              {pwState.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={pwPending}>
              {pwPending ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
