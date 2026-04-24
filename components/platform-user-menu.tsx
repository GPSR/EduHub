"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
      <p className="text-[13px] text-white/85 break-all">{value || "—"}</p>
    </div>
  );
}

export function PlatformUserMenu({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [profileState, profileAction, profilePending] = useActionState(updatePlatformProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePlatformPasswordAction, initialState);

  useEffect(() => {
    setOpen(false);
    setEditingProfile(false);
    setEditingPassword(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  useEffect(() => {
    if (profileState.ok && profileState.message) setEditingProfile(false);
  }, [profileState]);

  useEffect(() => {
    if (pwState.ok && pwState.message) setEditingPassword(false);
  }, [pwState]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const current = Number(body.dataset.scrollLockCount ?? "0");
    body.dataset.scrollLockCount = String(current + 1);
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      const next = Math.max(0, Number(body.dataset.scrollLockCount ?? "1") - 1);
      body.dataset.scrollLockCount = String(next);
      if (next === 0) {
        html.style.overflow = "";
        body.style.overflow = "";
      }
    };
  }, [open]);

  const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();
  const panelContent = (
    <>
      {/* User info header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.07] mb-4">
        <div className="grid h-10 w-10 place-items-center rounded-[11px]
                        bg-gradient-to-b from-indigo-400 to-indigo-600
                        text-sm font-bold text-white shadow-sm shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white/90 truncate">{name}</p>
          <p className="text-[11px] text-white/40 break-all">{email}</p>
        </div>
      </div>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Profile</p>
          {!editingProfile && (
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/[0.10] transition"
            >
              ✎ Edit
            </button>
          )}
        </div>
        {!editingProfile ? (
          <div className="mt-3 space-y-3">
            <ValueRow label="Name" value={name} />
            <ValueRow label="Email" value={email} />
          </div>
        ) : (
          <form action={profileAction} className="mt-3 space-y-3">
            <div>
              <Label required>Name</Label>
              <Input name="name" defaultValue={name} required />
            </div>
            <div>
              <Label required>Email</Label>
              <Input name="email" type="email" defaultValue={email} required />
            </div>
            <FormMsg state={profileState} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProfile(false)} disabled={profilePending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={profilePending}>
                {profilePending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-3.5 mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Change password</p>
          {!editingPassword && (
            <button
              type="button"
              onClick={() => setEditingPassword(true)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/[0.10] transition"
            >
              ✎ Edit
            </button>
          )}
        </div>
        {!editingPassword ? (
          <p className="mt-3 text-xs text-white/55">
            Password is hidden for security. Click edit to change it.
          </p>
        ) : (
          <form action={pwAction} className="mt-3 space-y-3">
            <Input name="currentPassword" type="password" placeholder="Current password" required />
            <Input name="newPassword"     type="password" placeholder="New password (min 10)" minLength={10} required />
            <Input name="confirmPassword" type="password" placeholder="Confirm new password" minLength={10} required />
            <FormMsg state={pwState} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingPassword(false)} disabled={pwPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pwPending}>
                {pwPending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.16] bg-white/[0.08]
                   px-2.5 py-1.5 text-white/90 hover:bg-white/[0.14] transition-all"
        aria-label="Open profile menu"
      >
        <div className="grid h-6 w-6 place-items-center rounded-[7px]
                        bg-gradient-to-b from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
          {initials}
        </div>
        <span className="text-[12px] font-semibold sm:hidden">Menu</span>
        <span className="text-sm font-medium text-white/80 hidden sm:block truncate max-w-[9rem]">{name}</span>
        <span className="text-white/60 text-[11px] leading-none">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close profile menu"
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          />
          <div className="md:hidden fixed inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] top-[calc(env(safe-area-inset-top,0px)+56px)] z-50">
            <div
              className="h-full overflow-y-auto rounded-[20px] border border-white/[0.10]
                         bg-[#060912]/97 backdrop-blur-2xl p-4
                         shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]
                         animate-fade-up"
              style={{ animationDuration: "0.15s" }}
            >
              {panelContent}
            </div>
          </div>
          <div
            className="hidden md:block absolute right-0 mt-2 w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[75vh] overflow-y-auto
                       rounded-[20px] border border-white/[0.10] bg-[#060912]/97 backdrop-blur-2xl p-5
                       shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] animate-fade-up z-50"
            style={{ animationDuration: "0.15s" }}
          >
            {panelContent}
          </div>
        </>
      )}
    </div>
  );
}
