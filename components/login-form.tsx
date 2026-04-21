"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { ok: true };

export function LoginForm({ defaultSchoolSlug }: { defaultSchoolSlug?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label required>School slug</Label>
        <Input
          name="schoolSlug"
          placeholder="e.g. greenwood"
          defaultValue={defaultSchoolSlug ?? ""}
          required
          autoComplete="organization"
        />
      </div>
      <div>
        <Label required>Email address</Label>
        <Input name="email" type="email" placeholder="you@school.edu" required autoComplete="email" />
      </div>
      <div>
        <Label required>Password</Label>
        <Input name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
      </div>

      {!state.ok && state.message && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-rose-500/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
          <span className="shrink-0 mt-0.5 text-rose-400">⚠</span>
          {state.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Signing in…
          </span>
        ) : "Sign in →"}
      </Button>
    </form>
  );
}
