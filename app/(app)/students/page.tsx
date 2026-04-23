import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";

function avatarColor(name: string) {
  const colors = [
    "from-indigo-400 to-indigo-600",
    "from-violet-400 to-violet-600",
    "from-teal-400 to-teal-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-sky-400 to-sky-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default async function StudentsPage() {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;

  const students =
    session.roleKey === "PARENT"
      ? await prisma.student.findMany({
          where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
          orderBy: { fullName: "asc" },
          include: { class: true },
        })
      : await prisma.student.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { createdAt: "desc" },
          take: 200,
          include: { class: true },
        });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Students"
          subtitle={`${students.length} student${students.length !== 1 ? "s" : ""} enrolled`}
        />
        {canWrite && (
          <Link href="/students/new">
            <Button size="sm">+ Add student</Button>
          </Link>
        )}
      </div>

      <Card>
        {students.length === 0 ? (
          <EmptyState icon="👥" title="No students yet" description="Add your first student to get started." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {students.map((s, i) => {
              const initials = s.fullName.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
              const className = s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : null;
              return (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className={`flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.04] transition-colors
                              ${i === 0 ? "rounded-t-[14px]" : ""}
                              ${i === students.length - 1 ? "rounded-b-[14px]" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-[11px]
                                   bg-gradient-to-b ${avatarColor(s.fullName)} text-xs font-bold text-white shadow-sm`}>
                    {initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-white/90 truncate">{s.fullName}</div>
                    <div className="text-[12px] text-white/45 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>ID: {s.studentId}</span>
                      {s.rollNumber && <span>• Roll: {s.rollNumber}</span>}
                      {className && <span>• {className}</span>}
                    </div>
                  </div>
                  {/* Chevron */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
