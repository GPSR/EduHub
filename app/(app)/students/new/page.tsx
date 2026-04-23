import Link from "next/link";
import { Card, Input, Label, Button, SectionHeader } from "@/components/ui";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/db";
import { createStudentAction } from "../actions";

export default async function NewStudentPage() {
  const { session } = await requirePermission("STUDENTS", "EDIT");
  const classes = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ name: "asc" }, { section: "asc" }],
    select: { id: true, name: true, section: true }
  });
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
              <div className="md:col-span-2">
                <Label>Configured class</Label>
                <select
                  name="classId"
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.section ? ` - ${c.section}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-white/35">Classes are managed in Settings → Class Configuration.</p>
              </div>
              <div>
                <Label>Roll number</Label>
                <Input name="rollNumber" placeholder="12" />
                <p className="mt-1 text-[11px] text-white/35">Leave empty to auto-assign by class strength.</p>
              </div>
            </div>
          </div>

          {/* ── Student Details ── */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Student Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Gender</Label>
                <select
                  name="gender"
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input name="dateOfBirth" type="date" />
              </div>
              <div>
                <Label>Blood group</Label>
                <select
                  name="bloodGroup"
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <Label>Address</Label>
                <Input name="address" placeholder="Student address" />
              </div>
              <div>
                <Label>Transport details</Label>
                <Input name="transportDetails" placeholder="Bus route / pickup point" />
              </div>
              <div className="md:col-span-2">
                <Label>Medical notes</Label>
                <Input name="medicalNotes" placeholder="Allergies, medication, emergency notes" />
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
