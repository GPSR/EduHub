import Link from "next/link";
import { Badge, Button, Card, Input, Label, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";
import { requirePermission } from "@/lib/require-permission";
import {
  closeAcademicYearAction,
  createAcademicYearAction,
  setActiveAcademicYearAction
} from "./actions";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addYears(date: Date, delta: number) {
  return new Date(date.getFullYear() + delta, date.getMonth(), date.getDate());
}

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

export default async function AcademicYearsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");
  const { ay } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const activeYear = yearContext.activeYear;

  const [classes, activeYearStudentRows] = await Promise.all([
    db.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      select: { id: true, name: true, section: true }
    }),
    db.studentAcademicYear.findMany({
      where: {
        schoolId: session.schoolId,
        academicYearId: activeYear.id,
        status: "ACTIVE"
      },
      select: { classId: true }
    })
  ]);

  const classCountMap = new Map<string, number>();
  for (const row of activeYearStudentRows) {
    if (!row.classId) continue;
    classCountMap.set(row.classId, (classCountMap.get(row.classId) ?? 0) + 1);
  }

  const promotionClasses = classes.filter((row) => (classCountMap.get(row.id) ?? 0) > 0);

  const nextStartsOn = addYears(activeYear.startsOn, 1);
  const nextEndsOn = addYears(activeYear.endsOn, 1);
  const defaultNextName = `${nextStartsOn.getFullYear()}-${nextStartsOn.getFullYear() + 1}`;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Academic Years" subtitle="Manage year lifecycle, promotions, and retention controls" />

      <Card title="Current Year" description="System-wide active academic year" accent="indigo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold text-white/92">{activeYear.name}</p>
            <p className="mt-1 text-[12px] text-white/55">
              {activeYear.startsOn.toDateString()} - {activeYear.endsOn.toDateString()}
            </p>
          </div>
          <Badge tone={activeYear.status === "CLOSED" ? "warning" : "success"}>
            {activeYear.status === "CLOSED" ? "Closed" : "Active"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {yearContext.years.map((year) => (
            <div
              key={year.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-[13px] border px-3.5 py-3 ${
                year.id === selectedYear.id
                  ? "border-indigo-400/30 bg-indigo-500/[0.12]"
                  : "border-white/[0.09] bg-white/[0.03]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-white/90">{year.name}</p>
                <p className="text-[11px] text-white/50">
                  {year.startsOn.toDateString()} - {year.endsOn.toDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={year.status === "CLOSED" ? "warning" : "success"}>
                  {year.status === "CLOSED" ? "Closed" : year.isActive ? "Current" : "Open"}
                </Badge>
                {!year.isActive ? (
                  <form action={setActiveAcademicYearAction}>
                    <input type="hidden" name="academicYearId" value={year.id} />
                    <Button type="submit" size="sm" variant="secondary">Set Active</Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Create Academic Year" description="Add a new year window before closing current year" accent="teal">
        <form action={createAcademicYearAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="2027-2028" />
          </div>
          <label className="mt-7 inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" name="setActive" value="1" className="h-4 w-4 accent-indigo-500" />
            Set as active year after create
          </label>
          <div>
            <Label required>Start date</Label>
            <Input name="startsOn" type="date" required defaultValue={formatDateInput(nextStartsOn)} />
          </div>
          <div>
            <Label required>End date</Label>
            <Input name="endsOn" type="date" required defaultValue={formatDateInput(nextEndsOn)} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Create year</Button>
          </div>
        </form>
      </Card>

      <Card
        title="Year Close Workflow"
        description="Lock current year, promote students, mark graduates, and roll forward timetable drafts"
        accent="indigo"
      >
        <form action={closeAcademicYearAction} className="space-y-4">
          <input type="hidden" name="currentYearId" value={activeYear.id} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label required>Next year name</Label>
              <Input name="nextYearName" required defaultValue={defaultNextName} />
            </div>
            <div>
              <Label required>Next start</Label>
              <Input name="nextStartsOn" type="date" required defaultValue={formatDateInput(nextStartsOn)} />
            </div>
            <div>
              <Label required>Next end</Label>
              <Input name="nextEndsOn" type="date" required defaultValue={formatDateInput(nextEndsOn)} />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" name="copyTimetableDraft" value="1" className="h-4 w-4 accent-indigo-500" defaultChecked />
            Copy timetable rows from current year to next year as draft
          </label>

          <div className="rounded-[14px] border border-white/[0.10] bg-black/20 p-3.5">
            <p className="text-[13px] font-semibold text-white/90">Class Promotion Mapping</p>
            <p className="mt-0.5 text-[11px] text-white/50">Choose destination class for each current class. Select graduate for final classes.</p>

            {promotionClasses.length === 0 ? (
              <p className="mt-3 text-sm text-white/55">No active student-year rows found for the current year.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {promotionClasses.map((row) => {
                  const strength = classCountMap.get(row.id) ?? 0;
                  return (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr] items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                      <div>
                        <p className="text-[13px] font-semibold text-white/88">{classLabel(row.name, row.section)}</p>
                        <p className="text-[11px] text-white/45">{strength} student(s)</p>
                      </div>
                      <select
                        name={`promote_${row.id}`}
                        defaultValue="__SAME__"
                        className="w-full rounded-[11px] border border-white/[0.12] bg-[#0f1728]/75 px-3 py-2 text-sm text-white outline-none focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                      >
                        <option value="__SAME__">Keep same class</option>
                        {classes.map((target) => (
                          <option key={target.id} value={target.id}>
                            {classLabel(target.name, target.section)}
                          </option>
                        ))}
                        <option value="__GRADUATE__">Mark as graduated/alumni</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="danger">Close Year & Promote</Button>
          </div>
        </form>
      </Card>

      <Card title="Retention & Audit Policy" description="Operational guardrails for yearly school data" accent="teal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[13px] text-white/80">
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">Daily backup: incremental snapshot every day.</div>
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">Weekly backup: full database backup once a week.</div>
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">Deletion rules: delete only after retention window and approval.</div>
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">Audit trail: every create/update/close action is logged with actor and timestamp.</div>
        </div>
        <div className="mt-3">
          <Link href={withAcademicYearParam("/admin/audit", selectedYear.id)} className="text-sm text-blue-200 hover:text-blue-100 transition">
            Open audit logs →
          </Link>
        </div>
      </Card>
    </div>
  );
}
