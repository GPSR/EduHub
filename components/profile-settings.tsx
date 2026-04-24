"use client";

import { useActionState } from "react";
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

export function ProfileSettings({
  email, firstName, lastName, gender, phoneNumber, alternatePhoneNumber,
  address, city, state: stateVal, country, postalCode, dateOfBirth,
  emergencyContactName, emergencyContactPhone, notes,
}: {
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
  const dobValue = dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-5">
      {/* ── Personal info ── */}
      <Card title="Personal Information" description="Update your profile and contact details" accent="indigo">
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

          {/* Divider */}
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

          {/* Divider */}
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

          <div className="sm:col-span-2 flex justify-end">
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
      </Card>

      {/* ── Password ── */}
      <Card title="Change Password" description="Use a strong password with at least 8 characters" accent="rose">
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

          <div className="sm:col-span-2 flex justify-end">
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
      </Card>
    </div>
  );
}
