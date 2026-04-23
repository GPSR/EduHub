import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const { id } = await params;

  const student = await prisma.student.findFirst({
    where:
      session.roleKey === "PARENT"
        ? { id, schoolId: session.schoolId, parents: { some: { userId: session.userId } } }
        : { id, schoolId: session.schoolId },
    include: { class: true },
  });
  if (!student) return notFound();

  const className = student.class
    ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}`
    : null;

  const initials = student.fullName.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Students
      </Link>
      {session.roleKey !== "PARENT" && (
        <div>
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="secondary" size="sm">Edit Student</Button>
          </Link>
        </div>
      )}
      {session.roleKey === "PARENT" && (
        <div>
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="secondary" size="sm">Edit Details</Button>
          </Link>
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px]
                          bg-gradient-to-b from-indigo-400 to-indigo-600 text-xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/95 tracking-tight">{student.fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {className && <Badge tone="info">{className}</Badge>}
              {student.rollNumber && <Badge tone="neutral">Roll {student.rollNumber}</Badge>}
              <Badge tone="neutral">ID: {student.studentId}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Academic Details" accent="indigo">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Admission Number" value={student.admissionNo ?? "—"} />
            <Field label="Class / Section" value={className ?? "—"} />
            <Field label="Roll Number" value={student.rollNumber ?? "—"} />
            <Field label="Gender" value={student.gender ?? "—"} />
            <Field label="Date of Birth" value={student.dateOfBirth ? student.dateOfBirth.toDateString() : "—"} />
            <Field label="Blood Group" value={student.bloodGroup ?? "—"} />
          </div>
        </Card>

        <Card title="Contact & Other" accent="teal">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Address" value={student.address ?? "—"} />
            <Field label="Transport" value={student.transportDetails ?? "—"} />
            <Field label="Medical Notes" value={student.medicalNotes ?? "—"} />
          </div>
        </Card>

        <Card title="Parent & Guardian" accent="indigo" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Father's Name" value={student.fatherName ?? "—"} />
            <Field label="Mother's Name" value={student.motherName ?? "—"} />
            <Field label="Mobile(s)" value={student.parentMobiles ?? "—"} />
            <Field label="Email(s)" value={student.parentEmails ?? "—"} />
            <Field label="Occupation" value={student.parentOccupation ?? "—"} />
            <Field label="Emergency Contact" value={student.emergencyContact ?? "—"} />
            <Field label="Guardian Name" value={student.guardianName ?? "—"} />
            <Field label="Relationship" value={student.guardianRelationship ?? "—"} />
            <Field label="Guardian Mobile" value={student.guardianMobile ?? "—"} />
            <Field label="Pickup Authorization" value={student.pickupAuthDetails ?? "—"} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[14px] text-white/80 break-words">{value}</p>
    </div>
  );
}
