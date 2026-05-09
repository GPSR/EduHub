"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { updateUserPasswordAction, type UpdateUserPasswordState } from "./actions";

const initialState: UpdateUserPasswordState = { ok: true };

export function UserPasswordUpdateForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(updateUserPasswordAction, initialState);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Manage Password
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-[1] w-full sm:max-w-xl rounded-t-[22px] sm:rounded-[24px] border border-white/[0.10] bg-[#060912]/97 shadow-[0_-20px_60px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-[16px] font-semibold text-white/95">Manage Password</h3>
                <p className="text-[12px] text-white/50 mt-0.5">Set a new password for this user</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[10px] border border-white/[0.10] bg-white/[0.04] p-2 text-white/60 hover:text-white hover:bg-white/[0.10] transition"
                aria-label="Close password popup"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-5 sm:px-6 py-4">
              <form action={action} className="space-y-3">
                <input type="hidden" name="userId" value={userId} />

                <label className="inline-flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Show password while typing
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label required>New password</Label>
                    <Input name="newPassword" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" />
                  </div>
                  <div>
                    <Label required>Confirm password</Label>
                    <Input name="confirmPassword" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" />
                  </div>
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

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                    Close
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={pending}>
                    {pending ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
