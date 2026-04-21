"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  updatePlatformProfileAction,
  changePlatformPasswordAction,
  type PlatformProfileState
} from "@/app/platform/(app)/profile/actions";

const initialState: PlatformProfileState = { ok: true };

export function PlatformUserMenu({
  name,
  email
}: {
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [profileState, profileAction, profilePending] = useActionState(updatePlatformProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePlatformPasswordAction, initialState);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-white/90 hover:text-white rounded-xl border border-white/10 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.08] transition font-medium"
      >
        {name}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-[380px] rounded-2xl border border-white/10 bg-[#0b1020]/95 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)] p-4 z-20 backdrop-blur">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-white/60">{email}</div>

          <div className="mt-4 space-y-4">
            <form action={profileAction} className="space-y-2">
              <div className="text-xs text-white/60">Update profile</div>
              <div>
                <Label>Name</Label>
                <Input name="name" defaultValue={name} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={email} required />
              </div>
              {profileState.message ? (
                <div className={"rounded-xl border p-2 text-xs " + (profileState.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-rose-500/30 bg-rose-500/10 text-rose-200")}>
                  {profileState.message}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={profilePending}>
                  {profilePending ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>

            <form action={pwAction} className="space-y-2 border-t border-white/10 pt-3">
              <div className="text-xs text-white/60">Change password</div>
              <Input name="currentPassword" type="password" placeholder="Current password" required />
              <Input name="newPassword" type="password" minLength={10} placeholder="New password" required />
              <Input name="confirmPassword" type="password" minLength={10} placeholder="Confirm new password" required />
              {pwState.message ? (
                <div className={"rounded-xl border p-2 text-xs " + (pwState.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-rose-500/30 bg-rose-500/10 text-rose-200")}>
                  {pwState.message}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={pwPending}>
                  {pwPending ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
