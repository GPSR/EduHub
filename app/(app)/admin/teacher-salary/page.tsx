import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { formatMonthKey, monthWindow, overlapDayCount, parseMonthKey, yearWindow } from "@/lib/leave-utils";

function currency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export default async function TeacherSalaryPage({
  searchParams
}: {
  searchParams: Promise<{ cycle?: string; month?: string; year?: string }>;
}) {
  const { session } = await requirePermission("TEACHER_SALARY", "ADMIN");
  if (session.roleKey !== "ADMIN") {
    throw new Error("Only school admin can access teacher salary.");
  }

  const { cycle, month, year } = await searchParams;
  const payCycle: "MONTHLY" | "YEARLY" = cycle === "YEARLY" ? "YEARLY" : "MONTHLY";

  const currentMonth = parseMonthKey(month) ?? parseMonthKey(formatMonthKey(new Date()))!;
  const currentYear = Number.parseInt(String(year ?? ""), 10);
  const selectedYear = Number.isFinite(currentYear) ? currentYear : new Date().getUTCFullYear();

  const period = payCycle === "MONTHLY" ? monthWindow(currentMonth) : yearWindow(selectedYear);

  const [teachers, salaryProfiles] = await Promise.all([
    prisma.user.findMany({
      where: {
        schoolId: session.schoolId,
        isActive: true,
        schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
      },
      select: {
        id: true,
        name: true,
        email: true,
        schoolRole: { select: { name: true } }
      },
      orderBy: [{ name: "asc" }]
    }),
    prisma.teacherSalaryProfile.findMany({
      where: { schoolId: session.schoolId },
      include: {
        teacherUser: { select: { id: true, name: true } }
      },
      orderBy: [{ teacherUser: { name: "asc" } }]
    })
  ]);

  const profileByTeacherId = new Map(salaryProfiles.map((profile) => [profile.teacherUserId, profile]));
  const activeCycleProfiles = salaryProfiles.filter((profile) => profile.isActive && profile.payCycle === payCycle);

  const approvedTeacherLeaves = activeCycleProfiles.length
    ? await prisma.leaveRequest.findMany({
        where: {
          schoolId: session.schoolId,
          requesterType: "TEACHER",
          status: "APPROVED",
          teacherUserId: { in: activeCycleProfiles.map((profile) => profile.teacherUserId) },
          fromDate: { lte: period.end },
          toDate: { gte: period.start }
        },
        select: {
          teacherUserId: true,
          fromDate: true,
          toDate: true
        }
      })
    : [];

  const leaveDaysByTeacher = new Map<string, number>();
  for (const leave of approvedTeacherLeaves) {
    if (!leave.teacherUserId) continue;
    const overlap = overlapDayCount(leave.fromDate, leave.toDate, period.start, period.end);
    if (overlap <= 0) continue;
    leaveDaysByTeacher.set(leave.teacherUserId, (leaveDaysByTeacher.get(leave.teacherUserId) ?? 0) + overlap);
  }

  const periodLabel =
    payCycle === "MONTHLY"
      ? period.start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${selectedYear}`;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Teacher Salary"
        subtitle="Configure monthly/yearly salary with leave-limit based deductions"
      />

      <Card accent="indigo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white/92">Salary cycle overview</p>
            <p className="text-[12px] text-white/50">Current period: {periodLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/teacher-salary?cycle=MONTHLY&month=${encodeURIComponent(formatMonthKey(currentMonth))}`}>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  payCycle === "MONTHLY"
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                Monthly
              </span>
            </Link>
            <Link href={`/admin/teacher-salary?cycle=YEARLY&year=${selectedYear}`}>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  payCycle === "YEARLY"
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                Yearly
              </span>
            </Link>
          </div>
        </div>

        <div className="mt-3">
          {payCycle === "MONTHLY" ? (
            <form action="/admin/teacher-salary" method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="cycle" value="MONTHLY" />
              <div>
                <Label>Month</Label>
                <Input name="month" type="month" defaultValue={formatMonthKey(currentMonth)} />
              </div>
              <Button type="submit" variant="secondary" size="sm">Apply</Button>
            </form>
          ) : (
            <form action="/admin/teacher-salary" method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="cycle" value="YEARLY" />
              <div>
                <Label>Year</Label>
                <Input name="year" type="number" min={2000} max={2100} defaultValue={String(selectedYear)} />
              </div>
              <Button type="submit" variant="secondary" size="sm">Apply</Button>
            </form>
          )}
        </div>
      </Card>

      {teachers.length > 0 ? (
        <ConfigureTeacherSalaryCard
          teachers={teachers.map((teacher) => ({
            id: teacher.id,
            name: teacher.name,
            roleName: teacher.schoolRole.name
          }))}
          defaultPayCycle={payCycle}
        />
      ) : null}

      <Card
        title="Salary Payout Preview"
        description={`Computed using approved teacher leave in ${periodLabel}`}
        accent="teal"
      >
        {teachers.length === 0 ? (
          <EmptyState
            icon="👩‍🏫"
            title="No teachers found"
            description="Create teacher profiles before configuring salary."
          />
        ) : (
          <div className="space-y-2.5">
            {teachers.map((teacher) => {
              const profile = profileByTeacherId.get(teacher.id);

              if (!profile) {
                return (
                  <article
                    key={teacher.id}
                    className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-white/90">{teacher.name}</p>
                        <p className="text-[11px] text-white/45">{teacher.schoolRole.name} · {teacher.email}</p>
                      </div>
                      <Badge tone="warning">Salary not configured</Badge>
                    </div>
                  </article>
                );
              }

              if (profile.payCycle !== payCycle) {
                return (
                  <article
                    key={teacher.id}
                    className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-white/90">{teacher.name}</p>
                        <p className="text-[11px] text-white/45">
                          Configured cycle: {profile.payCycle} · Gross {currency(profile.grossAmountCents)}
                        </p>
                      </div>
                      <Badge tone="neutral">Switch to {profile.payCycle.toLowerCase()} view</Badge>
                    </div>
                  </article>
                );
              }

              const leaveDays = leaveDaysByTeacher.get(teacher.id) ?? 0;
              const excessLeaveDays = Math.max(0, leaveDays - profile.leaveAllowanceDays);
              const deductionCents = excessLeaveDays * profile.deductionPerLeaveDayCents;
              const netPayCents = Math.max(0, profile.grossAmountCents - deductionCents);

              return (
                <article
                  key={teacher.id}
                  className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-white/90">{teacher.name}</p>
                      <p className="text-[11px] text-white/45">{teacher.schoolRole.name} · {teacher.email}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        Leave used: {leaveDays} day(s) · Free limit: {profile.leaveAllowanceDays} · Excess: {excessLeaveDays}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[12px] text-white/45">Gross: {currency(profile.grossAmountCents)}</p>
                      <p className="text-[12px] text-rose-300">Deduction: {currency(deductionCents)}</p>
                      <p className="text-[14px] font-semibold text-emerald-300">Net: {currency(netPayCents)}</p>
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

async function ConfigureTeacherSalaryCard({
  teachers,
  defaultPayCycle
}: {
  teachers: Array<{ id: string; name: string; roleName: string }>;
  defaultPayCycle: "MONTHLY" | "YEARLY";
}) {
  const { upsertTeacherSalaryProfileAction } = await import("./actions");

  return (
    <Card
      title="Configure Salary"
      description="Set teacher salary, leave allowance, and per-day deduction"
      accent="indigo"
    >
      <form action={upsertTeacherSalaryProfileAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <div>
          <Label required>Teacher</Label>
          <select
            name="teacherUserId"
            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
            required
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.roleName})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>Pay cycle</Label>
            <select
              name="payCycle"
              defaultValue={defaultPayCycle}
              className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <Label required>Gross amount (USD)</Label>
            <Input name="grossAmount" type="number" min={0} step="0.01" required />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label required>Leave limit days</Label>
            <Input name="leaveAllowanceDays" type="number" min={0} step={1} defaultValue={2} required />
          </div>
          <div>
            <Label required>Deduction / day (USD)</Label>
            <Input name="deductionPerLeaveDay" type="number" min={0} step="0.01" defaultValue={0} required />
          </div>
          <div>
            <Label>Effective from</Label>
            <Input name="effectiveFrom" type="date" />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={2} placeholder="Optional salary notes" />
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save salary profile</Button>
        </div>
      </form>
    </Card>
  );
}
