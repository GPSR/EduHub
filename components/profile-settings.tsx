"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { changePasswordAction, updateProfileAction, type ProfileState } from "@/app/(app)/profile/actions";
import { BiometricLockSettings } from "@/components/biometric-lock-settings";

const initialState: ProfileState = { ok: true };

function FormMessage({ state }: { state: ProfileState }) {
  if (!state.message) return null;
  return (
    <div className={[
      "flex items-start gap-2.5 rounded-[12px] border p-3.5 text-sm",
      state.ok
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
        : "border-rose-500/25 bg-rose-500/10 text-rose-200",
    ].join(" ")}>
      <span className="shrink-0 mt-0.5">{state.ok ? "✓" : "⚠"}</span>
      {state.message}
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[14px] text-white/80 break-words">{value || "—"}</p>
    </div>
  );
}

export function ProfileSettings({
  roleKey,
  schoolLabel,
  email, firstName, lastName, gender, phoneNumber, alternatePhoneNumber,
  address, city, state: stateVal, country, postalCode, dateOfBirth,
  emergencyContactName, emergencyContactPhone, notes,
}: {
  roleKey: string;
  schoolLabel: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  dateOfBirth?: Date | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, initialState);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const dobValue = dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : "";
  const dobDisplay = dateOfBirth ? dateOfBirth.toDateString() : "—";

  useEffect(() => {
    if (profileState.ok && profileState.message) {
      setEditingProfile(false);
    }
  }, [profileState]);

  useEffect(() => {
    if (pwState.ok && pwState.message) setEditingPassword(false);
  }, [pwState]);

  return (
    <div className="space-y-3">
      <Card
        title="Profile"
        description={editingProfile ? "Edit your information" : undefined}
        className={profileOpen || editingProfile ? "p-3.5 sm:p-4" : "p-3 sm:p-3.5"}
        accent="indigo"
        action={editingProfile ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-label={profileOpen ? "Collapse profile details" : "Expand profile details"}
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">{profileOpen ? "▾" : "▸"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProfile(true);
                setProfileOpen(true);
              }}
              aria-label="Edit profile"
              className={[
                "sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border transition",
                editingProfile
                  ? "border-blue-300/40 bg-blue-500/20 text-blue-100"
                  : "border-white/[0.14] bg-[#0f1728]/90 text-white/85 hover:bg-[#1a2945]",
              ].join(" ")}
            >
              <span aria-hidden className="text-[14px] leading-none">✎</span>
            </button>
          </div>
        )}
      >
        {!editingProfile && profileOpen ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
            <ValueRow label="First name" value={firstName ?? "—"} />
            <ValueRow label="Last name" value={lastName ?? "—"} />
            <ValueRow label="Email" value={email} />
            <ValueRow label="Gender" value={gender ?? "—"} />
            <ValueRow label="Phone number" value={phoneNumber ?? "—"} />
            <ValueRow label="Alternate phone" value={alternatePhoneNumber ?? "—"} />
            <ValueRow label="Date of birth" value={dobDisplay} />
            <ValueRow label="Postal code" value={postalCode ?? "—"} />
            <ValueRow label="Address" value={address ?? "—"} />
            <ValueRow label="City" value={city ?? "—"} />
            <ValueRow label="State / Province" value={stateVal ?? "—"} />
            <ValueRow label="Country" value={country ?? "—"} />
            <ValueRow label="Role" value={roleKey} />
            <ValueRow label="School" value={schoolLabel} />
            <ValueRow label="Emergency contact name" value={emergencyContactName ?? "—"} />
            <ValueRow label="Emergency contact phone" value={emergencyContactPhone ?? "—"} />
            <div className="sm:col-span-2">
              <ValueRow label="Additional notes" value={notes ?? "—"} />
            </div>
          </div>
        ) : editingProfile ? (
          <form action={profileAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label required>First name</Label>
              <Input name="firstName" defaultValue={firstName ?? ""} required />
            </div>
            <div>
              <Label required>Last name</Label>
              <Input name="lastName" defaultValue={lastName ?? ""} required />
            </div>
            <div>
              <Label required>Email</Label>
              <Input name="email" type="email" defaultValue={email} required />
            </div>
            <div>
              <Label>Gender</Label>
              <Select name="gender" defaultValue={gender ?? ""}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </Select>
            </div>
            <div className="sm:col-span-2 h-px bg-white/[0.07]" />
            <div>
              <Label>Phone number</Label>
              <Input name="phoneNumber" defaultValue={phoneNumber ?? ""} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <Label>Alternate phone</Label>
              <Input name="alternatePhoneNumber" defaultValue={alternatePhoneNumber ?? ""} />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input name="dateOfBirth" type="date" defaultValue={dobValue} />
            </div>
            <div>
              <Label>Postal code</Label>
              <Input name="postalCode" defaultValue={postalCode ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={address ?? ""} />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" defaultValue={city ?? ""} />
            </div>
            <div>
              <Label>State / Province</Label>
              <Input name="state" defaultValue={stateVal ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Country</Label>
              <Input name="country" defaultValue={country ?? ""} />
            </div>
            <div className="sm:col-span-2 h-px bg-white/[0.07]" />
            <div>
              <Label>Emergency contact name</Label>
              <Input name="emergencyContactName" defaultValue={emergencyContactName ?? ""} />
            </div>
            <div>
              <Label>Emergency contact phone</Label>
              <Input name="emergencyContactPhone" defaultValue={emergencyContactPhone ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Additional notes</Label>
              <Textarea name="notes" defaultValue={notes ?? ""} rows={3} placeholder="Any additional details…" />
            </div>

            <div className="sm:col-span-2">
              <FormMessage state={profileState} />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingProfile(false);
                }}
                disabled={profilePending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={profilePending}>
                {profilePending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Saving…
                  </span>
                ) : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null
      }
      </Card>

      <BiometricLockSettings />

      <Card
        title="Change Password"
        description={editingPassword ? "Update your account password" : undefined}
        className={passwordOpen || editingPassword ? "p-3.5 sm:p-4" : "p-3 sm:p-3.5"}
        accent="rose"
        action={editingPassword ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPasswordOpen((current) => !current)}
              aria-label={passwordOpen ? "Collapse password details" : "Expand password details"}
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">{passwordOpen ? "▾" : "▸"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPassword(true);
                setPasswordOpen(true);
              }}
              aria-label="Edit password"
              className="sm-btn min-h-0 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#0f1728]/90 text-white/85 transition hover:bg-[#1a2945]"
            >
              <span aria-hidden className="text-[14px] leading-none">✎</span>
            </button>
          </div>
        )}
      >
        {!editingPassword && passwordOpen ? (
          <div className="grid grid-cols-1 gap-3">
            <ValueRow label="Password" value="Hidden for security" />
          </div>
        ) : editingPassword ? (
          <form action={pwAction} className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <Label required>Current password</Label>
              <Input name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            <div>
              <Label required>New password</Label>
              <Input name="newPassword" type="password" minLength={8} required autoComplete="new-password" />
            </div>
            <div>
              <Label required>Confirm new password</Label>
              <Input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" />
            </div>

            <FormMessage state={pwState} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingPassword(false)} disabled={pwPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pwPending}>
                {pwPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Updating…
                  </span>
                ) : "Update password"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
