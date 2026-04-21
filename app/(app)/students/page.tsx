import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

export default async function StudentsPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canWrite = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;

  const students =
    session.roleKey === "PARENT"
      ? await prisma.student.findMany({
          where: {
            schoolId: session.schoolId,
            parents: { some: { userId: session.userId } }
          },
          orderBy: { fullName: "asc" }
        })
      : await prisma.student.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { createdAt: "desc" },
          take: 200
        });

  return (
    <Card title="Students">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-white/60">{students.length} students</div>
        {canWrite ? (
          <Link href="/students/new">
            <Button>Add student</Button>
          </Link>
        ) : null}
      </div>
      <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/students/${s.id}`}
            className="block px-4 py-3 hover:bg-white/5"
          >
            <div className="font-medium">{s.fullName}</div>
            <div className="text-xs text-white/60">
              Student ID: {s.studentId}
              {s.rollNumber ? ` • Roll: ${s.rollNumber}` : ""}
            </div>
          </Link>
        ))}
        {students.length === 0 ? (
          <div className="px-4 py-8 text-sm text-white/60">No students yet.</div>
        ) : null}
      </div>
    </Card>
  );
}
