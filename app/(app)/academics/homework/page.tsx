import Link from "next/link";
import { Card, Button, Input, Label, Textarea, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";

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

export default async function HomeworkPage() {
  await requirePermission("ACADEMICS", "VIEW");
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canWrite = perms["ACADEMICS"] ? atLeastLevel(perms["ACADEMICS"], "EDIT") : false;

  const homework =
    session.roleKey === "PARENT"
      ? await prisma.homework.findMany({
          where: { schoolId: session.schoolId, student: { parents: { some: { userId: session.userId } } } },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : await prisma.homework.findMany({
          where: { schoolId: session.schoolId },
          include: { student: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

  const students =
    canWrite && session.roleKey !== "PARENT"
      ? await prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } })
      : [];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/academics" className="text-sm text-white/40 hover:text-white/70 transition">Academics</Link>
        <span className="text-white/20">/</span>
        <SectionHeader title="Homework" subtitle={`${homework.length} assignment${homework.length !== 1 ? "s" : ""}`} />
      </div>

      {canWrite && <CreateHomeworkCard students={students} />}

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
                className={`rounded-[20px] border p-5 transition-all duration-200 hover:bg-white/[0.055]
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
                        {h.student.fullName} · Posted {timeAgo(h.createdAt)}
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

async function CreateHomeworkCard({ students }: { students: { id: string; fullName: string }[] }) {
  const { createHomeworkAction } = await import("./actions");
  return (
    <Card title="Post Homework" accent="indigo">
      <form action={createHomeworkAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label required>Student</Label>
          <select
            name="studentId"
            className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12 transition-all"
            required
          >
            <option value="" disabled>Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
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
