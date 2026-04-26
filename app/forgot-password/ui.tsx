"use client";

import { useActionState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  requestSchoolUserPasswordResetAction,
  type ForgotPasswordState
} from "./actions";

const initialState: ForgotPasswordState = { ok: true, message: "" };

export function ForgotPasswordForm({ defaultSchoolSlug }: { defaultSchoolSlug?: string }) {
  const [state, action, pending] = useActionState(requestSchoolUserPasswordResetAction, initialState);

  return (
    <Card title="Forgot password" description="Request a secure password reset link by email." accent="indigo">
      <form action={action} className="space-y-4">
        <div>
          <Label required>School slug</Label>
          <Input
            name="schoolSlug"
            defaultValue={defaultSchoolSlug ?? ""}
            placeholder="e.g. greenwood"
            required
            autoComplete="organization"
          />
        </div>
        <div>
          <Label required>Email address</Label>
          <Input name="email" type="email" placeholder="you@school.edu" required autoComplete="email" />
        </div>

        {state.message ? (
          <div
            className={
              "rounded-2xl border p-3 text-sm " +
              (state.ok
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/25 bg-rose-500/10 text-rose-100")
            }
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
