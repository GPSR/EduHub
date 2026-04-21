"use client";

import { useActionState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  changePasswordAction,
  updateProfileAction,
  type ProfileState
} from "@/app/(app)/profile/actions";

const initialState: ProfileState = { ok: true };

export function ProfileSettings({
  email,
  firstName,
  lastName,
  gender,
  phoneNumber,
  alternatePhoneNumber,
  address,
  city,
  state,
  country,
  postalCode,
  dateOfBirth,
  emergencyContactName,
  emergencyContactPhone,
  notes
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
    <div className="space-y-6">
      <Card title="Personal info" description="Update your profile and contact information">
        <form action={profileAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label>First name</Label>
            <Input name="firstName" defaultValue={firstName ?? ""} required />
          </div>
          <div>
            <Label>Last name</Label>
            <Input name="lastName" defaultValue={lastName ?? ""} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={email} required />
          </div>
          <div>
            <Label>Gender</Label>
            <Select name="gender" defaultValue={gender ?? ""}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </Select>
          </div>
          <div>
            <Label>Phone number</Label>
            <Input name="phoneNumber" defaultValue={phoneNumber ?? ""} />
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
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input name="address" defaultValue={address ?? ""} />
          </div>
          <div>
            <Label>City</Label>
            <Input name="city" defaultValue={city ?? ""} />
          </div>
          <div>
            <Label>State</Label>
            <Input name="state" defaultValue={state ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>Country</Label>
            <Input name="country" defaultValue={country ?? ""} />
          </div>
          <div>
            <Label>Emergency contact name</Label>
            <Input name="emergencyContactName" defaultValue={emergencyContactName ?? ""} />
          </div>
          <div>
            <Label>Emergency contact phone</Label>
            <Input name="emergencyContactPhone" defaultValue={emergencyContactPhone ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>Additional notes</Label>
            <Textarea name="notes" defaultValue={notes ?? ""} rows={4} placeholder="Any additional personal details" />
          </div>

          {profileState.message ? (
            <div
              className={
                "md:col-span-2 rounded-2xl border p-3 text-sm " +
                (profileState.ok
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200")
              }
            >
              {profileState.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Change password" description="Use a strong password with at least 8 characters">
        <form action={pwAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="md:col-span-2">
            <Label>Current password</Label>
            <Input name="currentPassword" type="password" required />
          </div>
          <div>
            <Label>New password</Label>
            <Input name="newPassword" type="password" minLength={8} required />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input name="confirmPassword" type="password" minLength={8} required />
          </div>

          {pwState.message ? (
            <div
              className={
                "md:col-span-2 rounded-2xl border p-3 text-sm " +
                (pwState.ok
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200")
              }
            >
              {pwState.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={pwPending}>
              {pwPending ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
