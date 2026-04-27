import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { DashboardGlobalSearch } from "../dashboard-global-search";
import { FolderSlideshow } from "../gallery/folder-slideshow";
import { getLatestGallerySlideshow } from "@/lib/latest-gallery-slideshow";

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

export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;

  const [students, quickSearchTeachers, latestSlideshow] = await Promise.all([
    session.roleKey === "PARENT"
      ? db.student.findMany({
          where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
          orderBy: { fullName: "asc" },
          include: { class: true },
        })
      : db.student.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { createdAt: "desc" },
          take: 220,
          include: { class: true },
        }),
    session.roleKey === "ADMIN"
      ? db.user.findMany({
          where: {
            schoolId: session.schoolId,
            schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
          },
          select: {
            id: true,
            name: true,
            email: true,
            schoolRole: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 180
        })
      : Promise.resolve([]),
    getLatestGallerySlideshow({
      schoolId: session.schoolId,
      roleKey: session.roleKey,
      roleId: session.roleId,
      take: 20
    })
  ]);

  const filteredStudents = query
    ? students.filter((student) =>
        `${student.fullName} ${student.studentId} ${student.admissionNo ?? ""} ${student.rollNumber ?? ""} ${student.class ? `${student.class.name} ${student.class.section ?? ""}` : ""}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : students;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          title="Students"
          subtitle={
            query
              ? `${filteredStudents.length} result${filteredStudents.length !== 1 ? "s" : ""} for "${query}"`
              : `${students.length} student${students.length !== 1 ? "s" : ""} enrolled`
          }
        />
        {canWrite && (
          <Link href="/students/new">
            <Button size="sm">+ Add student</Button>
          </Link>
        )}
      </div>

      <Card className="relative z-[110] overflow-visible hidden md:block">
        <DashboardGlobalSearch
          initialQuery={query}
          searchPath="/students"
          students={students.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            studentId: s.studentId,
            admissionNo: s.admissionNo ?? null,
            rollNumber: s.rollNumber ?? null,
            classLabel: s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : null
          }))}
          teachers={quickSearchTeachers.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            roleName: t.schoolRole.name
          }))}
        />
      </Card>

      {latestSlideshow ? (
        <Card
          className="hidden md:block"
          title={`Gallery Slideshow · ${latestSlideshow.folderName}`}
          description="Latest school photos visible for your role"
          accent="teal"
        >
          <FolderSlideshow
            folderId={latestSlideshow.folderId}
            folderName={latestSlideshow.folderName}
            items={latestSlideshow.items}
          />
        </Card>
      ) : null}

      <Card>
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon="👥"
            title={query ? "No matching students" : "No students yet"}
            description={
              query ? `No students matched "${query}".` : "Add your first student to get started."
            }
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredStudents.map((s, i) => {
              const initials = s.fullName.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
              const className = s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : null;
              return (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className={`flex items-center gap-3 px-3.5 sm:px-4 py-3.5 hover:bg-white/[0.04] transition-colors
                              ${i === 0 ? "rounded-t-[14px]" : ""}
                              ${i === filteredStudents.length - 1 ? "rounded-b-[14px]" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-[11px]
                                   bg-gradient-to-b ${avatarColor(s.fullName)} text-xs font-bold text-white shadow-sm`}>
                    {initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-white/90 truncate max-w-[160px] sm:max-w-none">{s.fullName}</div>
                    <div className="text-[11px] sm:text-[12px] text-white/45 flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
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
