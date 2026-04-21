import { Card, Button, Input, Label, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

export default async function HomeworkPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canWrite = perms["ACADEMICS"] ? atLeastLevel(perms["ACADEMICS"], "EDIT") : false;

  const homework =
    session.roleKey === "PARENT"
      ? await prisma.homework.findMany({
          where: {
            schoolId: session.schoolId,
            student: { parents: { some: { userId: session.userId } } }
          },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 100
        })
      : await prisma.homework.findMany({
          where: { schoolId: session.schoolId },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 100
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

  return (
    <div className="space-y-6">
      <Card title="Homework">
        <div className="space-y-3">
          {homework.map((h) => (
            <div key={h.id} className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">{h.title}</div>
                <div className="text-xs text-white/50">{h.createdAt.toDateString()}</div>
              </div>
              <div className="text-xs text-white/60 mt-1">Student: {h.student.fullName}</div>
              {h.details ? <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{h.details}</div> : null}
              {h.dueOn ? <div className="mt-2 text-xs text-white/60">Due: {h.dueOn.toDateString()}</div> : null}
            </div>
          ))}
          {homework.length === 0 ? <div className="text-sm text-white/60">No homework posted.</div> : null}
        </div>
      </Card>

      {canWrite ? <CreateHomeworkCard students={students} /> : null}
    </div>
  );
}

async function CreateHomeworkCard({ students }: { students: { id: string; fullName: string }[] }) {
  const { createHomeworkAction } = await import("./actions");
  return (
    <Card title="Post Homework">
      <form action={createHomeworkAction} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
        <div className="md:col-span-2">
          <Label>Title</Label>
          <Input name="title" placeholder="Math worksheet - Chapter 3" required />
        </div>
        <div className="md:col-span-2">
          <Label>Details</Label>
          <Textarea name="details" rows={4} placeholder="Instructions..." />
        </div>
        <div>
          <Label>Due date</Label>
          <Input name="dueOn" type="date" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Post</Button>
        </div>
      </form>
    </Card>
  );
}
