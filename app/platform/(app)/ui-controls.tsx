"use client";

import { useActionState, useMemo } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  changeSchoolPlanAction,
  extendTrialAction,
  toggleSchoolActiveAction,
  type PlatformActionState
} from "./actions";

export function PlatformControls({
  q,
  status,
  plan,
  customPlans
}: {
  q: string;
  status: string;
  plan: string;
  customPlans: Array<{ id: string; name: string; code: string }>;
}) {
  const qs = useMemo(() => ({ q, status, plan }), [q, status, plan]);
  return (
    <Card title="Filters" description="Search and filter the schools list.">
      <form action="/platform" method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <Label>Search</Label>
          <Input name="q" defaultValue={qs.q} placeholder="Search by school name or slug" />
        </div>
        <div>
          <Label>Status</Label>
          <Select name="status" defaultValue={qs.status}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div>
          <Label>Plan</Label>
          <Select name="plan" defaultValue={qs.plan}>
            <option value="">All</option>
            <option value="PREMIUM">Premium</option>
            <option value="DEFAULT">Default</option>
            <option value="UNLIMITED">Unlimited</option>
            <option value="BETA">Beta (Legacy)</option>
            {customPlans.map((p) => (
              <option key={p.id} value={`CUSTOM:${p.id}`}>
                {p.name} ({p.code})
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-4 flex justify-end">
          <Button type="submit">Apply</Button>
        </div>
      </form>
    </Card>
  );
}

function RowActionError({ state }: { state: PlatformActionState }) {
  if (state.ok || !state.message) return null;
  return <div className="mt-2 text-xs text-rose-200">{state.message}</div>;
}

export function PlatformRowActions({
  schoolId,
  isActive,
  currentPlan,
  customPlans
}: {
  schoolId: string;
  isActive: boolean;
  currentPlan: string;
  customPlans: Array<{ id: string; name: string; code: string }>;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState(toggleSchoolActiveAction, { ok: true });
  const [planState, planAction, planPending] = useActionState(changeSchoolPlanAction, { ok: true });
  const [trialState, trialAction, trialPending] = useActionState(extendTrialAction, { ok: true });

  return (
    <div className="hidden lg:flex items-center gap-2">
      <form action={toggleAction}>
        <input type="hidden" name="schoolId" value={schoolId} />
        <Button type="submit" variant={isActive ? "secondary" : "primary"} disabled={togglePending}>
          {isActive ? "Deactivate" : "Activate"}
        </Button>
        <RowActionError state={toggleState} />
      </form>

      <form action={planAction} className="flex items-center gap-2">
        <input type="hidden" name="schoolId" value={schoolId} />
        <select
          name="plan"
          defaultValue={currentPlan}
          className="rounded-xl bg-black/25 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 transition text-sm"
        >
          <option value="PREMIUM">PREMIUM</option>
          <option value="DEFAULT">DEFAULT</option>
          <option value="UNLIMITED">UNLIMITED</option>
          <option value="BETA">BETA</option>
          {customPlans.map((p) => (
            <option key={p.id} value={`CUSTOM:${p.id}`}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" disabled={planPending}>
          Set plan
        </Button>
        <RowActionError state={planState} />
      </form>

      {/* Trial removed; keep layout clean by hiding extend action. */}
    </div>
  );
}
