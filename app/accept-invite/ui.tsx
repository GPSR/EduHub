"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = { ok: true };

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initialState);

  if (!token) {
    return (
      <div className="rounded-[12px] border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
        ⚠ Invalid or missing invite token. Please use the link from your invitation email.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label required>Your full name</Label>
        <Input name="name" placeholder="Jane Smith" required autoComplete="name" />
      </div>
      <div>
        <Label required>Password</Label>
        <Input name="password" type="password" minLength={10} placeholder="Min. 10 characters" required autoComplete="new-password" />
        <p className="mt-1 text-[11px] text-white/35">Must be at least 10 characters.</p>
      </div>

      {!state.ok && state.message && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-rose-500/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
          <span className="shrink-0">⚠</span> {state.message}
        </div>
      )}
      {state.ok && state.message && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
          <span className="shrink-0">✓</span> {state.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Activating account…
          </span>
        ) : "Activate account →"}
      </Button>
    </form>
  );
}
