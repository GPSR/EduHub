import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const student = await prisma.student.findFirst({
    where:
      session.roleKey === "PARENT"
        ? { id, schoolId: session.schoolId, parents: { some: { userId: session.userId } } }
        : { id, schoolId: session.schoolId },
    include: { class: true }
  });
  if (!student) return notFound();

  return (
    <div className="space-y-6">
      <Card title="Student Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Full name" value={student.fullName} />
          <Field label="Student ID" value={student.studentId} />
          <Field label="Admission number" value={student.admissionNo ?? "-"} />
          <Field
            label="Class/Section"
            value={
              student.class ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}` : "-"
            }
          />
          <Field label="Roll number" value={student.rollNumber ?? "-"} />
          <Field label="Gender" value={student.gender ?? "-"} />
          <Field label="DOB" value={student.dateOfBirth ? student.dateOfBirth.toDateString() : "-"} />
          <Field label="Blood group" value={student.bloodGroup ?? "-"} />
          <Field label="Address" value={student.address ?? "-"} />
          <Field label="Transport" value={student.transportDetails ?? "-"} />
          <Field label="Medical notes" value={student.medicalNotes ?? "-"} />
        </div>
      </Card>

      <Card title="Parent & Guardian">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Father name" value={student.fatherName ?? "-"} />
          <Field label="Mother name" value={student.motherName ?? "-"} />
          <Field label="Mobile(s)" value={student.parentMobiles ?? "-"} />
          <Field label="Email(s)" value={student.parentEmails ?? "-"} />
          <Field label="Occupation" value={student.parentOccupation ?? "-"} />
          <Field label="Emergency contact" value={student.emergencyContact ?? "-"} />
          <Field label="Guardian name" value={student.guardianName ?? "-"} />
          <Field label="Relationship" value={student.guardianRelationship ?? "-"} />
          <Field label="Guardian mobile" value={student.guardianMobile ?? "-"} />
          <Field label="Pickup authorization" value={student.pickupAuthDetails ?? "-"} />
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
      <div className="text-white/60">{label}</div>
      <div className="mt-1 text-white/90 break-words">{value}</div>
    </div>
  );
}
