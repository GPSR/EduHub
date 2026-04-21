"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { platformLoginAction, type PlatformLoginState } from "@/app/platform/login/actions";

const initialState: PlatformLoginState = { ok: true };

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLoginAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={8} required />
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

