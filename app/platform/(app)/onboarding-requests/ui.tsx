"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  approveOnboardingRequestAction,
  holdOnboardingRequestAction,
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
  const [holdState, holdAction, holdPending] = useActionState(holdOnboardingRequestAction, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectOnboardingRequestAction, initialState);
  const [copied, setCopied] = useState(false);

  const share = useMemo(() => {
    if (!approveState.ok || !approveState.inviteUrl) return null;
    const schoolName = approveState.schoolName ?? "your school";
    const subject = encodeURIComponent(`EduHub Invite Approved - ${schoolName}`);
    const body = encodeURIComponent(
      `Your school onboarding is approved.\n\nUse this link to create the admin account:\n${approveState.inviteUrl}\n\nThis link expires in 30 minutes.`
    );
    return {
      emailHref: approveState.adminEmail ? `mailto:${approveState.adminEmail}?subject=${subject}&body=${body}` : null,
      smsHref: `sms:${approveState.adminPhone ?? ""}?&body=${body}`,
      waHref: `https://wa.me/?text=${body}`
    };
  }, [approveState]);

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
            {approveState.ok && approveState.inviteUrl && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-emerald-200/90">Invitation link</p>
                <a
                  href={approveState.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-[11px] font-mono text-indigo-200/90 break-all underline-offset-2 hover:underline"
                >
                  {approveState.inviteUrl}
                </a>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(approveState.inviteUrl ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                  {share?.emailHref && (
                    <a
                      href={share.emailHref}
                      className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.10] bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.12] hover:border-white/[0.18] transition-all"
                    >
                      Email
                    </a>
                  )}
                  <a
                    href={share?.smsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.10] bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.12] hover:border-white/[0.18] transition-all"
                  >
                    SMS
                  </a>
                  <a
                    href={share?.waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.10] bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.12] hover:border-white/[0.18] transition-all"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
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

      <form action={holdAction} className="space-y-3 border-t border-white/10 pt-4">
        <input type="hidden" name="requestId" value={requestId} />
        <div>
          <Label>Put on hold note (optional)</Label>
          <Input name="note" placeholder="Reason for hold / pending clarification" />
        </div>
        {holdState.message ? (
          <div
            className={
              "rounded-2xl border p-3 text-sm " +
              (holdState.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/80")
            }
          >
            {holdState.message}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={holdPending}>
            {holdPending ? "Updating..." : "Put on hold"}
          </Button>
        </div>
      </form>
    </div>
  );
}
