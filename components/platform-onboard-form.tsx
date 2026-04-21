"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { platformOnboardAction, type PlatformOnboardState } from "@/app/platform/onboard/actions";

const initialState: PlatformOnboardState = { ok: true };

export function PlatformOnboardForm() {
  const [state, action, pending] = useActionState(platformOnboardAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label>Name</Label>
        <Input name="name" placeholder="Platform Admin" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={10} required />
        <div className="mt-1 text-xs text-white/50">This page works only if no Super Admin exists yet.</div>
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating..." : "Create Super Admin"}
      </Button>
    </form>
  );
}

