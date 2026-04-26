"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { updateUserPasswordAction, type UpdateUserPasswordState } from "./actions";

const initialState: UpdateUserPasswordState = { ok: true };

export function UserPasswordUpdateForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(updateUserPasswordAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

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
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}
