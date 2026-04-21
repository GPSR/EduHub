"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = { ok: true };

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label>Name</Label>
        <Input name="name" placeholder="Admin name" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={10} required />
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Accepting..." : "Accept invite"}
      </Button>
    </form>
  );
}

