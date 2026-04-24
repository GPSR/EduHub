"use client";

import { useActionState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { resetPasswordWithTokenAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { ok: true, message: "" };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordWithTokenAction, initialState);

  return (
    <Card title="Reset password" accent="indigo">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label required>New password</Label>
          <Input name="password" type="password" minLength={10} required />
        </div>
        <div>
          <Label required>Confirm password</Label>
          <Input name="confirmPassword" type="password" minLength={10} required />
        </div>
        {state.message ? (
          <div className={"rounded-2xl border p-3 text-sm " + (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-rose-500/25 bg-rose-500/10 text-rose-100")}>
            {state.message}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
