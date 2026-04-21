"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import type { SchoolSlugState } from "@/app/actions";
import { validateSchoolSlugAction } from "@/app/actions";

const initialState: SchoolSlugState = { ok: true };

export function SchoolSlugCheck() {
  const [state, action, pending] = useActionState(validateSchoolSlugAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label>School slug</Label>
        <Input name="schoolSlug" placeholder="e.g. greenwood" required />
        {!state.ok && state.message ? (
          <div className="mt-2 text-sm text-rose-300">{state.message}</div>
        ) : (
          <div className="mt-2 text-xs text-white/50">
            Enter your school slug to continue to login.
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking..." : "Continue"}
      </Button>
    </form>
  );
}

