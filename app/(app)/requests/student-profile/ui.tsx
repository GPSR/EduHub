"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Textarea, Select } from "@/components/ui";
import { createStudentUpdateRequestAction, type StudentUpdateState } from "./actions";

const initialState: StudentUpdateState = { ok: true };

export function StudentUpdateRequestForm({
  students
}: {
  students: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createStudentUpdateRequestAction, initialState);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Student</Label>
        <Select name="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Address</Label>
          <Textarea name="address" rows={3} placeholder="Student address" />
        </div>
        <div>
          <Label>Emergency contact</Label>
          <Input name="emergencyContact" placeholder="Phone number" />
        </div>
        <div>
          <Label>Parent mobiles</Label>
          <Input name="parentMobiles" placeholder="Comma-separated" />
        </div>
        <div>
          <Label>Parent emails</Label>
          <Input name="parentEmails" placeholder="Comma-separated" />
        </div>
        <div>
          <Label>Parent address</Label>
          <Textarea name="parentAddress" rows={2} placeholder="Parent address (if different)" />
        </div>
        <div>
          <Label>Medical notes</Label>
          <Textarea name="medicalNotes" rows={2} placeholder="Allergies / conditions" />
        </div>
        <div>
          <Label>Guardian name</Label>
          <Input name="guardianName" placeholder="Guardian name" />
        </div>
        <div>
          <Label>Guardian relationship</Label>
          <Input name="guardianRelationship" placeholder="Uncle / Aunt / etc." />
        </div>
        <div>
          <Label>Guardian mobile</Label>
          <Input name="guardianMobile" placeholder="Phone number" />
        </div>
        <div>
          <Label>Guardian address</Label>
          <Textarea name="guardianAddress" rows={2} placeholder="Guardian address" />
        </div>
        <div className="md:col-span-2">
          <Label>Pickup authorization</Label>
          <Textarea name="pickupAuthDetails" rows={2} placeholder="Who can pick up the student?" />
        </div>
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit for approval"}
      </Button>
    </form>
  );
}
