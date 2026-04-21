import Link from "next/link";
import { Card, Input, Label, Button } from "@/components/ui";
import { createStudentAction } from "../actions";

export default function NewStudentPage() {
  return (
    <Card title="Add Student">
      <form action={createStudentAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Student ID</Label>
          <Input name="studentId" placeholder="Auto" />
          <div className="mt-1 text-xs text-white/50">Leave empty to auto-generate.</div>
        </div>
        <div>
          <Label>Admission number</Label>
          <Input name="admissionNo" placeholder="Auto" />
          <div className="mt-1 text-xs text-white/50">Leave empty to auto-generate.</div>
        </div>
        <div className="md:col-span-2">
          <Label>Full name</Label>
          <Input name="fullName" placeholder="Student Name" required />
        </div>
        <div>
          <Label>Class</Label>
          <Input name="className" placeholder="Grade 6" />
        </div>
        <div>
          <Label>Section</Label>
          <Input name="section" placeholder="A" />
        </div>
        <div>
          <Label>Roll number</Label>
          <Input name="rollNumber" placeholder="12" />
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <Link href="/students" className="text-sm text-white/70 hover:text-white">
            Cancel
          </Link>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Card>
  );
}
