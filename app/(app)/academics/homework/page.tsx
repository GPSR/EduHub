import Link from "next/link";
import { Card, Button, Input, Label, Textarea, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requireAnyPermission } from "@/lib/require-permission";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isDueSoon(dueOn: Date | null): boolean {
  if (!dueOn) return false;
  const diff = dueOn.getTime() - Date.now();
  return diff > 0 && diff < 86400000 * 2; // within 2 days
}

function isOverdue(dueOn: Date | null): boolean {
  if (!dueOn) return false;
  return dueOn.getTime() < Date.now();
}

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function buildHomeworkHref(args: { classId?: string | null }) {
  const params = new URLSearchParams();
  if (args.classId) params.set("classId", args.classId);
  const query = params.toString();
  return query ? `/academics/homework?${query}` : "/academics/homework";
}

export default async function HomeworkPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string; classId?: string }>;
}) {
  await requireAnyPermission(["HOMEWORK", "ACADEMICS"], "VIEW");
  const session = await requireSession();
  const { ay, classId } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const isYearWritable = selectedYear.status !== "CLOSED";
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const homeworkLevel = perms["HOMEWORK"] ?? perms["ACADEMICS"];
  const canWrite = isYearWritable && (homeworkLevel ? atLeastLevel(homeworkLevel, "EDIT") : false);
  const canFilterByClass = session.roleKey !== "PARENT";

  const classes =
    canFilterByClass
      ? await db.class.findMany({
          where: { schoolId: session.schoolId },
          select: { id: true, name: true, section: true },
          orderBy: [{ name: "asc" }, { section: "asc" }]
        })
      : [];
  const selectedClassId = canFilterByClass && classes.some((cls) => cls.id === classId) ? classId ?? null : null;

  const homework =
    session.roleKey === "PARENT"
      ? await db.homework.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            student: {
              parents: { some: { userId: session.userId } },
              ...(selectedClassId ? { classId: selectedClassId } : {})
            }
          },
          include: { student: { include: { class: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : await db.homework.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            ...(selectedClassId ? { student: { classId: selectedClassId } } : {})
          },
          include: { student: { include: { class: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await db.student.findMany({
          where: {
            schoolId: session.schoolId,
            ...(selectedClassId ? { classId: selectedClassId } : {})
          },
          select: {
            id: true,
            fullName: true,
            classId: true,
            class: { select: { name: true, section: true } }
          },
          orderBy: { fullName: "asc" }
        })
      : [];

  return (
    <div className="space-y-5 animate-fade-up">
      {!isYearWritable ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Academic year {selectedYear.name} is closed. Homework is read-only.
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Link href="/academics" className="text-sm text-white/40 hover:text-white/70 transition">Academics</Link>
        <span className="text-white/20">/</span>
        <SectionHeader title="Homework" subtitle={`${homework.length} assignment${homework.length !== 1 ? "s" : ""} · ${selectedYear.name}`} />
      </div>

      {canFilterByClass && classes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link href={withAcademicYearParam(buildHomeworkHref({}), selectedYear.id)}>
            <span
              className={[
                "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                !selectedClassId
                  ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                  : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
              ].join(" ")}
            >
              All classes
            </span>
          </Link>
          {classes.map((cls) => (
            <Link key={cls.id} href={withAcademicYearParam(buildHomeworkHref({ classId: cls.id }), selectedYear.id)}>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  selectedClassId === cls.id
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                {classLabel(cls.name, cls.section)}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {canWrite && <CreateHomeworkCard students={students} classes={classes} selectedClassId={selectedClassId} academicYearId={selectedYear.id} />}

      <div className="space-y-3">
        {homework.length === 0 ? (
          <Card>
            <EmptyState icon="📝" title="No homework posted" description="Post the first assignment below." />
          </Card>
        ) : (
          homework.map((h, i) => {
            const overdue = isOverdue(h.dueOn);
            const dueSoon = isDueSoon(h.dueOn);
            return (
              <div
                key={h.id}
                className={`rounded-[18px] sm:rounded-[20px] border p-4 sm:p-5 transition-all duration-200 hover:bg-white/[0.055]
                             animate-fade-up
                             ${overdue
                               ? "border-rose-500/20 bg-rose-500/[0.04]"
                               : dueSoon
                                 ? "border-amber-500/20 bg-amber-500/[0.04]"
                                 : "border-white/[0.08] bg-white/[0.04]"}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5">📝</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-white/90">{h.title}</span>
                        {overdue && <Badge tone="danger">Overdue</Badge>}
                        {dueSoon && !overdue && <Badge tone="warning">Due soon</Badge>}
                      </div>
                      <p className="text-[12px] text-white/45">
                        {h.student.fullName}
                        {h.student.class ? ` · ${classLabel(h.student.class.name, h.student.class.section)}` : ""}
                        {" · "}Posted {timeAgo(h.createdAt)}
                      </p>
                    </div>
                  </div>
                  {h.dueOn && (
                    <div className="shrink-0 text-right">
                      <p className={`text-[12px] font-medium ${overdue ? "text-rose-300" : dueSoon ? "text-amber-300" : "text-white/45"}`}>
                        Due {h.dueOn.toDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {h.details && (
                  <p className="mt-3 text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap pl-8">{h.details}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

async function CreateHomeworkCard({
  students,
  classes,
  selectedClassId,
  academicYearId
}: {
  students: { id: string; fullName: string; classId: string | null; class: { name: string; section: string } | null }[];
  classes: { id: string; name: string; section: string }[];
  selectedClassId: string | null;
  academicYearId: string;
}) {
  const { createHomeworkAction } = await import("./actions");
  return (
    <Card title="Post Homework" description="Select class. Leave student empty to post same homework for entire class." accent="indigo">
      <form action={createHomeworkAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <input type="hidden" name="academicYearId" value={academicYearId} />
        <div className="md:col-span-2">
          <Label required>Class</Label>
          <select
            name="classId"
            defaultValue={selectedClassId ?? ""}
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            required
          >
            <option value="" disabled>Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {classLabel(cls.name, cls.section)}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Student (optional)</Label>
          <select
            name="studentId"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
          >
            <option value="">Entire selected class</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
                {s.class ? ` · ${classLabel(s.class.name, s.class.section)}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label required>Title</Label>
          <Input name="title" placeholder="Math worksheet – Chapter 3" required />
        </div>
        <div className="md:col-span-2">
          <Label>Instructions</Label>
          <Textarea name="details" rows={3} placeholder="Complete problems 1–20 on page 45…" />
        </div>
        <div>
          <Label>Due date</Label>
          <Input name="dueOn" type="date" />
        </div>
        <div className="flex items-end justify-end">
          <Button type="submit">Post homework</Button>
        </div>
      </form>
    </Card>
  );
}
