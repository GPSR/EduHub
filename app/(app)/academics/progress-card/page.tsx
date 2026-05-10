import Link from "next/link";
import { Card, Button, Input, Label, Textarea, Badge, SectionHeader, EmptyState, Select } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requireAnyPermission } from "@/lib/require-permission";
import { getAcademicYearContext } from "@/lib/academic-year";
import { getSchoolProgressCardExamTemplates, type ProgressCardExamTemplate } from "@/lib/progress-card-exam-templates";

function scoreColor(score: number, max: number) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 75) return { bar: "bg-emerald-500", tone: "success" as const };
  if (pct >= 50) return { bar: "bg-amber-500", tone: "warning" as const };
  return { bar: "bg-rose-500", tone: "danger" as const };
}

function classLabel(name: string, section: string) {
  return section ? `${name} - ${section}` : name;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function formatScore(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

type ProgressResultRecord = {
  id: string;
  studentId: string;
  examName: string;
  subject: string;
  score: number;
  maxScore: number;
  remarks: string | null;
  createdAt: Date;
  student: {
    fullName: string;
    class: { name: string; section: string } | null;
  };
};

type ProgressPivotRow = {
  key: string;
  studentName: string;
  className: string;
  examName: string;
  subjectScores: Map<string, { score: number; maxScore: number; remarks: string | null }>;
  totalScore: number;
  totalMaxScore: number;
  remarks: string | null;
  latestCreatedAt: number;
};

function buildProgressPivot(results: ProgressResultRecord[], templates: ProgressCardExamTemplate[]) {
  const subjectColumns: Array<{ key: string; label: string }> = [];
  const subjectKeySet = new Set<string>();
  const registerSubject = (subject: string) => {
    const label = subject.trim();
    if (!label) return;
    const key = normalizeKey(label);
    if (subjectKeySet.has(key)) return;
    subjectKeySet.add(key);
    subjectColumns.push({ key, label });
  };

  for (const template of templates) registerSubject(template.subject);
  for (const result of results) registerSubject(result.subject);

  const examOrder = new Map<string, number>();
  const registerExam = (examName: string) => {
    const key = normalizeKey(examName);
    if (!key || examOrder.has(key)) return;
    examOrder.set(key, examOrder.size);
  };
  for (const template of templates) registerExam(template.examName);
  for (const result of results) registerExam(result.examName);

  const latestBySubject = new Map<string, ProgressResultRecord>();
  for (const result of results) {
    const dedupeKey = `${result.studentId}::${normalizeKey(result.examName)}::${normalizeKey(result.subject)}`;
    if (!latestBySubject.has(dedupeKey)) {
      latestBySubject.set(dedupeKey, result);
    }
  }

  const rowMap = new Map<string, ProgressPivotRow>();
  for (const result of latestBySubject.values()) {
    const examKey = normalizeKey(result.examName);
    const rowKey = `${result.studentId}::${examKey}`;
    const className = result.student.class ? classLabel(result.student.class.name, result.student.class.section) : "Unassigned";
    const subjectKey = normalizeKey(result.subject);

    let row = rowMap.get(rowKey);
    if (!row) {
      row = {
        key: rowKey,
        studentName: result.student.fullName,
        className,
        examName: result.examName,
        subjectScores: new Map(),
        totalScore: 0,
        totalMaxScore: 0,
        remarks: null,
        latestCreatedAt: result.createdAt.getTime()
      };
      rowMap.set(rowKey, row);
    }

    row.subjectScores.set(subjectKey, {
      score: result.score,
      maxScore: result.maxScore,
      remarks: result.remarks
    });
    row.totalScore += result.score;
    row.totalMaxScore += result.maxScore;
    row.latestCreatedAt = Math.max(row.latestCreatedAt, result.createdAt.getTime());
    if (!row.remarks && result.remarks) row.remarks = result.remarks;
  }

  const rows = Array.from(rowMap.values()).map((row) => ({
    ...row,
    percentage: row.totalMaxScore > 0 ? Math.round((row.totalScore / row.totalMaxScore) * 100) : 0
  }));

  rows.sort((a, b) => {
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    if (a.studentName !== b.studentName) return a.studentName.localeCompare(b.studentName);
    const examA = examOrder.get(normalizeKey(a.examName)) ?? Number.MAX_SAFE_INTEGER;
    const examB = examOrder.get(normalizeKey(b.examName)) ?? Number.MAX_SAFE_INTEGER;
    if (examA !== examB) return examA - examB;
    if (a.examName !== b.examName) return a.examName.localeCompare(b.examName);
    return b.latestCreatedAt - a.latestCreatedAt;
  });

  return { rows, subjectColumns };
}

export default async function ProgressCardPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string; classId?: string; studentId?: string; templateId?: string }>;
}) {
  await requireAnyPermission(["PROGRESS_CARD", "ACADEMICS"], "VIEW");
  const session = await requireSession();
  const { ay, classId, studentId, templateId } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const isYearWritable = selectedYear.status !== "CLOSED";
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const progressCardLevel = perms["PROGRESS_CARD"] ?? perms["ACADEMICS"];
  const canWrite = isYearWritable && (progressCardLevel ? atLeastLevel(progressCardLevel, "EDIT") : false);

  const [templates, classes] = await Promise.all([
    getSchoolProgressCardExamTemplates(session.schoolId),
    db.class.findMany({
      where: {
        schoolId: session.schoolId,
        ...(session.roleKey === "PARENT" ? { students: { some: { parents: { some: { userId: session.userId } } } } } : {})
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      include: {
        students: {
          where: {
            schoolId: session.schoolId,
            ...(session.roleKey === "PARENT" ? { parents: { some: { userId: session.userId } } } : {})
          },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true }
        }
      }
    })
  ]);

  const classIdSet = new Set(classes.map((cls) => cls.id));
  const templateIdSet = new Set(templates.map((entry) => entry.id));

  const appliedClassId = classId && classIdSet.has(classId) ? classId : undefined;
  const filterStudents = appliedClassId ? classes.find((cls) => cls.id === appliedClassId)?.students ?? [] : [];
  const filterStudentIdSet = new Set(filterStudents.map((student) => student.id));
  const appliedStudentId = appliedClassId && studentId && filterStudentIdSet.has(studentId) ? studentId : undefined;
  const selectedClassId = appliedClassId ?? classes[0]?.id ?? "";
  const selectedTemplateId = templateId && templateIdSet.has(templateId) ? templateId : templates[0]?.id ?? "";

  const activeClass = classes.find((cls) => cls.id === selectedClassId) ?? null;
  const activeTemplate = templates.find((entry) => entry.id === selectedTemplateId) ?? null;

  const results =
    session.roleKey === "PARENT"
      ? await db.examResult.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            student: {
              parents: { some: { userId: session.userId } },
              ...(appliedClassId ? { classId: appliedClassId } : {}),
              ...(appliedStudentId ? { id: appliedStudentId } : {})
            }
          },
          include: {
            student: {
              include: {
                class: { select: { name: true, section: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 300
        })
      : await db.examResult.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            ...((appliedClassId || appliedStudentId)
              ? { student: { ...(appliedClassId ? { classId: appliedClassId } : {}), ...(appliedStudentId ? { id: appliedStudentId } : {}) } }
              : {})
          },
          include: {
            student: {
              include: {
                class: { select: { name: true, section: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 300
        });
  const pivot = buildProgressPivot(results as ProgressResultRecord[], templates);

  return (
    <div className="space-y-5 animate-fade-up">
      {!isYearWritable ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Academic year {selectedYear.name} is closed. Progress card is read-only.
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/academics" className="text-sm text-white/40 hover:text-white/70 transition">Academics</Link>
          <span className="text-white/20">/</span>
          <SectionHeader title="Progress Card" subtitle={`${pivot.rows.length} row${pivot.rows.length !== 1 ? "s" : ""} · ${selectedYear.name}`} />
        </div>
      </div>

      <Card accent="teal">
        <form action="/academics/progress-card" method="get" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="ay" value={selectedYear.id} />
          <div>
            <Label>Filter by class</Label>
            <Select name="classId" defaultValue={appliedClassId ?? ""}>
              <option value="">All classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{classLabel(cls.name, cls.section)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Filter by student</Label>
            <Select name="studentId" defaultValue={appliedStudentId ?? ""} disabled={!appliedClassId}>
              {!appliedClassId ? <option value="">Select class first</option> : <option value="">All students</option>}
              {filterStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.fullName}</option>
              ))}
            </Select>
          </div>
          <div className="md:pb-[1px]">
            <Button type="submit" variant="secondary">Apply filter</Button>
          </div>
        </form>
      </Card>

      <Card>
        {results.length === 0 ? (
          <EmptyState icon="🎓" title="No progress card entries yet" description="Add your first progress entry below." />
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-white/[0.08] bg-black/20">
            <table className="min-w-[980px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Student</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Class</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Exam</th>
                  {pivot.subjectColumns.map((subject) => (
                    <th key={subject.key} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10] whitespace-nowrap">
                      {subject.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Score</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">%</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {pivot.rows.map((row, index) => {
                  const totalColor = scoreColor(row.totalScore, row.totalMaxScore);
                  return (
                    <tr key={row.key} className={index % 2 === 0 ? "bg-white/[0.01]" : ""}>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[13px] text-white/88">{row.studentName}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/65">{row.className}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/80">{row.examName}</td>
                      {pivot.subjectColumns.map((subject) => {
                        const cell = row.subjectScores.get(subject.key);
                        if (!cell) {
                          return (
                            <td key={`${row.key}:${subject.key}`} className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/35 whitespace-nowrap">
                              —
                            </td>
                          );
                        }
                        const cellColor = scoreColor(cell.score, cell.maxScore);
                        return (
                          <td key={`${row.key}:${subject.key}`} className="px-3 py-2 border-b border-white/[0.05] whitespace-nowrap">
                            <Badge tone={cellColor.tone}>{formatScore(cell.score)}/{formatScore(cell.maxScore)}</Badge>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 border-b border-white/[0.05] text-right text-[12px] text-white/80">
                        {formatScore(row.totalScore)}/{formatScore(row.totalMaxScore)}
                      </td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-right">
                        <Badge tone={totalColor.tone}>{row.percentage}%</Badge>
                      </td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/55">{row.remarks || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canWrite ? (
        <ProgressCardGridEntryCard
          classes={classes}
          templates={templates}
          selectedClassId={selectedClassId}
          selectedTemplateId={selectedTemplateId}
          activeClass={activeClass}
          activeTemplate={activeTemplate}
          academicYearId={selectedYear.id}
        />
      ) : null}
    </div>
  );
}

async function ProgressCardGridEntryCard({
  classes,
  templates,
  selectedClassId,
  selectedTemplateId,
  activeClass,
  activeTemplate,
  academicYearId
}: {
  classes: Array<{ id: string; name: string; section: string; students: Array<{ id: string; fullName: string }> }>;
  templates: ProgressCardExamTemplate[];
  selectedClassId: string;
  selectedTemplateId: string;
  activeClass: { id: string; name: string; section: string; students: Array<{ id: string; fullName: string }> } | null;
  activeTemplate: ProgressCardExamTemplate | null;
  academicYearId: string;
}) {
  const { createProgressCardGridAction } = await import("./actions");
  const classStudents = activeClass?.students ?? [];

  return (
    <Card title="Class-wise Progress Entry Grid" description="Pick class and exam template, then enter scores for students." accent="teal">
      <form action="/academics/progress-card" method="get" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input type="hidden" name="ay" value={academicYearId} />
        <div>
          <Label required>Class</Label>
          <Select name="classId" defaultValue={selectedClassId} required>
            <option value="" disabled>Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{classLabel(cls.name, cls.section)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Exam template</Label>
          <Select name="templateId" defaultValue={selectedTemplateId} required>
            <option value="" disabled>Select template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.examName} · {template.subject} · Max {template.maxScore}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:pb-[1px]">
          <Button type="submit" variant="secondary">Load grid</Button>
        </div>
      </form>

      {templates.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-[12px] text-amber-100">
          No exam templates found. Add them in Settings → Progress Card Exam Templates.
        </div>
      ) : null}

      {activeClass && activeTemplate ? (
        <form action={createProgressCardGridAction} className="mt-4 space-y-3">
          <input type="hidden" name="academicYearId" value={academicYearId} />
          <input type="hidden" name="classId" value={activeClass.id} />
          <input type="hidden" name="templateId" value={activeTemplate.id} />
          <input type="hidden" name="returnTo" value="/academics/progress-card" />

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/70">
            <Badge tone="info">{classLabel(activeClass.name, activeClass.section)}</Badge>
            <Badge tone="neutral">{activeTemplate.examName}</Badge>
            <Badge tone="neutral">{activeTemplate.subject}</Badge>
            <Badge tone="warning">Max score {activeTemplate.maxScore}</Badge>
          </div>

          {classStudents.length === 0 ? (
            <p className="text-sm text-white/55">No students found in this class.</p>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-white/[0.08] bg-black/20">
              <table className="min-w-[860px] w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Student</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Exam</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Subject</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Score</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => (
                    <tr key={student.id} className={index % 2 === 0 ? "bg-white/[0.01]" : ""}>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[13px] text-white/88">{student.fullName}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/70">{activeTemplate.examName}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05]"><Badge tone="neutral">{activeTemplate.subject}</Badge></td>
                      <td className="px-3 py-2 border-b border-white/[0.05]">
                        <Input
                          name={`score:${student.id}`}
                          type="number"
                          min={0}
                          max={activeTemplate.maxScore}
                          step="0.01"
                          placeholder={`0 - ${activeTemplate.maxScore}`}
                        />
                      </td>
                      <td className="px-3 py-2 border-b border-white/[0.05]">
                        <Textarea
                          name={`remarks:${student.id}`}
                          rows={1}
                          className="min-h-[42px]"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-white/45">
              Leave score empty to skip that student.
            </p>
            <Button type="submit">Save class progress</Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-white/50">Choose class and exam template to load the progress grid.</p>
      )}
    </Card>
  );
}
