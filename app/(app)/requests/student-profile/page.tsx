import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function StudentProfileRequestPage() {
  const session = await requireSession();

  if (session.roleKey !== "PARENT") {
    return (
      <div className="animate-fade-up">
        <Card>
          <EmptyState icon="🔒" title="Parents only" description="This page is only available to parent accounts." />
        </Card>
      </div>
    );
  }

  const students = await prisma.student.findMany({
    where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
    include: { class: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/students" className="text-sm text-white/40 hover:text-white/70 transition">← Students</Link>
        <span className="text-white/20">/</span>
        <SectionHeader title="Update Profile Details" subtitle="Changes save instantly and are visible to school admin." />
      </div>

      <Card
        title="Select Student"
        description="Open the student update form to edit parent and guardian information directly in the database."
        accent="indigo"
      >
        {students.length === 0 ? (
          <EmptyState icon="👤" title="No linked students" description="No students are linked to this parent account." />
        ) : (
          <div className="space-y-2.5">
            {students.map((student) => {
              const classLabel = student.class
                ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}`
                : "Class not set";
              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 rounded-[14px] border border-white/[0.10] bg-white/[0.03] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/90">{student.fullName}</p>
                    <p className="mt-0.5 text-xs text-white/50">{classLabel} · {student.studentId}</p>
                  </div>
                  <Link
                    href={`/students/${student.id}/edit`}
                    className="inline-flex items-center justify-center rounded-[11px] border border-white/[0.14] bg-[#111c30]/90 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-[#17253d] hover:text-white"
                  >
                    Update details
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
