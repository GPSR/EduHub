"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Button, Input, Label } from "@/components/ui";
import { updatePlatformProfileAction, changePlatformPasswordAction, type PlatformProfileState } from "@/app/platform/(app)/profile/actions";

const initialState: PlatformProfileState = { ok: true };

function FormMsg({ state }: { state: PlatformProfileState }) {
  if (!state.message) return null;
  return (
    <div className={["flex items-start gap-2 rounded-[10px] border p-3 text-xs",
      state.ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
               : "border-rose-500/25 bg-rose-500/10 text-rose-200"].join(" ")}>
      <span>{state.ok ? "✓" : "⚠"}</span>{state.message}
    </div>
  );
}

export function PlatformUserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [profileState, profileAction, profilePending] = useActionState(updatePlatformProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePlatformPasswordAction, initialState);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 rounded-[12px] border border-white/[0.09] bg-white/[0.05]
                   px-3 py-1.5 hover:bg-white/[0.09] transition-all"
      >
        <div className="grid h-6 w-6 place-items-center rounded-[7px]
                        bg-gradient-to-b from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
          {initials}
        </div>
        <span className="text-sm font-medium text-white/80 hidden sm:block">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] rounded-[20px] border border-white/[0.10]
                        bg-[#060912]/97 backdrop-blur-2xl p-5 z-30
                        shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]
                        animate-fade-up" style={{ animationDuration: "0.15s" }}>
          {/* User info header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.07] mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-[11px]
                            bg-gradient-to-b from-indigo-400 to-indigo-600
                            text-sm font-bold text-white shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-white/90 truncate">{name}</p>
              <p className="text-[11px] text-white/40 truncate">{email}</p>
            </div>
          </div>

          {/* Update profile */}
          <form action={profileAction} className="space-y-3 pb-4 border-b border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Update profile</p>
            <div>
              <Label required>Name</Label>
              <Input name="name" defaultValue={name} required />
            </div>
            <div>
              <Label required>Email</Label>
              <Input name="email" type="email" defaultValue={email} required />
            </div>
            <FormMsg state={profileState} />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={profilePending}>
                {profilePending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>

          {/* Change password */}
          <form action={pwAction} className="space-y-3 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Change password</p>
            <Input name="currentPassword" type="password" placeholder="Current password" required />
            <Input name="newPassword"     type="password" placeholder="New password (min 10)" minLength={10} required />
            <Input name="confirmPassword" type="password" placeholder="Confirm new password" minLength={10} required />
            <FormMsg state={pwState} />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pwPending}>
                {pwPending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
