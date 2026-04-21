"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { ok: true };

export function LoginForm({ defaultSchoolSlug }: { defaultSchoolSlug?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label>School slug</Label>
        <Input
          name="schoolSlug"
          placeholder="e.g. greenwood"
          defaultValue={defaultSchoolSlug ?? ""}
          required
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" required />
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

