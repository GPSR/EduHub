import Link from "next/link";
import { Card, Input, Label, Button, SectionHeader } from "@/components/ui";
import { ConfirmableServerForm } from "@/components/confirmable-server-form";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { createStudentAction } from "../actions";
import { getSchoolStudentDemographicsConfig } from "@/lib/student-demographics";
import { formatSchoolId } from "@/lib/id-sequence";

export default async function NewStudentPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error = "" } = await searchParams;
  const errorMessages: Record<string, string> = {
    fullNameRequired: "Student full name is required.",
    fullNameInvalid: "Enter a valid student full name (letters, spaces, . ' - only).",
    classRequired: "Please select a class.",
    genderRequired: "Gender is required.",
    genderInvalid: "Selected gender is invalid. Please choose from configured options.",
    dobRequired: "Date of birth is required.",
    dobInvalid: "Enter a valid date of birth (not in the future).",
    addressRequired: "Student address is required.",
    addressInvalid: "Student address is invalid.",
    parentNameRequired: "Parent name is required.",
    parentNameInvalid: "Enter a valid parent name (letters, spaces, . ' - only).",
    parentMobileRequired: "Parent mobile number is required.",
    parentMobileInvalid: "Enter a valid parent mobile number.",
    parentEmailInvalid: "Enter a valid parent email address.",
    bloodGroupInvalid: "Selected blood group is invalid.",
    totalFeeInvalid: "Enter a valid total fee amount greater than 0."
  };
  const formError = error ? errorMessages[error] ?? "Please check the form details and try again." : null;

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
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
        ← Students
      </Link>
      <SectionHeader title="Add Student" subtitle="Fill in the student's details below" />

      <Card>
        {formError ? (
          <div className="mb-4 rounded-[12px] border border-rose-500/25 bg-rose-500/12 px-3.5 py-2.5 text-[12px] text-rose-100">
            {formError}
          </div>
        ) : null}
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
                <Input
                  name="fullName"
                  placeholder="e.g. Jane Smith"
                  required
                  minLength={2}
                  maxLength={80}
                  pattern="[A-Za-z][A-Za-z\s.'-]{1,79}"
                  title="Use letters, spaces, dot, apostrophe, hyphen only"
                />
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
                  required
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                >
                  <option value="" disabled>Select class</option>
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
                <Label required>Gender</Label>
                <select
                  name="gender"
                  required
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                >
                  <option value="" disabled>Select gender</option>
                  {demographicsConfig.genders.map((gender) => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>Date of birth</Label>
                <Input name="dateOfBirth" type="date" required max={todayIso} />
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
                <Label required>Address</Label>
                <Input name="address" placeholder="Student address" required minLength={5} maxLength={240} />
              </div>
              <div>
                <Label>Transport details</Label>
                <Input name="transportDetails" placeholder="Bus route / pickup point" maxLength={120} />
              </div>
              <div className="md:col-span-2">
                <Label>Medical notes</Label>
                <Input name="medicalNotes" placeholder="Allergies, medication, emergency notes" maxLength={300} />
              </div>
            </div>
          </div>

          {/* ── Parent Details ── */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Parent Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label required>Parent name</Label>
                <Input
                  name="parentName"
                  placeholder="e.g. John Smith"
                  required
                  minLength={2}
                  maxLength={80}
                  pattern="[A-Za-z][A-Za-z\s.'-]{1,79}"
                  title="Use letters, spaces, dot, apostrophe, hyphen only"
                />
              </div>
              <div>
                <Label>Parent email</Label>
                <Input name="parentEmail" type="email" placeholder="parent@example.com" />
                <p className="mt-1 text-[11px] text-white/35">Use email to send invite/signup link.</p>
              </div>
              <div>
                <Label required>Parent mobile</Label>
                <Input
                  name="parentMobile"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 9876543210"
                  required
                  minLength={10}
                  maxLength={15}
                  pattern="[0-9]{10,15}"
                  title="Use numbers only (10 to 15 digits)"
                />
                <p className="mt-1 text-[11px] text-white/35">Numbers only. 10 to 15 digits.</p>
              </div>
            </div>
          </div>

          {/* ── Fee Details ── */}
          {session.roleKey === "ADMIN" ? (
            <div className="md:col-span-2 pt-3 border-t border-white/[0.07]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3">Fee Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Total fee ($)</Label>
                  <Input name="totalFee" type="number" min="0" step="0.01" placeholder="e.g. 1200.00" />
                  <p className="mt-1 text-[11px] text-white/35">This creates the student's total fee invoice so parents see the same amount in Fees.</p>
                </div>
              </div>
            </div>
          ) : null}

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
