"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  approveOnboardingRequestAction,
  rejectOnboardingRequestAction,
  type OnboardingApprovalState
} from "./actions";

const initialState: OnboardingApprovalState = { ok: true };

export function RequestApprovalForm({
  requestId,
  modules
}: {
  requestId: string;
  modules: Array<{ id: string; key: string; name: string; enabledByDefault: boolean }>;
}) {
  const [approveState, approveAction, approvePending] = useActionState(approveOnboardingRequestAction, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectOnboardingRequestAction, initialState);

  return (
    <div className="space-y-4">
      <form action={approveAction} className="space-y-4">
        <input type="hidden" name="requestId" value={requestId} />
        <div>
          <Label>Subscription plan</Label>
          <Select name="plan" defaultValue="DEFAULT">
            <option value="PREMIUM">Premium</option>
            <option value="DEFAULT">Default</option>
            <option value="UNLIMITED">Unlimited</option>
            <option value="BETA">Beta (Legacy)</option>
          </Select>
        </div>
        <div>
          <Label>Enabled modules for this school</Label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {modules.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                <input
                  type="checkbox"
                  name="enabledModuleIds"
                  value={m.id}
                  defaultChecked={m.enabledByDefault}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span className="text-sm">
                  {m.name} <span className="text-white/50">({m.key})</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {approveState.message ? (
          <div
            className={
              "rounded-2xl border p-3 text-sm " +
              (approveState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
            }
          >
            {approveState.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={approvePending}>
            {approvePending ? "Approving..." : "Approve & create school"}
          </Button>
        </div>
      </form>

      <form action={rejectAction} className="space-y-3 border-t border-white/10 pt-4">
        <input type="hidden" name="requestId" value={requestId} />
        <div>
          <Label>Reject note (optional)</Label>
          <Input name="note" placeholder="Reason for rejection" />
        </div>
        {rejectState.message ? (
          <div
            className={
              "rounded-2xl border p-3 text-sm " +
              (rejectState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
            }
          >
            {rejectState.message}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" variant="danger" disabled={rejectPending}>
            {rejectPending ? "Rejecting..." : "Reject request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
