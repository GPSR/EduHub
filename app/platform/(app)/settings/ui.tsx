"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  applyIndustryTemplatesAction,
  createModuleAction,
  createCustomSubscriptionAction,
  updateSubscriptionPlanSettingsAction,
  type CreateModuleState,
  type CustomSubscriptionState,
  type IndustryTemplatesState,
  type SubscriptionSettingsState
} from "./actions";

const initialState: CreateModuleState = { ok: true };
const initialSubscriptionState: SubscriptionSettingsState = { ok: true };
const initialCustomSubscriptionState: CustomSubscriptionState = { ok: true };
const initialIndustryTemplatesState: IndustryTemplatesState = { ok: true };

export function CreateModuleForm() {
  const [state, action, pending] = useActionState(createModuleAction, initialState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div>
        <Label>Module name</Label>
        <Input name="name" placeholder="Library" required />
      </div>
      <div>
        <Label>Module key</Label>
        <Input name="key" placeholder="LIBRARY" required />
      </div>
      <div className="flex md:justify-start">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Creating..." : "Create module"}
        </Button>
      </div>

      {state.message ? (
        <div
          className={
            "md:col-span-3 rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}

export function SubscriptionPlanSettingsForm({
  premiumDays,
  defaultDays,
  defaultAmount,
  betaAmount,
  unlimitedAmount
}: {
  premiumDays: number;
  defaultDays: number;
  defaultAmount: number;
  betaAmount: number;
  unlimitedAmount: number;
}) {
  const [state, action, pending] = useActionState(updateSubscriptionPlanSettingsAction, initialSubscriptionState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div>
        <Label>Premium days</Label>
        <Input
          name="premiumDays"
          type="number"
          min={1}
          max={3650}
          defaultValue={premiumDays}
          inputMode="numeric"
          required
        />
      </div>
      <div>
        <Label>Default days</Label>
        <Input
          name="defaultDays"
          type="number"
          min={1}
          max={3650}
          defaultValue={defaultDays}
          inputMode="numeric"
          required
        />
      </div>
      <div>
        <Label>Unlimited</Label>
        <Input value="Lifetime (no expiry)" readOnly />
        <input type="hidden" name="unlimitedIsLifetime" value="true" />
      </div>
      <div>
        <Label>Premium amount</Label>
        <Input value="0 (No charge)" readOnly />
      </div>
      <div>
        <Label>Default amount</Label>
        <Input name="defaultAmount" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={defaultAmount} required />
      </div>
      <div>
        <Label>Beta amount</Label>
        <Input name="betaAmount" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={betaAmount} required />
      </div>
      <div>
        <Label>Unlimited amount</Label>
        <Input
          name="unlimitedAmount"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          defaultValue={unlimitedAmount}
          required
        />
      </div>

      {state.message ? (
        <div
          className={
            "md:col-span-3 rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-3 flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving..." : "Save subscription mapping"}
        </Button>
      </div>
    </form>
  );
}

export function CreateCustomSubscriptionForm() {
  const [state, action, pending] = useActionState(createCustomSubscriptionAction, initialCustomSubscriptionState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <Label>Plan name</Label>
        <Input name="name" placeholder="Enterprise Annual" required />
      </div>
      <div>
        <Label>Plan code</Label>
        <Input name="code" placeholder="ENTERPRISE_ANNUAL" required />
      </div>
      <div>
        <Label>Mode</Label>
        <select
          name="mode"
          defaultValue="DAYS"
          className="mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-3 sm:py-2.5 text-[16px] sm:text-sm outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition"
        >
          <option value="DAYS">Days</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
      </div>
      <div>
        <Label>Duration days</Label>
        <Input name="durationDays" type="number" min={1} max={3650} inputMode="numeric" placeholder="365" />
      </div>
      <div>
        <Label>Amount</Label>
        <Input name="amount" type="number" min={0} step="0.01" inputMode="decimal" placeholder="1999" required />
      </div>

      {state.message ? (
        <div
          className={
            "md:col-span-5 rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-5 flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Creating..." : "Create custom subscription"}
        </Button>
      </div>
    </form>
  );
}

export function ApplyIndustryTemplatesForm() {
  const [state, action, pending] = useActionState(applyIndustryTemplatesAction, initialIndustryTemplatesState);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div>
        <p className="text-sm font-semibold text-white/85">Apply industry-standard school module templates</p>
        <p className="mt-1 text-xs text-white/55">
          Seeds recommended fields and workflow-ready metadata for core school modules. Existing custom fields remain unchanged.
        </p>
      </div>

      {state.message ? (
        <div
          className={
            "rounded-2xl border p-3 text-sm " +
            (state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Applying..." : "Apply industry templates"}
        </Button>
      </div>
    </form>
  );
}
