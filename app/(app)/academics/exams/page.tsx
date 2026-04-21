import { Card, Button, Input, Label, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

export default async function ExamResultsPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canWrite = perms["ACADEMICS"] ? atLeastLevel(perms["ACADEMICS"], "EDIT") : false;

  const results =
    session.roleKey === "PARENT"
      ? await prisma.examResult.findMany({
          where: {
            schoolId: session.schoolId,
            student: { parents: { some: { userId: session.userId } } }
          },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        })
      : await prisma.examResult.findMany({
          where: { schoolId: session.schoolId },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 200
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

  return (
    <div className="space-y-6">
      <Card title="Exam Results">
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">
                  {r.examName} • {r.subject}
                </div>
                <div className="text-xs text-white/50">{r.createdAt.toDateString()}</div>
              </div>
              <div className="text-xs text-white/60 mt-1">Student: {r.student.fullName}</div>
              <div className="mt-2 text-sm text-white/80">
                Score: {r.score}/{r.maxScore}
              </div>
              {r.remarks ? <div className="mt-2 text-sm text-white/70">{r.remarks}</div> : null}
            </div>
          ))}
          {results.length === 0 ? <div className="text-sm text-white/60">No exam results yet.</div> : null}
        </div>
      </Card>

      {canWrite ? <CreateResultCard students={students} /> : null}
    </div>
  );
}

async function CreateResultCard({ students }: { students: { id: string; fullName: string }[] }) {
  const { createExamResultAction } = await import("./actions");
  return (
    <Card title="Add Exam Result">
      <form action={createExamResultAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="md:col-span-2">
          <Label>Student</Label>
          <select
            name="studentId"
            className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
            required
          >
            <option value="" disabled>
              Select student
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Exam name</Label>
          <Input name="examName" placeholder="Mid Term" required />
        </div>
        <div>
          <Label>Subject</Label>
          <Input name="subject" placeholder="Math" required />
        </div>
        <div>
          <Label>Score</Label>
          <Input name="score" type="number" step="0.01" required />
        </div>
        <div>
          <Label>Max score</Label>
          <Input name="maxScore" type="number" step="0.01" defaultValue={100} required />
        </div>
        <div className="md:col-span-2">
          <Label>Remarks</Label>
          <Textarea name="remarks" rows={3} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Save result</Button>
        </div>
      </form>
    </Card>
  );
}
