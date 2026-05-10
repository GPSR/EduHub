import Link from "next/link";
import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { DashboardGlobalSearch } from "../dashboard-global-search";
import { FolderSlideshow } from "../gallery/folder-slideshow";
import { getLatestGallerySlideshow } from "@/lib/latest-gallery-slideshow";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";
import { parseStudentTransportAssignment } from "@/lib/transport";

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
  searchParams: Promise<{ q?: string; classId?: string; status?: string; routeId?: string; ay?: string }>;
}) {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const { q, classId, status, routeId, ay } = await searchParams;
  const query = (q ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const selectedClassId = (classId ?? "").trim();
  const selectedStatus = (status ?? "").trim().toUpperCase();
  const selectedRouteId = (routeId ?? "").trim();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false;
  const isSchoolAdmin = session.roleKey === "ADMIN";
  const yearContext = await getAcademicYearContext({
    schoolId: session.schoolId,
    requestedYearId: ay
  });
  const selectedYear = yearContext.selectedYear;

  const shouldFilterByStatus =
    isSchoolAdmin && (selectedStatus === "ACTIVE" || selectedStatus === "PROMOTED" || selectedStatus === "INACTIVE");
  const statusDbValue = selectedStatus === "INACTIVE" ? "GRADUATED" : selectedStatus;
  const shouldFilterByClass = isSchoolAdmin && selectedClassId.length > 0;
  const shouldFilterByRoute = isSchoolAdmin && selectedRouteId.length > 0;

  const [students, quickSearchTeachers, latestSlideshow, classes, routes] = await Promise.all([
    session.roleKey === "PARENT"
      ? db.student.findMany({
          where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
          orderBy: { fullName: "asc" },
          include: {
            class: true,
            studentAcademicYears: {
              where: { academicYearId: selectedYear.id },
              select: { status: true },
              take: 1
            }
          },
        })
      : db.student.findMany({
          where: {
            schoolId: session.schoolId,
            ...(shouldFilterByClass ? { classId: selectedClassId } : {}),
            ...(shouldFilterByRoute
              ? { transportDetails: { contains: `"routeId":"${selectedRouteId}"` } }
              : {}),
            ...(shouldFilterByStatus
              ? {
                  studentAcademicYears: {
                    some: { academicYearId: selectedYear.id, status: statusDbValue as "ACTIVE" | "PROMOTED" | "GRADUATED" }
                  }
                }
              : {})
          },
          orderBy: { createdAt: "desc" },
          take: 220,
          include: {
            class: true,
            studentAcademicYears: {
              where: { academicYearId: selectedYear.id },
              select: { status: true },
              take: 1
            }
          },
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
    }),
    isSchoolAdmin
      ? db.class.findMany({
          where: { schoolId: session.schoolId },
          orderBy: [{ name: "asc" }, { section: "asc" }],
          select: { id: true, name: true, section: true }
        })
      : Promise.resolve([]),
    isSchoolAdmin
      ? db.busRoute.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, bus: { select: { name: true } } }
        })
      : Promise.resolve([])
  ]);

  const filteredStudents = query
    ? students.filter((student) =>
        `${student.fullName} ${student.studentId} ${student.admissionNo ?? ""} ${student.rollNumber ?? ""} ${student.class ? `${student.class.name} ${student.class.section ?? ""}` : ""}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : students;
  const routeNameById = new Map(routes.map((route) => [route.id, route.name]));
  const hasActiveFilters = Boolean(selectedClassId || selectedStatus || selectedRouteId);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          title="Students"
          subtitle={
            query
              ? `${filteredStudents.length} result${filteredStudents.length !== 1 ? "s" : ""} for "${query}"`
              : `${students.length} student${students.length !== 1 ? "s" : ""} enrolled · ${selectedYear.name}`
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

      {isSchoolAdmin ? (
        <Card>
          <form method="get" className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="ay" value={selectedYear.id} />
            <div>
              <label className="mb-1 block text-[12px] text-white/60">Class</label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
              >
                <option value="">All classes</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}{row.section ? ` - ${row.section}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-white/60">Student status</label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
              >
                <option value="">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="PROMOTED">Promoted</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-white/60">Bus route location</label>
              <select
                name="routeId"
                defaultValue={selectedRouteId}
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
              >
                <option value="">All routes</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}{route.bus?.name ? ` (${route.bus.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Apply</Button>
            <Link href={withAcademicYearParam("/students", selectedYear.id)}>
              <Button type="button" variant="ghost" size="sm" className={!hasActiveFilters ? "opacity-60" : ""}>
                Reset
              </Button>
            </Link>
          </form>
        </Card>
      ) : null}

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
              const statusRaw = s.studentAcademicYears[0]?.status ?? "ACTIVE";
              const statusLabel = statusRaw === "GRADUATED" ? "Inactive" : statusRaw === "PROMOTED" ? "Promoted" : "Active";
              const routeAssignment = parseStudentTransportAssignment(s.transportDetails);
              const routeLabel = routeAssignment?.routeId ? routeNameById.get(routeAssignment.routeId) ?? null : null;
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
                      {isSchoolAdmin ? <span>• {statusLabel}</span> : null}
                      {isSchoolAdmin && routeLabel ? <span>• Route: {routeLabel}</span> : null}
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
