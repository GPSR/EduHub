"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { createSchoolInviteAction, type CreateSchoolState } from "./actions";

const initialState: CreateSchoolState = { ok: true };

export function SchoolCreateForm() {
  const [state, action, pending] = useActionState(createSchoolInviteAction, initialState);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <div className="md:col-span-2">
        <Label>School name</Label>
        <Input name="schoolName" placeholder="Greenwood Public School" required />
      </div>
      <div>
        <Label>School slug</Label>
        <Input name="schoolSlug" placeholder="greenwood" required />
        <div className="mt-1 text-xs text-white/50">Used for login and URLs.</div>
      </div>
      <div>
        <Label>Plan</Label>
        <Select name="plan" defaultValue="PREMIUM">
          <option value="PREMIUM">Premium</option>
          <option value="DEFAULT">Default</option>
          <option value="UNLIMITED">Unlimited</option>
          <option value="BETA">Beta (Legacy)</option>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Admin email (invite)</Label>
        <Input name="adminEmail" type="email" placeholder="admin@school.com" required />
      </div>

      {!state.ok && state.message ? (
        <div className="md:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create & generate invite"}
        </Button>
      </div>
    </form>
  );
}
