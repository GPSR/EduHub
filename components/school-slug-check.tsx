"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import type { SchoolSlugState } from "@/app/actions";
import { validateSchoolSlugAction } from "@/app/actions";

const initialState: SchoolSlugState = { ok: true };

export function SchoolSlugCheck() {
  const [state, action, pending] = useActionState(validateSchoolSlugAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label required>School slug</Label>
        <Input name="schoolSlug" placeholder="e.g. greenwood" required autoComplete="organization" />
        {!state.ok && state.message ? (
          <p className="mt-2 text-sm text-rose-300 flex items-center gap-1.5">
            <span>⚠</span> {state.message}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-white/38">
            Enter your school's unique identifier to proceed.
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Checking…
          </span>
        ) : "Continue →"}
      </Button>
    </form>
  );
}
