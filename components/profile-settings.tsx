"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { changePasswordAction, updateProfileAction, type ProfileState } from "@/app/(app)/profile/actions";

const initialState: ProfileState = { ok: true };

function FormMessage({ state }: { state: ProfileState }) {
  if (!state.message) return null;
  return (
    <div className={[
      "sm:col-span-2 flex items-start gap-2.5 rounded-[12px] border p-3.5 text-sm",
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
  const [editingPassword, setEditingPassword] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const dobValue = dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : "";
  const dobDisplay = dateOfBirth ? dateOfBirth.toDateString() : "—";

  useEffect(() => {
    if (profileState.ok && profileState.message) setEditingProfile(false);
  }, [profileState]);

  useEffect(() => {
    if (pwState.ok && pwState.message) setEditingPassword(false);
  }, [pwState]);

  useEffect(() => {
    if (editingProfile) setProfileExpanded(true);
  }, [editingProfile]);

  useEffect(() => {
    if (editingPassword) setPasswordExpanded(true);
  }, [editingPassword]);

  return (
    <div className="space-y-5">
      <Card
        title="Profile"
        description={editingProfile ? "Edit your information" : profileExpanded ? "View your information" : "Collapsed by default. Click view to expand."}
        accent="indigo"
        action={editingProfile ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileExpanded((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#3a3b3c] px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/[0.16] transition"
            >
              {profileExpanded ? "▴ Hide" : "▾ View"}
            </button>
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#3a3b3c] px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/[0.16] transition"
            >
              ✎ Edit
            </button>
          </div>
        )}
      >
        {!editingProfile && !profileExpanded ? (
          <p className="text-sm text-white/55">
            Profile information is collapsed. Tap <span className="text-white/80 font-medium">View</span> to expand details.
          </p>
        ) : !editingProfile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        ) : (
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

            <FormMessage state={profileState} />

            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingProfile(false)} disabled={profilePending}>
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
        )}
      </Card>

      <Card
        title="Change Password"
        description={editingPassword ? "Use a strong password with at least 8 characters" : passwordExpanded ? "Use a strong password with at least 8 characters" : "Collapsed by default. Click view to open password section."}
        accent="rose"
        action={editingPassword ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPasswordExpanded((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#3a3b3c] px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/[0.16] transition"
            >
              {passwordExpanded ? "▴ Hide" : "▾ View"}
            </button>
            <button
              type="button"
              onClick={() => setEditingPassword(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#3a3b3c] px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/[0.16] transition"
            >
              ✎ Edit
            </button>
          </div>
        )}
      >
        {!editingPassword && !passwordExpanded ? (
          <p className="text-sm text-white/55">
            Password section is collapsed. Tap <span className="text-white/80 font-medium">View</span> to expand.
          </p>
        ) : !editingPassword ? (
          <p className="text-sm text-white/55">
            Your password is hidden for security. Click the edit icon to change it.
          </p>
        ) : (
          <form action={pwAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
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

            <div className="sm:col-span-2 flex justify-end gap-2">
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
        )}
      </Card>
    </div>
  );
}
