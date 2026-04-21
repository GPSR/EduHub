"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { onboardAction, type OnboardState } from "@/app/onboard/actions";
import { setOnboardedFlag } from "@/components/home-cta";

const initialState: OnboardState = { ok: true };

export function OnboardForm() {
  const [state, action, pending] = useActionState(onboardAction, initialState);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const slug = new FormData(form).get("schoolSlug");
        if (typeof slug === "string" && slug.trim()) setOnboardedFlag(slug.trim().toLowerCase());
        else setOnboardedFlag();
      }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="md:col-span-2">
        <Label required>School name</Label>
        <Input name="schoolName" placeholder="Greenwood Public School" required />
      </div>
      <div>
        <Label required>School slug</Label>
        <Input name="schoolSlug" placeholder="greenwood" required />
        <p className="mt-1.5 text-xs text-white/40">
          Used for login and URLs — e.g. <code className="text-white/55">greenwood</code>
        </p>
      </div>
      <div>
        <Label required>Admin full name</Label>
        <Input name="adminName" placeholder="School Admin" required />
      </div>
      <div>
        <Label required>Admin email</Label>
        <Input name="adminEmail" type="email" placeholder="admin@school.edu" required />
      </div>

      {state.message && (
        <div className={[
          "md:col-span-2 flex items-start gap-2.5 rounded-[12px] border p-3.5 text-sm",
          state.ok
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/25 bg-rose-500/10 text-rose-200"
        ].join(" ")}>
          <span className="shrink-0 mt-0.5">{state.ok ? "✓" : "⚠"}</span>
          {state.message}
        </div>
      )}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Submitting…
            </span>
          ) : "Submit onboarding request →"}
        </Button>
      </div>
    </form>
  );
}
