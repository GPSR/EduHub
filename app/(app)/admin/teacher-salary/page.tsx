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

function toInputAmount(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function TeacherSalaryPage({
  searchParams
}: {
  searchParams: Promise<{
    cycle?: string;
    month?: string;
    year?: string;
    teacherId?: string;
    salary?: string;
    payout?: string;
  }>;
}) {
  const { session } = await requirePermission("TEACHER_SALARY", "ADMIN");
  if (session.roleKey !== "ADMIN") {
    throw new Error("Only school admin can access teacher salary.");
  }

  const { cycle, month, year, teacherId, salary, payout } = await searchParams;
  const payCycle: "MONTHLY" | "YEARLY" = cycle === "YEARLY" ? "YEARLY" : "MONTHLY";

  const currentMonth = parseMonthKey(month) ?? parseMonthKey(formatMonthKey(new Date()))!;
  const currentYear = Number.parseInt(String(year ?? ""), 10);
  const selectedYear = Number.isFinite(currentYear) ? currentYear : new Date().getUTCFullYear();
  const period = payCycle === "MONTHLY" ? monthWindow(currentMonth) : yearWindow(selectedYear);
  const periodKey = payCycle === "MONTHLY" ? formatMonthKey(currentMonth) : String(selectedYear);

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

  const selectedTeacherId = teachers.some((teacher) => teacher.id === teacherId) ? teacherId ?? "" : "";
  const visibleTeacherIds = selectedTeacherId ? [selectedTeacherId] : teachers.map((teacher) => teacher.id);

  const activeCycleProfiles = salaryProfiles.filter(
    (profile) => profile.isActive && profile.payCycle === payCycle && visibleTeacherIds.includes(profile.teacherUserId)
  );

  const [approvedTeacherLeaves, payouts] = await Promise.all([
    activeCycleProfiles.length
      ? prisma.leaveRequest.findMany({
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
      : Promise.resolve([]),
    prisma.teacherSalaryPayout.findMany({
      where: {
        schoolId: session.schoolId,
        payCycle,
        periodKey,
        ...(selectedTeacherId ? { teacherUserId: selectedTeacherId } : {})
      },
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        teacherUserId: true,
        paidAmountCents: true,
        paidOn: true,
        paymentMode: true,
        reference: true,
        notes: true
      }
    })
  ]);

  const profileByTeacherId = new Map(salaryProfiles.map((profile) => [profile.teacherUserId, profile]));
  const leaveDaysByTeacher = new Map<string, number>();
  for (const leave of approvedTeacherLeaves) {
    if (!leave.teacherUserId) continue;
    const overlap = overlapDayCount(leave.fromDate, leave.toDate, period.start, period.end);
    if (overlap <= 0) continue;
    leaveDaysByTeacher.set(leave.teacherUserId, (leaveDaysByTeacher.get(leave.teacherUserId) ?? 0) + overlap);
  }

  const payoutsByTeacher = new Map<string, typeof payouts>();
  const paidAmountByTeacher = new Map<string, number>();
  for (const row of payouts) {
    const existing = payoutsByTeacher.get(row.teacherUserId) ?? [];
    existing.push(row);
    payoutsByTeacher.set(row.teacherUserId, existing);
    paidAmountByTeacher.set(row.teacherUserId, (paidAmountByTeacher.get(row.teacherUserId) ?? 0) + row.paidAmountCents);
  }

  const periodLabel =
    payCycle === "MONTHLY"
      ? period.start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${selectedYear}`;

  const visibleTeachers = selectedTeacherId
    ? teachers.filter((teacher) => teacher.id === selectedTeacherId)
    : teachers;
  const { recordTeacherSalaryPayoutAction } = await import("./actions");

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Teacher Salary"
        subtitle="Configure salary and record payouts with leave-limit based deductions"
      />

      {salary === "configured" ? (
        <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/12 px-3.5 py-2.5 text-[12px] text-emerald-100">
          Salary configuration saved successfully.
        </div>
      ) : null}

      {payout === "saved" ? (
        <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/12 px-3.5 py-2.5 text-[12px] text-emerald-100">
          Salary payout recorded successfully.
        </div>
      ) : null}

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
        <ConfigureTeacherSalaryCard defaultPayCycle={payCycle} teachers={teachers.map((teacher) => ({
          id: teacher.id,
          name: teacher.name,
          roleName: teacher.schoolRole.name
        }))} />
      ) : null}

      <Card
        title="Salary Payout Preview"
        description={`Choose teacher, review period payout, then update salary amount paid for ${periodLabel}`}
        accent="teal"
      >
        {teachers.length > 0 ? (
          <form action="/admin/teacher-salary" method="get" className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input type="hidden" name="cycle" value={payCycle} />
            {payCycle === "MONTHLY" ? (
              <input type="hidden" name="month" value={formatMonthKey(currentMonth)} />
            ) : (
              <input type="hidden" name="year" value={String(selectedYear)} />
            )}
            <div>
              <Label>Teacher</Label>
              <select
                name="teacherId"
                defaultValue={selectedTeacherId}
                className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
              >
                <option value="">All teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.schoolRole.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" variant="secondary" size="sm">Apply teacher</Button>
              <Link
                href={`/admin/teacher-salary?cycle=${payCycle}&${payCycle === "MONTHLY" ? `month=${encodeURIComponent(formatMonthKey(currentMonth))}` : `year=${selectedYear}`}`}
              >
                <Button type="button" variant="secondary" size="sm">Reset</Button>
              </Link>
            </div>
          </form>
        ) : null}

        {teachers.length === 0 ? (
          <EmptyState
            icon="👩‍🏫"
            title="No teachers found"
            description="Create teacher profiles before configuring salary."
          />
        ) : visibleTeachers.length === 0 ? (
          <EmptyState
            icon="👤"
            title="Teacher not found"
            description="Pick another teacher to view payout preview."
          />
        ) : (
          <div className="space-y-2.5">
            {visibleTeachers.map((teacher) => {
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
              const paidAmountCents = paidAmountByTeacher.get(teacher.id) ?? 0;
              const remainingCents = Math.max(0, netPayCents - paidAmountCents);
              const teacherPayouts = payoutsByTeacher.get(teacher.id) ?? [];

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
                      <p className="text-[12px] text-blue-300">Paid: {currency(paidAmountCents)}</p>
                      <p className="text-[12px] text-amber-300">Pending: {currency(remainingCents)}</p>
                    </div>
                  </div>

                  <details className="group mt-3 rounded-[11px] border border-white/[0.09] bg-black/20">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white/60">
                      <span>Update Salary Amount Paid</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] tracking-wide text-white/65">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Close</span>
                      </span>
                    </summary>
                    <div className="border-t border-white/[0.08] px-3 py-3 space-y-3">
                      <form action={recordTeacherSalaryPayoutAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="hidden" name="teacherUserId" value={teacher.id} />
                        <input type="hidden" name="payCycle" value={payCycle} />
                        <input type="hidden" name="periodKey" value={periodKey} />

                        <div>
                          <Label required>Amount paid (USD)</Label>
                          <Input
                            name="paidAmount"
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={toInputAmount(remainingCents)}
                            required
                          />
                        </div>

                        <div>
                          <Label required>Payout date</Label>
                          <Input name="paidOn" type="date" defaultValue={isoDate(new Date())} required />
                        </div>

                        <div>
                          <Label>Payment mode</Label>
                          <select
                            name="paymentMode"
                            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                          >
                            <option value="">Select mode</option>
                            <option value="BANK_TRANSFER">Bank transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="CASH">Cash</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label>Reference</Label>
                          <Input name="reference" placeholder="Txn / voucher ref" />
                        </div>

                        <div className="sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea name="notes" rows={2} placeholder="Optional payout note" />
                        </div>

                        <div className="sm:col-span-2 flex justify-end">
                          <Button type="submit">Save payout</Button>
                        </div>
                      </form>

                      {teacherPayouts.length > 0 ? (
                        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                            Recent payouts in this period
                          </p>
                          <div className="space-y-1.5">
                            {teacherPayouts.slice(0, 4).map((row) => (
                              <p key={row.id} className="text-[12px] text-white/70">
                                {row.paidOn.toLocaleDateString("en-US")} · {currency(row.paidAmountCents)}
                                {row.paymentMode ? ` · ${row.paymentMode}` : ""}
                                {row.reference ? ` · ${row.reference}` : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </details>
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
      <details className="group rounded-[12px] border border-white/[0.10] bg-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white/55">
          <span>Tap or click to configure salary</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] tracking-wide text-white/65">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
          </span>
        </summary>
        <div className="border-t border-white/[0.08] px-3.5 py-3">
          <form action={upsertTeacherSalaryProfileAction} className="grid grid-cols-1 gap-3 sm:gap-4">
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
        </div>
      </details>
    </Card>
  );
}
