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

export default async function ProgressCardPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string; classId?: string; templateId?: string }>;
}) {
  await requireAnyPermission(["PROGRESS_CARD", "ACADEMICS"], "VIEW");
  const session = await requireSession();
  const { ay, classId, templateId } = await searchParams;
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
    canWrite && session.roleKey !== "PARENT"
      ? db.class.findMany({
          where: { schoolId: session.schoolId },
          orderBy: [{ name: "asc" }, { section: "asc" }],
          include: {
            students: {
              where: { schoolId: session.schoolId },
              orderBy: { fullName: "asc" },
              select: { id: true, fullName: true }
            }
          }
        })
      : Promise.resolve([])
  ]);

  const classIdSet = new Set(classes.map((cls) => cls.id));
  const templateIdSet = new Set(templates.map((entry) => entry.id));

  const appliedClassId = classId && classIdSet.has(classId) ? classId : undefined;
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
              ...(appliedClassId ? { classId: appliedClassId } : {})
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
            ...(appliedClassId ? { student: { classId: appliedClassId } } : {})
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
          <SectionHeader title="Progress Card" subtitle={`${results.length} result${results.length !== 1 ? "s" : ""} · ${selectedYear.name}`} />
        </div>
      </div>

      <Card accent="teal">
        <form action="/academics/progress-card" method="get" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
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
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Subject</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Score</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">%</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65 border-b border-white/[0.10]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => {
                  const percentage = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
                  const color = scoreColor(result.score, result.maxScore);
                  return (
                    <tr key={result.id} className={index % 2 === 0 ? "bg-white/[0.01]" : ""}>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[13px] text-white/88">{result.student.fullName}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/65">
                        {result.student.class ? classLabel(result.student.class.name, result.student.class.section) : "Unassigned"}
                      </td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/80">{result.examName}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05]"><Badge tone="neutral">{result.subject}</Badge></td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-right text-[12px] text-white/80">{result.score}/{result.maxScore}</td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-right">
                        <Badge tone={color.tone}>{percentage}%</Badge>
                      </td>
                      <td className="px-3 py-2 border-b border-white/[0.05] text-[12px] text-white/55">{result.remarks || "—"}</td>
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
