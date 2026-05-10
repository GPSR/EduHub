import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun"
};

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function buildTeachersHref(args: { ay: string; classId?: string | null }) {
  const params = new URLSearchParams();
  params.set("ay", args.ay);
  if (args.classId) params.set("classId", args.classId);
  return `/teachers?${params.toString()}`;
}

export default async function TeachersPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string; classId?: string }>;
}) {
  const { session } = await requirePermission("TEACHERS", "VIEW");
  if (session.roleKey !== "ADMIN") redirect("/home");

  const { ay, classId } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;

  const classes = await db.class.findMany({
    where: { schoolId: session.schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: "asc" }, { section: "asc" }]
  });
  const validClassId = classId && classes.some((item) => item.id === classId) ? classId : null;

  const teachers = await db.user.findMany({
    where: {
      schoolId: session.schoolId,
      schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } },
      ...(validClassId
        ? {
            OR: [
              { classAssignments: { some: { classId: validClassId } } },
              { teacherTimetableEntries: { some: { academicYearId: selectedYear.id, classId: validClassId } } }
            ]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    include: {
      schoolRole: { select: { name: true, key: true } },
      classAssignments: {
        include: {
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: [{ class: { name: "asc" } }, { class: { section: "asc" } }]
      },
      teacherTimetableEntries: {
        where: { academicYearId: selectedYear.id, ...(validClassId ? { classId: validClassId } : {}) },
        include: { class: { select: { id: true, name: true, section: true } } },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
      }
    },
    take: 300
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Teachers"
        subtitle={`${teachers.length} teacher${teachers.length !== 1 ? "s" : ""} · ${selectedYear.name}`}
      />

      <div className="flex flex-wrap gap-2">
        <Link href={buildTeachersHref({ ay: selectedYear.id })}>
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
              !validClassId
                ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
            ].join(" ")}
          >
            👩‍🏫 All classes
          </span>
        </Link>
        {classes.map((item) => {
          const active = validClassId === item.id;
          return (
            <Link key={item.id} href={buildTeachersHref({ ay: selectedYear.id, classId: item.id })}>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  active
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                {classLabel(item.name, item.section)}
              </span>
            </Link>
          );
        })}
      </div>

      <Card title="Teacher Grid" description="All teacher details, assigned grades/classes, and weekly subject schedule" accent="indigo">
        {teachers.length === 0 ? (
          <EmptyState
            icon="👩‍🏫"
            title="No teachers found"
            description="Create teachers from Users page and add schedule with subject, grade, and timing."
          />
        ) : (
          <div className="space-y-3">
            {teachers.map((teacher) => {
              const classNames = teacher.classAssignments.map((item) => classLabel(item.class.name, item.class.section));
              const subjectSet = new Set(teacher.teacherTimetableEntries.map((entry) => entry.subjectName));
              const subjects = Array.from(subjectSet).sort((a, b) => a.localeCompare(b));

              return (
                <article key={teacher.id} className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-white/92">{teacher.name}</p>
                        <Badge tone={teacher.isActive ? "success" : "danger"}>{teacher.isActive ? "Active" : "Inactive"}</Badge>
                        <Badge tone="neutral">{teacher.schoolRole.name}</Badge>
                      </div>
                      <p className="mt-1 text-[12px] text-white/50">{teacher.email}{teacher.phoneNumber ? ` · ${teacher.phoneNumber}` : ""}</p>
                    </div>
                    <div className="text-right text-[12px] text-white/55">
                      <p>{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
                      <p>{teacher.teacherTimetableEntries.length} weekly slot{teacher.teacherTimetableEntries.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-[12px] border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Assigned Grades / Classes</p>
                      <p className="mt-2 text-[13px] text-white/80">
                        {classNames.length > 0 ? classNames.join(", ") : "No class assignment yet"}
                      </p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">Subjects</p>
                      <p className="mt-2 text-[13px] text-white/80">
                        {subjects.length > 0 ? subjects.join(", ") : "No subject schedule yet"}
                      </p>
                    </div>

                    <div className="rounded-[12px] border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Weekly Schedule</p>
                      {teacher.teacherTimetableEntries.length === 0 ? (
                        <p className="mt-2 text-[12px] text-white/50">No schedule rows yet.</p>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {teacher.teacherTimetableEntries.map((entry) => (
                            <p key={entry.id} className="text-[12px] text-white/78 break-words">
                              <span className="text-white/92">{WEEKDAY_LABEL[entry.weekday] ?? `Day ${entry.weekday}`}</span>{" "}
                              · {entry.startTime}-{entry.endTime} · {entry.subjectName} · {classLabel(entry.class.name, entry.class.section)}
                              {entry.room ? ` · ${entry.room}` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
