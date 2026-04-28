import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" }
] as const;

function weekdayLabel(value: number) {
  return WEEKDAYS.find((day) => day.value === value)?.label ?? `Day ${value}`;
}

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

export default async function TimetablePage({
  searchParams
}: {
  searchParams: Promise<{ teacherId?: string; classId?: string; day?: string }>;
}) {
  await requirePermission("TIMETABLE", "VIEW");
  const session = await requireSession();
  const { teacherId, classId, day } = await searchParams;

  const dayFilter = Number.parseInt(String(day ?? ""), 10);
  const validDay = Number.isInteger(dayFilter) && dayFilter >= 1 && dayFilter <= 7 ? dayFilter : null;

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const canManage = session.roleKey === "ADMIN" && (perms.TIMETABLE ? atLeastLevel(perms.TIMETABLE, "EDIT") : false);

  const [teachers, classes] = await Promise.all([
    db.user.findMany({
      where: {
        schoolId: session.schoolId,
        isActive: true,
        schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
      },
      select: {
        id: true,
        name: true,
        schoolRole: { select: { name: true } }
      },
      orderBy: { name: "asc" }
    }),
    db.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: "asc" }, { section: "asc" }]
    })
  ]);

  const roleScopedTeacherId =
    session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER" ? session.userId : null;

  const parentClassIds =
    session.roleKey === "PARENT"
      ? (
          await db.student.findMany({
            where: {
              schoolId: session.schoolId,
              parents: { some: { userId: session.userId } }
            },
            select: { classId: true }
          })
        )
          .map((row) => row.classId)
          .filter(Boolean) as string[]
      : null;

  const rows = await db.teacherTimetableEntry.findMany({
    where: {
      schoolId: session.schoolId,
      ...(roleScopedTeacherId ? { teacherUserId: roleScopedTeacherId } : {}),
      ...(teacherId ? { teacherUserId: teacherId } : {}),
      ...(classId ? { classId } : {}),
      ...(validDay ? { weekday: validDay } : {}),
      ...(parentClassIds ? { classId: { in: parentClassIds } } : {})
    },
    include: {
      teacherUser: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, section: true } }
    },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    take: 800
  });

  const rowsByDay = new Map<number, typeof rows>();
  for (const dayDef of WEEKDAYS) rowsByDay.set(dayDef.value, []);
  for (const row of rows) {
    rowsByDay.set(row.weekday, [...(rowsByDay.get(row.weekday) ?? []), row]);
  }

  const shownDays = validDay ? WEEKDAYS.filter((dayDef) => dayDef.value === validDay) : WEEKDAYS;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Teacher Timetable"
        subtitle="Class-wise teacher schedule with subject and timing"
      />

      <Card accent="indigo">
        <form action="/timetable" method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Teacher</Label>
            <select
              name="teacherId"
              defaultValue={teacherId ?? ""}
              className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
              disabled={Boolean(roleScopedTeacherId)}
            >
              <option value="">All teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.schoolRole.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Class</Label>
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
            >
              <option value="">All classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {classLabel(cls.name, cls.section)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Day</Label>
            <select
              name="day"
              defaultValue={validDay ? String(validDay) : ""}
              className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
            >
              <option value="">All days</option>
              {WEEKDAYS.map((dayDef) => (
                <option key={dayDef.value} value={dayDef.value}>
                  {dayDef.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" className="w-full">Apply filters</Button>
            <Link href="/timetable" className="w-full">
              <Button type="button" variant="secondary" className="w-full">Reset</Button>
            </Link>
          </div>
        </form>
      </Card>

      {canManage ? <CreateTimetableEntryCard teachers={teachers} classes={classes} /> : null}

      <Card title="Weekly Schedule" description={`${rows.length} timetable row(s)`} accent="teal">
        {rows.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="No timetable entries yet"
            description="Add teacher schedule entries with time, class, and subject."
          />
        ) : (
          <div className="space-y-4">
            {shownDays.map((dayDef) => {
              const dayRows = rowsByDay.get(dayDef.value) ?? [];

              return (
                <section
                  key={dayDef.value}
                  className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-3.5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-white/90">{weekdayLabel(dayDef.value)}</p>
                    <Badge tone="info">{dayRows.length} slot(s)</Badge>
                  </div>

                  {dayRows.length === 0 ? (
                    <p className="text-[12px] text-white/45">No classes scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayRows.map((row) => (
                        <article
                          key={row.id}
                          className="rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[13px] font-semibold text-white/90">{row.subjectName}</p>
                                <Badge tone="neutral">{row.startTime} - {row.endTime}</Badge>
                                <Badge tone="info">{classLabel(row.class.name, row.class.section)}</Badge>
                              </div>
                              <p className="mt-1 text-[12px] text-white/55">Teacher: {row.teacherUser.name}</p>
                              {row.room ? <p className="text-[11px] text-white/40">Room: {row.room}</p> : null}
                            </div>

                            {canManage ? <DeleteTimetableEntryButton entryId={row.id} /> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

async function CreateTimetableEntryCard({
  teachers,
  classes
}: {
  teachers: Array<{ id: string; name: string; schoolRole: { name: string } }>;
  classes: Array<{ id: string; name: string; section: string }>;
}) {
  const { createTeacherTimetableEntryAction } = await import("./actions");

  return (
    <Card
      title="Add Timetable Entry"
      description="School admin can map teacher schedule by day, time, class, and subject"
      accent="indigo"
    >
      <details className="group rounded-[12px] border border-white/[0.10] bg-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white/55">
          <span>Tap or click to add timetable entry</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] tracking-wide text-white/65">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
          </span>
        </summary>
        <div className="border-t border-white/[0.08] px-3.5 py-3">
          <form action={createTeacherTimetableEntryAction} className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>Teacher</Label>
                <select
                  name="teacherUserId"
                  defaultValue=""
                  className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                  required
                >
                  <option value="" disabled>
                    Select teacher
                  </option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.schoolRole.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label required>Class</Label>
                <select
                  name="classId"
                  defaultValue=""
                  className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                  required
                >
                  <option value="" disabled>
                    Select class
                  </option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {classLabel(cls.name, cls.section)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label required>Subject</Label>
              <Input name="subjectName" placeholder="Mathematics" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label required>Day</Label>
                <select
                  name="weekday"
                  defaultValue="1"
                  className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                >
                  {WEEKDAYS.map((dayDef) => (
                    <option key={dayDef.value} value={dayDef.value}>
                      {dayDef.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>Start time</Label>
                <Input name="startTime" type="time" required />
              </div>
              <div>
                <Label required>End time</Label>
                <Input name="endTime" type="time" required />
              </div>
            </div>

            <div>
              <Label>Room</Label>
              <Input name="room" placeholder="Room 204" />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Add entry</Button>
            </div>
          </form>
        </div>
      </details>
    </Card>
  );
}

async function DeleteTimetableEntryButton({ entryId }: { entryId: string }) {
  const { deleteTeacherTimetableEntryAction } = await import("./actions");

  return (
    <form action={deleteTeacherTimetableEntryAction}>
      <input type="hidden" name="entryId" value={entryId} />
      <Button type="submit" size="sm" variant="danger">Delete</Button>
    </form>
  );
}
