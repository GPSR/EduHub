import Link from "next/link";
import { Card, Button, Input, Label, Textarea, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requireAnyPermission } from "@/lib/require-permission";
import { getAcademicYearContext } from "@/lib/academic-year";

function scoreColor(score: number, max: number) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 75) return { bar: "bg-emerald-500", tone: "success" as const };
  if (pct >= 50) return { bar: "bg-amber-500", tone: "warning" as const };
  return { bar: "bg-rose-500", tone: "danger" as const };
}

export default async function ProgressCardPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  await requireAnyPermission(["PROGRESS_CARD", "ACADEMICS"], "VIEW");
  const session = await requireSession();
  const { ay } = await searchParams;
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

  const results =
    session.roleKey === "PARENT"
      ? await db.examResult.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedYear.id,
            student: { parents: { some: { userId: session.userId } } }
          },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        })
      : await db.examResult.findMany({
          where: { schoolId: session.schoolId, academicYearId: selectedYear.id },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await db.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

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

      <Card>
        {results.length === 0 ? (
          <EmptyState icon="🎓" title="No progress card entries yet" description="Add your first progress entry below." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {results.map((r, i) => {
              const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
              const cfg = scoreColor(r.score, r.maxScore);
              return (
                <div
                  key={r.id}
                  className={`px-3.5 sm:px-4 py-3.5 sm:py-4 hover:bg-white/[0.03] transition
                               ${i === 0 ? "rounded-t-[16px]" : ""}
                               ${i === results.length - 1 ? "rounded-b-[16px]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-white/90">{r.examName}</span>
                        <Badge tone="neutral">{r.subject}</Badge>
                      </div>
                      <p className="text-[12px] text-white/45 mt-0.5">
                        {r.student.fullName} · {r.createdAt.toDateString()}
                      </p>
                      {r.remarks && <p className="mt-1.5 text-[13px] text-white/55 italic">{r.remarks}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={cfg.tone}>{pct}%</Badge>
                      <p className="text-[12px] text-white/40 mt-1">{r.score}/{r.maxScore}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bar} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {canWrite ? <CreateProgressCardEntry students={students} academicYearId={selectedYear.id} /> : null}
    </div>
  );
}

async function CreateProgressCardEntry({
  students,
  academicYearId
}: {
  students: { id: string; fullName: string }[];
  academicYearId: string;
}) {
  const { createExamResultAction } = await import("../exams/actions");
  return (
    <Card title="Add Progress Card Entry" accent="teal">
      <form action={createExamResultAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <input type="hidden" name="academicYearId" value={academicYearId} />
        <input type="hidden" name="returnTo" value="/academics/progress-card" />
        <div className="md:col-span-2">
          <Label required>Student</Label>
          <select
            name="studentId"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            required
          >
            <option value="" disabled>Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div>
          <Label required>Exam name</Label>
          <Input name="examName" placeholder="Final Term" required />
        </div>
        <div>
          <Label required>Subject</Label>
          <Input name="subject" placeholder="Science" required />
        </div>
        <div>
          <Label required>Score</Label>
          <Input name="score" type="number" step="0.01" min="0" placeholder="88" required />
        </div>
        <div>
          <Label required>Max score</Label>
          <Input name="maxScore" type="number" step="0.01" defaultValue={100} required />
        </div>
        <div className="md:col-span-2">
          <Label>Remarks</Label>
          <Textarea name="remarks" rows={3} placeholder="Optional remarks for progress card." />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Save progress entry</Button>
        </div>
      </form>
    </Card>
  );
}

