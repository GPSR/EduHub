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
        <Label>School name</Label>
        <Input name="schoolName" placeholder="Greenwood Public School" required />
      </div>
      <div>
        <Label>School slug</Label>
        <Input name="schoolSlug" placeholder="greenwood" required />
        <div className="text-xs text-white/50 mt-1">
          Used for login and URLs. Example: <code>greenwood</code>
        </div>
      </div>
      <div>
        <Label>Admin full name</Label>
        <Input name="adminName" placeholder="School Admin" required />
      </div>
      <div>
        <Label>Admin email</Label>
        <Input name="adminEmail" type="email" required />
      </div>
      {state.message ? (
        <div
          className={
            "md:col-span-2 rounded-xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-rose-500/30 bg-rose-500/10 text-rose-200")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit onboarding request"}
        </Button>
      </div>
    </form>
  );
}
