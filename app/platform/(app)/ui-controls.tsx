"use client";

import { useActionState, useMemo } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  changeSchoolPlanAction,
  extendTrialAction,
  toggleSchoolActiveAction,
  type PlatformActionState
} from "./actions";

export function PlatformControls({
  q
}: {
  q: string;
}) {
  const qs = useMemo(() => ({ q }), [q]);
  return (
    <Card>
      <form action="/platform" method="get" className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-2">
          <Input
            name="q"
            defaultValue={qs.q}
            placeholder="Search schools and users..."
            className="!border-0 !bg-transparent !shadow-none focus:!ring-0 focus:!border-0 rounded-full"
          />
          <Button type="submit" className="rounded-full px-5">Search</Button>
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
