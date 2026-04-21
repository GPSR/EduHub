import Link from "next/link";
import { Card, Input, Label, Button, SectionHeader } from "@/components/ui";
import { createStudentAction } from "../actions";

export default function NewStudentPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
        ← Students
      </Link>
      <SectionHeader title="Add Student" subtitle="Fill in the student's details below" />

      <Card>
        <form action={createStudentAction} className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Identity ── */}
          <div className="md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Student ID</Label>
                <Input name="studentId" placeholder="Auto-generated" />
                <p className="mt-1 text-[11px] text-white/35">Leave empty to auto-generate.</p>
              </div>
              <div>
                <Label>Admission number</Label>
                <Input name="admissionNo" placeholder="Auto-generated" />
                <p className="mt-1 text-[11px] text-white/35">Leave empty to auto-generate.</p>
              </div>
              <div className="md:col-span-2">
                <Label required>Full name</Label>
                <Input name="fullName" placeholder="e.g. Jane Smith" required />
              </div>
            </div>
          </div>

          {/* ── Class ── */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Class</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <Link href="/students">
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button type="submit">Create student →</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
