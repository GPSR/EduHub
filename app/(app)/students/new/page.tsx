import Link from "next/link";
import { Card, Input, Label, Button, SectionHeader } from "@/components/ui";
import { ConfirmableServerForm } from "@/components/confirmable-server-form";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { createStudentAction } from "../actions";
import { getSchoolStudentDemographicsConfig } from "@/lib/student-demographics";
import { formatSchoolId } from "@/lib/id-sequence";

export default async function NewStudentPage() {
  const { session } = await requirePermission("STUDENTS", "EDIT");
  const [school, classes, demographicsConfig] = await Promise.all([
    db.school.findUnique({
      where: { id: session.schoolId },
      select: {
        idSequencePad: true,
        studentIdFormat: true,
        studentIdNext: true,
        admissionNoFormat: true,
        admissionNoNext: true
      }
    }),
    db.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      select: { id: true, name: true, section: true }
    }),
    getSchoolStudentDemographicsConfig(session.schoolId)
  ]);
  if (!school) throw new Error("Unable to load school settings.");

  const nextStudentId = formatSchoolId({
    school,
    format: school.studentIdFormat,
    seq: school.studentIdNext
  });
  const nextAdmissionNo = formatSchoolId({
    school,
    format: school.admissionNoFormat,
    seq: school.admissionNoNext
  });
  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
        ← Students
      </Link>
      <SectionHeader title="Add Student" subtitle="Fill in the student's details below" />

      <Card>
        <ConfirmableServerForm
          action={createStudentAction}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          enabled={session.roleKey === "ADMIN"}
          confirmMessage="Please confirm student admission details before creating this student record."
        >

          {/* ── Identity ── */}
          <div className="md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Student ID</Label>
                <Input value={nextStudentId} disabled className="bg-white/[0.08] text-white/50 border-white/[0.08]" />
                <p className="mt-1 text-[11px] text-white/35">Auto-generated from Settings format.</p>
              </div>
              <div>
                <Label>Admission number</Label>
                <Input value={nextAdmissionNo} disabled className="bg-white/[0.08] text-white/50 border-white/[0.08]" />
                <p className="mt-1 text-[11px] text-white/35">Auto-generated from Settings format.</p>
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
                <Input value="Auto-generated on save" disabled className="bg-white/[0.08] text-white/50 border-white/[0.08]" />
                <p className="mt-1 text-[11px] text-white/35">Auto-generated from selected class strength.</p>
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
                  {demographicsConfig.genders.map((gender) => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
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
                  {demographicsConfig.bloodGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
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

          {/* ── Parent Details ── */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Parent Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Parent name</Label>
                <Input name="parentName" placeholder="e.g. John Smith" />
              </div>
              <div>
                <Label>Parent mobile</Label>
                <Input name="parentMobile" placeholder="+1 555 123 4567" />
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
        </ConfirmableServerForm>
      </Card>
    </div>
  );
}
