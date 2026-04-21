import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function StudentProfileRequestPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await requireSession();
  const { submitted } = await searchParams;

  if (session.roleKey !== "PARENT") {
    return (
      <Card title="Profile Update Request">
        <div className="text-sm text-white/70">This page is available to parents.</div>
      </Card>
    );
  }

  const students = await prisma.student.findMany({
    where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
    orderBy: { fullName: "asc" }
  });

  return (
    <div className="space-y-6">
      <Card title="Request Student Profile Update" description="Submit changes for admin approval.">
        {submitted ? (
          <div className="mb-4">
            <Badge tone="success">Submitted</Badge>
            <div className="mt-2 text-sm text-white/70">Your request was sent to the school for approval.</div>
          </div>
        ) : null}
        <RequestForm students={students.map((s) => ({ id: s.id, name: s.fullName }))} />
      </Card>
      <div className="text-sm text-white/60">
        <Link href="/students" className="underline">
          Back to students
        </Link>
      </div>
    </div>
  );
}

async function RequestForm({ students }: { students: { id: string; name: string }[] }) {
  const { StudentUpdateRequestForm } = await import("./ui");
  return <StudentUpdateRequestForm students={students} />;
}
