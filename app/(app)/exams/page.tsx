import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";
import { ExamQuestionFilePreview } from "@/components/exam-question-file-preview";

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function statusTone(status: "UPCOMING" | "OPEN" | "CLOSED") {
  return status === "OPEN" ? "success" : status === "UPCOMING" ? "info" : "danger";
}

function examWindowStatus(now: Date, startsAt: Date, endsAt: Date): "UPCOMING" | "OPEN" | "CLOSED" {
  if (now < startsAt) return "UPCOMING";
  if (now > endsAt) return "CLOSED";
  return "OPEN";
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildExamsHref(args: { classId?: string | null; compose?: boolean; ay: string }) {
  const params = new URLSearchParams();
  params.set("ay", args.ay);
  if (args.classId) params.set("classId", args.classId);
  if (args.compose) params.set("compose", "1");
  return `/exams?${params.toString()}`;
}

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

type ParentExamStudent = {
  id: string;
  fullName: string;
  studentId: string;
  classId: string | null;
  classLabel: string;
};

export default async function ExamsPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; compose?: string; ay?: string; file?: string; examId?: string }>;
}) {
  await requirePermission("EXAMS", "VIEW");
  const session = await requireSession();
  const { classId: filterClassId, compose, ay, file, examId } = await searchParams;
  const composeOpen = compose === "1";

  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const isYearWritable = selectedYear.status !== "CLOSED";

  const [perms, classes] = await Promise.all([
    getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId }),
    db.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: "asc" }, { section: "asc" }]
    })
  ]);

  const examsLevel = perms.EXAMS;
  const canManage = isYearWritable && (examsLevel ? atLeastLevel(examsLevel, "EDIT") : false);

  const classLabelById = new Map(classes.map((item) => [item.id, classLabel(item.name, item.section)]));
  const hasClassFilter = Boolean(filterClassId && classLabelById.has(filterClassId));

  const teacherScoped = session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER";
  const parentScoped = session.roleKey === "PARENT";

  let teacherClassIds: string[] = [];
  if (teacherScoped) {
    const rows = await db.teacherClassAssignment.findMany({
      where: { schoolId: session.schoolId, userId: session.userId },
      select: { classId: true }
    });
    teacherClassIds = [...new Set(rows.map((row) => row.classId))];
  }

  let parentStudents: ParentExamStudent[] = [];
  if (parentScoped) {
    const rows = await db.student.findMany({
      where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        classId: true,
        class: { select: { name: true, section: true } }
      },
      orderBy: { fullName: "asc" }
    });
    parentStudents = rows.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      studentId: student.studentId,
      classId: student.classId,
      classLabel: student.class ? classLabel(student.class.name, student.class.section) : "No class"
    }));
  }

  const parentClassIds = [...new Set(parentStudents.map((student) => student.classId).filter(Boolean) as string[])];

  const visibilityWhere = (() => {
    if (parentScoped) {
      if (parentClassIds.length === 0) return { classId: null as string | null };
      if (hasClassFilter && filterClassId) return { OR: [{ classId: null }, { classId: filterClassId }] };
      return { OR: [{ classId: null }, { classId: { in: parentClassIds } }] };
    }

    if (teacherScoped) {
      if (teacherClassIds.length === 0) return { classId: null as string | null };
      if (hasClassFilter && filterClassId) {
        return teacherClassIds.includes(filterClassId)
          ? { OR: [{ classId: null }, { classId: filterClassId }] }
          : { classId: null as string | null };
      }
      return { OR: [{ classId: null }, { classId: { in: teacherClassIds } }] };
    }

    if (hasClassFilter && filterClassId) return { OR: [{ classId: null }, { classId: filterClassId }] };
    return {};
  })();

  const exams = await db.schoolExam.findMany({
    where: {
      schoolId: session.schoolId,
      academicYearId: selectedYear.id,
      ...(parentScoped ? { isPublished: true } : {}),
      ...visibilityWhere
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
      createdByUser: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
      attempts: parentScoped
        ? {
            where: { studentId: { in: parentStudents.map((student) => student.id) } },
            select: { id: true, studentId: true, status: true, score: true, maxScore: true, submittedAt: true }
          }
        : false
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 200
  });
  const { startExamAttemptAction } = await import("./actions");

  const now = new Date();

  return (
    <div className="space-y-5 animate-fade-up">
      {!isYearWritable ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Academic year {selectedYear.name} is closed. Exam creation and edits are locked.
        </div>
      ) : null}

      {file === "updated" ? (
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100">
          Question file updated successfully.
        </div>
      ) : null}

      {file === "no_file" ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
          Please choose a file before updating question file.
        </div>
      ) : null}

      {file === "upload_failed" ? (
        <div className="rounded-[14px] border border-rose-500/30 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
          Upload failed. Please check file type/size and try again.
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Exams"
          subtitle="Schedule exams, upload question files, and allow students to start on exam date"
        />
        {canManage ? (
          <Link
            href={buildExamsHref({ classId: hasClassFilter && filterClassId ? filterClassId : null, compose: !composeOpen, ay: selectedYear.id })}
            aria-label={composeOpen ? "Close exam form" : "Create exam"}
            className="sm-btn min-h-0 mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[26px] leading-none text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105 active:scale-[0.98]"
            title={composeOpen ? "Close" : "Create exam"}
          >
            {composeOpen ? "×" : "+"}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildExamsHref({ ay: selectedYear.id, compose: composeOpen })}>
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
              !hasClassFilter
                ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
            ].join(" ")}
          >
            🧪 All classes
          </span>
        </Link>
        {classes.map((cls) => {
          const label = classLabel(cls.name, cls.section);
          const active = filterClassId === cls.id;
          return (
            <Link key={cls.id} href={buildExamsHref({ classId: cls.id, compose: composeOpen, ay: selectedYear.id })}>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  active
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {canManage && composeOpen ? (
        <CreateExamCard
          classes={teacherScoped ? classes.filter((cls) => teacherClassIds.includes(cls.id)) : classes}
          teacherScoped={teacherScoped}
          selectedClassId={hasClassFilter ? filterClassId : undefined}
          academicYearId={selectedYear.id}
        />
      ) : null}

      <Card title="Exam Schedules" description={`${exams.length} exam(s) · ${selectedYear.name}`} accent="teal">
        {parentScoped && parentStudents.length === 0 ? (
          <EmptyState
            icon="🧪"
            title="No linked students"
            description="No student account is linked to your profile for taking exams."
          />
        ) : exams.length === 0 ? (
          <EmptyState
            icon="🧪"
            title="No exams scheduled"
            description="Create and publish the first exam schedule for students."
          />
        ) : parentScoped ? (
          <div className="space-y-3">
            {exams.map((exam) => {
              const status = examWindowStatus(now, exam.startsAt, exam.endsAt);
              const eligibleStudents = parentStudents.filter((student) => !exam.classId || student.classId === exam.classId);
              if (eligibleStudents.length === 0) return null;

              return (
                <article key={exam.id} className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-white/92">{exam.title}</p>
                        <Badge tone={statusTone(status)}>{status}</Badge>
                        <Badge tone="neutral">{exam.class ? classLabel(exam.class.name, exam.class.section) : "All classes"}</Badge>
                      </div>
                      <p className="mt-1 text-[12px] text-white/55">
                        Starts {formatDateTime(exam.startsAt)} · Ends {formatDateTime(exam.endsAt)} · {exam.durationMinutes} mins
                      </p>
                      {exam.instructions ? (
                        <p className="mt-2 whitespace-pre-wrap text-[12px] text-white/65">{exam.instructions}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-[12px] text-white/50">
                      <p>{exam._count.questions} MCQ</p>
                      {exam.questionPaperUrl ? (
                        <div className="mt-1 inline-flex">
                          <ExamQuestionFilePreview
                            fileUrl={exam.questionPaperUrl}
                            title={`${exam.title} · Question File`}
                            buttonText="Open Question File"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {eligibleStudents.map((student) => {
                      const attempt = Array.isArray(exam.attempts)
                        ? exam.attempts.find((entry) => entry.studentId === student.id)
                        : undefined;

                      return (
                        <div key={`${exam.id}-${student.id}`} className="rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5">
                          <p className="text-[13px] font-semibold text-white/88">{student.fullName}</p>
                          <p className="text-[11px] text-white/45">{student.studentId} · {student.classLabel}</p>

                          {attempt?.status === "SUBMITTED" ? (
                            <p className="mt-2 text-[12px] text-emerald-300">
                              Submitted · Score {attempt.score ?? 0}/{attempt.maxScore ?? 0}
                            </p>
                          ) : status === "OPEN" ? (
                            <form action={startExamAttemptAction} className="mt-2">
                              <input type="hidden" name="examId" value={exam.id} />
                              <input type="hidden" name="studentId" value={student.id} />
                              <Button type="submit" size="sm">{attempt ? "Resume Exam" : "Start Exam"}</Button>
                            </form>
                          ) : status === "UPCOMING" ? (
                            <p className="mt-2 text-[12px] text-blue-200/85">Exam opens on schedule date.</p>
                          ) : (
                            <p className="mt-2 text-[12px] text-rose-200/80">Exam window closed.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const status = examWindowStatus(now, exam.startsAt, exam.endsAt);
              const assignedClassId = exam.class?.id ?? null;
              const canUpdateThisExam =
                canManage &&
                (!teacherScoped || (assignedClassId ? teacherClassIds.includes(assignedClassId) : false));
              return (
                <article key={exam.id} className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-white/92">{exam.title}</p>
                        <Badge tone={statusTone(status)}>{status}</Badge>
                        <Badge tone="neutral">{exam.class ? classLabel(exam.class.name, exam.class.section) : "All classes"}</Badge>
                        {exam.isPublished ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}
                      </div>
                      <p className="mt-1 text-[12px] text-white/55">
                        Starts {formatDateTime(exam.startsAt)} · Ends {formatDateTime(exam.endsAt)} · Duration {exam.durationMinutes} mins
                      </p>
                      {exam.instructions ? <p className="mt-2 whitespace-pre-wrap text-[12px] text-white/65">{exam.instructions}</p> : null}
                      <p className="mt-2 text-[11px] text-white/42">Created by {exam.createdByUser.name}</p>
                    </div>
                    <div className="text-right text-[12px] text-white/52">
                      <p>{exam._count.questions} MCQ questions</p>
                      <p>{exam._count.attempts} student attempt(s)</p>
                      {exam.questionPaperUrl ? (
                        <div className="mt-1 inline-flex">
                          <ExamQuestionFilePreview
                            fileUrl={exam.questionPaperUrl}
                            title={`${exam.title} · Question File`}
                            buttonText="Open Question File"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {canUpdateThisExam ? (
                    <div
                      id={examId === exam.id ? `exam-${exam.id}` : undefined}
                      className="mt-3 rounded-[12px] border border-white/[0.08] bg-black/20 p-3"
                    >
                      <p className="text-[12px] font-semibold text-white/85">Update question file</p>
                      <UpdateQuestionFileForm examId={exam.id} academicYearId={selectedYear.id} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

async function CreateExamCard({
  classes,
  teacherScoped,
  selectedClassId,
  academicYearId
}: {
  classes: Array<{ id: string; name: string; section: string }>;
  teacherScoped: boolean;
  selectedClassId?: string;
  academicYearId: string;
}) {
  const { createSchoolExamAction } = await import("./actions");

  if (teacherScoped && classes.length === 0) {
    return (
      <Card title="Create Exam" description="Upload question file, set schedule, and add MCQ options" accent="indigo">
        <p className="text-sm text-white/55">
          You do not have class assignments yet. Ask admin to assign at least one class before creating exams.
        </p>
      </Card>
    );
  }

  const startDefault = new Date();
  const endDefault = new Date(startDefault.getTime() + 60 * 60 * 1000);

  return (
    <Card title="Create Exam" description="Upload question file, set exam date, and add multiple-choice options" accent="indigo">
      <form action={createSchoolExamAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <input type="hidden" name="academicYearId" value={academicYearId} />

        <div>
          <Label required={teacherScoped}>Class</Label>
          <select
            name="classId"
            defaultValue={selectedClassId && classes.some((cls) => cls.id === selectedClassId) ? selectedClassId : ""}
            required={teacherScoped}
            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
          >
            {!teacherScoped ? <option value="">All classes</option> : null}
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {classLabel(cls.name, cls.section)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label required>Exam title</Label>
          <Input name="title" placeholder="Quarterly Exam - Mathematics" required />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label required>Start date & time</Label>
            <Input name="startsAt" type="datetime-local" defaultValue={toDatetimeLocalValue(startDefault)} required />
          </div>
          <div>
            <Label required>End date & time</Label>
            <Input name="endsAt" type="datetime-local" defaultValue={toDatetimeLocalValue(endDefault)} required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label required>Duration (minutes)</Label>
            <Input name="durationMinutes" type="number" min={5} max={300} defaultValue={60} required />
          </div>
          <div>
            <Label>Question paper file</Label>
            <Input name="questionPaper" type="file" />
            <p className="mt-1 text-[11px] text-white/38">
              Supports PDF, DOC/DOCX, TXT, CSV, images, and more.
            </p>
          </div>
        </div>

        <div>
          <Label>Instructions</Label>
          <Textarea name="instructions" rows={3} placeholder="Read all questions carefully. Each question has one correct option." />
        </div>

        <div>
          <Label>Multiple-choice questions (optional but recommended)</Label>
          <Textarea
            name="questionsText"
            rows={11}
            placeholder={
`Question 1 | Option A | Option B | Option C | Option D | A | 1

Question: What is 12 + 5?
A) 15
B) 16
C) 17
D) 18
Answer: C
Marks: 2`
            }
          />
          <p className="mt-1 text-[11px] whitespace-pre-line text-white/38">
            Use either readable block format or pipe format.
            Add at least one MCQ or upload a question file.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Publish exam</Button>
        </div>
      </form>
    </Card>
  );
}

async function UpdateQuestionFileForm({
  examId,
  academicYearId
}: {
  examId: string;
  academicYearId: string;
}) {
  const { updateExamQuestionPaperAction } = await import("./actions");

  return (
    <form action={updateExamQuestionPaperAction} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="academicYearId" value={academicYearId} />
      <Input name="questionPaper" type="file" />
      <Button type="submit" size="sm" variant="secondary">Update file</Button>
    </form>
  );
}
