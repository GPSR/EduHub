"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
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
      className="space-y-5"
    >
      <div className="rounded-[14px] border border-white/[0.12] bg-white/[0.02] p-3.5 sm:p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white/92">School information</h3>

        <div>
          <Label required>School name</Label>
          <Input name="schoolName" placeholder="Greenwood Public School" required />
        </div>

        <div>
          <Label required>School slug</Label>
          <Input name="schoolSlug" placeholder="greenwood" required />
          <p className="mt-1.5 text-xs text-white/45">
            Used for login and URL, for example <code className="text-white/60">greenwood</code>
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-white/[0.12] bg-white/[0.02] p-3.5 sm:p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white/92">Admin contact</h3>

        <div>
          <Label required>Admin full name</Label>
          <Input name="adminName" placeholder="School Admin" required />
        </div>

        <div>
          <Label required>Admin email</Label>
          <Input name="adminEmail" type="email" placeholder="admin@school.edu" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <div>
            <Label required>Country code</Label>
            <Select name="adminPhoneCountryCode" defaultValue="+1" required>
              <option value="+1">+1 (US/CA)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+91">+91 (IN)</option>
              <option value="+61">+61 (AU)</option>
              <option value="+971">+971 (UAE)</option>
              <option value="+65">+65 (SG)</option>
            </Select>
          </div>
          <div>
            <Label required>Admin phone</Label>
            <Input name="adminPhone" type="tel" inputMode="numeric" placeholder="9876543210" required />
          </div>
        </div>
      </div>

      {state.message && (
        <div className={[
          "flex items-start gap-2.5 rounded-[12px] border p-3.5 text-sm",
          state.ok
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/25 bg-rose-500/10 text-rose-200"
        ].join(" ")}>
          <span className="shrink-0 mt-0.5">{state.ok ? "✓" : "⚠"}</span>
          {state.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Submitting…
            </span>
          ) : "Submit request →"}
        </Button>
      </div>
    </form>
  );
}
