"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input, Label, Select } from "@/components/ui";
import { CheckboxBulkActions } from "@/components/checkbox-bulk-actions";
import {
  approveOnboardingRequestAction,
  holdOnboardingRequestAction,
  rejectOnboardingRequestAction,
  type OnboardingApprovalState
} from "./actions";
import {
  resetSchoolAdminPasswordAction,
  updateSchoolAdminPasswordAction,
  type ResetSchoolAdminPasswordState,
  type UpdateSchoolAdminPasswordState
} from "../schools/[id]/actions";

const initialState: OnboardingApprovalState = { ok: true };
const initialSchoolAdminPasswordState: UpdateSchoolAdminPasswordState = { ok: true };
const initialSchoolAdminResetState: ResetSchoolAdminPasswordState = { ok: true };

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
          <CheckboxBulkActions fieldName="enabledModuleIds" className="mt-2 flex items-center gap-2" />
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

type SchoolAdminUser = {
  id: string;
  name: string;
  email: string;
};

export function ManageSchoolAdminPasswordPopup({
  schoolId,
  schoolName,
  admins,
  triggerVariant = "link"
}: {
  schoolId: string;
  schoolName: string;
  admins: SchoolAdminUser[];
  triggerVariant?: "link" | "chip";
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(admins[0]?.id ?? "");
  const [updateState, updateAction, updatePending] = useActionState(
    updateSchoolAdminPasswordAction,
    initialSchoolAdminPasswordState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetSchoolAdminPasswordAction,
    initialSchoolAdminResetState
  );

  const selectedAdmin = useMemo(
    () => admins.find((admin) => admin.id === selectedUserId) ?? admins[0] ?? null,
    [admins, selectedUserId]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const triggerClassName =
    triggerVariant === "chip"
      ? "inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-indigo-200 hover:bg-white/[0.10] hover:text-indigo-100 transition"
      : "mt-2 inline-flex text-[12px] font-medium text-indigo-300/85 underline-offset-4 hover:text-indigo-200 hover:underline";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedUserId(admins[0]?.id ?? "");
          setOpen(true);
        }}
        className={triggerClassName}
      >
        Manage admin password
      </button>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center px-3 py-3 sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[#020814]/88 backdrop-blur-md" onClick={() => setOpen(false)} />
          <div
            className="relative z-[1] w-full max-w-[760px] max-h-[92vh] flex flex-col overflow-hidden rounded-[22px] border border-white/[0.14]
                       bg-[linear-gradient(180deg,rgba(17,27,44,0.98),rgba(7,12,22,0.98))]
                       shadow-[0_30px_80px_-36px_rgba(0,0,0,0.92)]"
          >
            <div className="shrink-0 border-b border-white/[0.10] bg-white/[0.03] px-5 sm:px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold tracking-tight text-white/95">Manage Admin Password</h3>
                  <p className="text-[12px] text-white/55 mt-1 truncate">{schoolName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[11px] border border-white/[0.14] bg-[#0d1628]/92 p-2.5 text-white/65 hover:text-white hover:bg-[#15233a] transition"
                  aria-label="Close password popup"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
              {admins.length === 0 ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-100">
                  No school admin user found for this school. Please create or approve an admin first.
                </div>
              ) : (
                <>
                  <div className="rounded-[16px] border border-white/[0.10] bg-white/[0.03] p-3.5 sm:p-4">
                    <Label required>School admin user</Label>
                    <Select
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                    >
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} ({admin.email})
                        </option>
                      ))}
                    </Select>
                    {selectedAdmin ? (
                      <p className="mt-2 text-[11px] text-white/45">
                        Updating password for <span className="text-white/70">{selectedAdmin.email}</span>
                      </p>
                    ) : null}
                  </div>

                  <form action={updateAction} className="space-y-3.5 rounded-[16px] border border-white/[0.10] bg-white/[0.04] p-3.5 sm:p-4">
                    <input type="hidden" name="schoolId" value={schoolId} />
                    <input type="hidden" name="userId" value={selectedAdmin?.id ?? ""} />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-white/85">Set new password</p>
                      <label className="inline-flex items-center gap-2 text-[12px] text-white/70">
                        <input
                          type="checkbox"
                          checked={showPassword}
                          onChange={(event) => setShowPassword(event.target.checked)}
                          className="h-4 w-4 accent-indigo-500"
                        />
                        Show password
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label required>New password</Label>
                        <Input
                          name="newPassword"
                          type={showPassword ? "text" : "password"}
                          minLength={8}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <Label required>Confirm password</Label>
                        <Input
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          minLength={8}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {updateState.message ? (
                      <div
                        className={
                          "rounded-2xl border p-3 text-sm " +
                          (updateState.ok
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-white/80")
                        }
                      >
                        {updateState.message}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={updatePending || !selectedAdmin}>
                        {updatePending ? "Updating..." : "Update password"}
                      </Button>
                    </div>
                  </form>

                  <form action={resetAction} className="space-y-3 rounded-[16px] border border-white/[0.10] bg-white/[0.02] p-3.5 sm:p-4">
                    <input type="hidden" name="schoolId" value={schoolId} />
                    <input type="hidden" name="userId" value={selectedAdmin?.id ?? ""} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-white/85">Reset by email</p>
                      <p className="text-[11px] text-white/50">Secure link expires in 30 minutes</p>
                    </div>

                    <p className="text-xs text-white/65">Send a secure reset link to the selected school admin email.</p>

                    {resetState.message ? (
                      <div
                        className={
                          "rounded-2xl border p-3 text-sm " +
                          (resetState.ok
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-white/80")
                        }
                      >
                        {resetState.message}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="secondary" disabled={resetPending || !selectedAdmin}>
                        {resetPending ? "Sending..." : "Send reset email"}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.10] bg-white/[0.03] px-4 sm:px-6 py-3">
              <div className="flex items-center justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
        ,
        document.body
      )
        : null}
    </>
  );
}
