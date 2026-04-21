import Link from "next/link";
import { Badge, Card, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function StudentProfileRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await requireSession();
  const { submitted } = await searchParams;

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
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/students" className="text-sm text-white/40 hover:text-white/70 transition">← Students</Link>
        <span className="text-white/20">/</span>
        <SectionHeader title="Request Profile Update" subtitle="Submit changes for admin approval" />
      </div>

      {submitted && (
        <div className="flex items-start gap-3 rounded-[16px] border border-emerald-500/25 bg-emerald-500/[0.08] p-4">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-[14px] font-semibold text-emerald-200">Request submitted</p>
            <p className="text-sm text-emerald-300/70 mt-0.5">Your changes have been sent to the school admin for review.</p>
          </div>
        </div>
      )}

      <Card title="Submit Changes" description="Your request will be reviewed by the school admin before being applied." accent="indigo">
        <RequestForm students={students.map(s => ({ id: s.id, name: s.fullName }))} />
      </Card>
    </div>
  );
}

async function RequestForm({ students }: { students: { id: string; name: string }[] }) {
  const { StudentUpdateRequestForm } = await import("./ui");
  return <StudentUpdateRequestForm students={students} />;
}
