import { Card, SectionHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardGlobalSearch } from "../dashboard-global-search";
import { FolderSlideshow } from "../gallery/folder-slideshow";
import { getLatestGallerySlideshow } from "@/lib/latest-gallery-slideshow";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

const DASHBOARD_MODULE_LINKS = [
  { href: "/students", icon: "👥", label: "Students" },
  { href: "/fees", icon: "💳", label: "Fees" },
  { href: "/attendance", icon: "✅", label: "Attendance" },
  { href: "/feed", icon: "📢", label: "Feed" },
  { href: "/teachers", icon: "👩‍🏫", label: "Teachers" },
  { href: "/academics", icon: "📚", label: "Academics" },
  { href: "/exams", icon: "🧪", label: "Exams" },
  { href: "/academics/homework", icon: "📝", label: "Homework" },
  { href: "/academics/progress-card", icon: "🎓", label: "Progress Card" },
  { href: "/learning-center", icon: "🧠", label: "Learning Center" },
  { href: "/calendar", icon: "🗓️", label: "Calendar" },
  { href: "/timetable", icon: "🧾", label: "Timetable" },
  { href: "/leave-requests", icon: "🗒️", label: "Leave Requests" },
  { href: "/admin/teacher-salary", icon: "💼", label: "Teacher Salary" },
  { href: "/transport", icon: "🚌", label: "Transport" },
  { href: "/notifications", icon: "🔔", label: "Notifications" },
  { href: "/reports", icon: "📊", label: "Reports" },
  { href: "/support", icon: "💬", label: "Support" },
  { href: "/gallery", icon: "🖼️", label: "Gallery" },
  { href: "/admin/users", icon: "🛡", label: "Users" },
  { href: "/admin/settings", icon: "⚙️", label: "Settings" },
] as const;

const MOBILE_MODULE_WIDGET_SKINS = [
  "bg-[linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.08))] border-blue-300/25",
  "bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(167,139,250,0.08))] border-violet-300/25",
  "bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(20,184,166,0.08))] border-emerald-300/25",
  "bg-[linear-gradient(135deg,rgba(20,184,166,0.2),rgba(6,182,212,0.08))] border-teal-300/25",
  "bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(249,115,22,0.08))] border-amber-300/25",
  "bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(59,130,246,0.08))] border-sky-300/25",
] as const;

function centsToUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; fees?: string; ay?: string }>;
}) {
  await requirePermission("DASHBOARD", "VIEW");
  const session = await requireSession();
  if (session.roleKey !== "ADMIN") redirect("/home");
  const { q, fees, ay } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;
  const query = (q ?? "").trim();
  const feeView = fees === "paid" || fees === "pending" ? fees : null;
  const attendanceDate = startOfDay(new Date());
  const attendanceDateStr = isoDate(attendanceDate);

  const [
    teachers,
    posts,
    school,
    quickSearchStudents,
    quickSearchTeachers,
    feeInvoicedTotals,
    feeCollectedTotals,
    latestSlideshow,
    currentUser,
    classes,
    studentCountsByClass,
    todayAttendanceRecords
  ] = await Promise.all([
    db.user.count({
      where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } }
    }),
    db.feedPost.count({ where: { schoolId: session.schoolId } }),
    db.school.findUnique({
      where: { id: session.schoolId },
      include: { subscription: true }
    }),
    db.student.findMany({
      where: { schoolId: session.schoolId },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        admissionNo: true,
        rollNumber: true,
        class: { select: { name: true, section: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 220
    }),
    db.user.findMany({
      where: {
        schoolId: session.schoolId,
        schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } }
      },
      select: {
        id: true,
        name: true,
        email: true,
        schoolRole: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 180
    }),
    db.feeInvoice.aggregate({
      where: { schoolId: session.schoolId, academicYearId: selectedYear.id },
      _sum: { amountCents: true }
    }),
    db.feePayment.aggregate({
      where: { invoice: { schoolId: session.schoolId, academicYearId: selectedYear.id } },
      _sum: { amountCents: true }
    }),
    getLatestGallerySlideshow({
      schoolId: session.schoolId,
      roleKey: session.roleKey,
      roleId: session.roleId,
      take: 20
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true }
    }),
    db.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: "asc" }, { section: "asc" }]
    }),
    db.student.groupBy({
      by: ["classId"],
      where: { schoolId: session.schoolId, classId: { not: null } },
      _count: { _all: true }
    }),
    db.attendanceRecord.findMany({
      where: {
        schoolId: session.schoolId,
        academicYearId: selectedYear.id,
        date: attendanceDate
      },
      select: {
        status: true,
        student: { select: { classId: true } }
      }
    })
  ]);

  const totalInvoicedCents = feeInvoicedTotals._sum.amountCents ?? 0;
  const totalReceivedCents = feeCollectedTotals._sum.amountCents ?? 0;
  const pendingFeeCents = Math.max(0, totalInvoicedCents - totalReceivedCents);

  const paidEntries =
    feeView === "paid"
      ? await db.feePayment.findMany({
          where: { invoice: { schoolId: session.schoolId, academicYearId: selectedYear.id } },
          select: {
            amountCents: true,
            paidAt: true,
            invoice: {
              select: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    studentId: true,
                    class: { select: { name: true, section: true } }
                  }
                }
              }
            }
          },
          orderBy: { paidAt: "desc" },
          take: 1200
        })
      : [];

  const pendingEntries =
    feeView === "pending"
      ? await db.feeInvoice.findMany({
          where: { schoolId: session.schoolId, academicYearId: selectedYear.id, status: { not: "PAID" } },
          select: {
            id: true,
            amountCents: true,
            status: true,
            dueOn: true,
            payments: { select: { amountCents: true } },
            student: {
              select: {
                id: true,
                fullName: true,
                studentId: true,
                class: { select: { name: true, section: true } }
              }
            }
          },
          orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }],
          take: 1000
        })
      : [];

  const paidByStudent = new Map<
    string,
    {
      studentId: string;
      fullName: string;
      studentCode: string;
      classLabel: string;
      totalPaidCents: number;
      paymentCount: number;
      lastPaidAt: Date;
    }
  >();
  for (const entry of paidEntries) {
    const student = entry.invoice.student;
    const classLabel = student.class ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}` : "No class";
    const existing = paidByStudent.get(student.id);
    if (!existing) {
      paidByStudent.set(student.id, {
        studentId: student.id,
        fullName: student.fullName,
        studentCode: student.studentId,
        classLabel,
        totalPaidCents: entry.amountCents,
        paymentCount: 1,
        lastPaidAt: entry.paidAt,
      });
      continue;
    }
    existing.totalPaidCents += entry.amountCents;
    existing.paymentCount += 1;
    if (entry.paidAt > existing.lastPaidAt) existing.lastPaidAt = entry.paidAt;
  }
  const paidStudents = Array.from(paidByStudent.values()).sort((a, b) => b.totalPaidCents - a.totalPaidCents);

  const pendingByStudent = new Map<
    string,
    {
      studentId: string;
      fullName: string;
      studentCode: string;
      classLabel: string;
      pendingCents: number;
      invoiceCount: number;
      overdueCount: number;
      nearestDueOn: Date | null;
    }
  >();
  for (const entry of pendingEntries) {
    const paidCents = entry.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const balanceCents = Math.max(0, entry.amountCents - paidCents);
    if (balanceCents <= 0) continue;
    const student = entry.student;
    const classLabel = student.class ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}` : "No class";
    const existing = pendingByStudent.get(student.id);
    if (!existing) {
      pendingByStudent.set(student.id, {
        studentId: student.id,
        fullName: student.fullName,
        studentCode: student.studentId,
        classLabel,
        pendingCents: balanceCents,
        invoiceCount: 1,
        overdueCount: entry.status === "OVERDUE" ? 1 : 0,
        nearestDueOn: entry.dueOn ?? null,
      });
      continue;
    }
    existing.pendingCents += balanceCents;
    existing.invoiceCount += 1;
    if (entry.status === "OVERDUE") existing.overdueCount += 1;
    if (entry.dueOn && (!existing.nearestDueOn || entry.dueOn < existing.nearestDueOn)) {
      existing.nearestDueOn = entry.dueOn;
    }
  }
  const pendingStudents = Array.from(pendingByStudent.values()).sort((a, b) => b.pendingCents - a.pendingCents);
  const studentCountByClassId = new Map(
    studentCountsByClass
      .filter((row): row is { classId: string; _count: { _all: number } } => Boolean(row.classId))
      .map((row) => [row.classId, row._count._all])
  );
  const attendanceByClassId = new Map<
    string,
    { marked: number; present: number; leave: number; absent: number; late: number }
  >();
  for (const record of todayAttendanceRecords) {
    const classId = record.student.classId;
    if (!classId) continue;
    const bucket = attendanceByClassId.get(classId) ?? { marked: 0, present: 0, leave: 0, absent: 0, late: 0 };
    bucket.marked += 1;
    if (record.status === "PRESENT") bucket.present += 1;
    if (record.status === "LEAVE") bucket.leave += 1;
    if (record.status === "ABSENT") bucket.absent += 1;
    if (record.status === "LATE") bucket.late += 1;
    attendanceByClassId.set(classId, bucket);
  }
  const classWiseAttendanceRows = classes.map((cls) => {
    const classLabel = `${cls.name}${cls.section ? `-${cls.section}` : ""}`;
    const total = studentCountByClassId.get(cls.id) ?? 0;
    const bucket = attendanceByClassId.get(cls.id) ?? { marked: 0, present: 0, leave: 0, absent: 0, late: 0 };
    const pending = Math.max(0, total - bucket.marked);
    const presentRate = total > 0 ? Math.round((bucket.present / total) * 100) : 0;
    return {
      classId: cls.id,
      classLabel,
      total,
      marked: bucket.marked,
      present: bucket.present,
      leave: bucket.leave,
      pending,
      presentRate
    };
  });

  const normalizedQuery = query.toLowerCase();
  const matchedStudents = query
    ? quickSearchStudents
        .filter((s) =>
          `${s.fullName} ${s.studentId} ${s.admissionNo ?? ""} ${s.rollNumber ?? ""} ${s.class ? `${s.class.name} ${s.class.section ?? ""}` : ""}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 12)
    : [];
  const matchedTeachers = query
    ? quickSearchTeachers
        .filter((t) =>
          `${t.name} ${t.email} ${t.schoolRole.name}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 12)
    : [];
  const revenueHref = withAcademicYearParam(
    query
      ? `/dashboard?q=${encodeURIComponent(query)}&fees=paid#fee-insights`
      : "/dashboard?fees=paid#fee-insights",
    selectedYear.id
  );
  const grandTotalHref = withAcademicYearParam("/fees", selectedYear.id);
  const pendingHref = withAcademicYearParam(
    query
      ? `/dashboard?q=${encodeURIComponent(query)}&fees=pending#fee-insights`
      : "/dashboard?fees=pending#fee-insights",
    selectedYear.id
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="hidden md:block">
        <SectionHeader title="Dashboard" subtitle={`Welcome back — ${school?.name ?? "your school"} · ${selectedYear.name}`} />
      </div>

      <section className="md:hidden rounded-[24px] border border-white/[0.10] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3.5 backdrop-blur-xl shadow-[0_12px_28px_-24px_rgba(0,0,0,0.95)]">
        <div className="mb-3">
          <p className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-white/95">
            Hello! {currentUser?.name?.split(" ")[0] ?? "Admin"}
          </p>
          <p className="mt-1 text-[12px] text-white/68">Welcome to {school?.name ?? "your school"}.</p>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-[18px] border border-white/[0.12] bg-[#0f1728]/72 p-2 shadow-[0_12px_28px_-22px_rgba(0,0,0,0.88)]">
            <DashboardGlobalSearch
              initialQuery={query}
              showLabel={false}
              variant="heroCompact"
              showMicIcon
              placeholderOverride="Search for students, teachers, or modules"
              students={quickSearchStudents.map((s) => ({
                id: s.id,
                fullName: s.fullName,
                studentId: s.studentId,
                admissionNo: s.admissionNo ?? null,
                rollNumber: s.rollNumber ?? null,
                classLabel: s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : null
              }))}
              teachers={quickSearchTeachers.map((t) => ({
                id: t.id,
                name: t.name,
                email: t.email,
                roleName: t.schoolRole.name
              }))}
            />
          </div>

          <div className="rounded-[18px] border border-white/[0.12] bg-[#0f1728]/60 p-2 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.9)]">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-2 pb-1 snap-x snap-mandatory">
                {DASHBOARD_MODULE_LINKS.map((item, idx) => (
                  <Link
                    key={item.href}
                    href={withAcademicYearParam(item.href, selectedYear.id)}
                    className={`snap-start w-[118px] shrink-0 rounded-[13px] border px-2.5 py-2.5 transition hover:brightness-110 ${MOBILE_MODULE_WIDGET_SKINS[idx % MOBILE_MODULE_WIDGET_SKINS.length]}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[15px]">{item.icon}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-100/90" />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-white/92">{item.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="relative z-[110] overflow-visible hidden md:block">
        <DashboardGlobalSearch
          initialQuery={query}
          students={quickSearchStudents.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            studentId: s.studentId,
            admissionNo: s.admissionNo ?? null,
            rollNumber: s.rollNumber ?? null,
            classLabel: s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : null
          }))}
          teachers={quickSearchTeachers.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            roleName: t.schoolRole.name
          }))}
        />
      </Card>

      {latestSlideshow ? (
        <Card
          title={`Gallery Slideshow · ${latestSlideshow.folderName}`}
          description="Latest school photos visible for your role"
          accent="teal"
        >
          <FolderSlideshow
            folderId={latestSlideshow.folderId}
            folderName={latestSlideshow.folderName}
            items={latestSlideshow.items}
            autoPlay
            autoPlayIntervalMs={3000}
          />
        </Card>
      ) : null}

      {query && (matchedStudents.length > 0 || matchedTeachers.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {matchedStudents.length > 0 && (
            <Card title={`Matched Students · ${matchedStudents.length}`} accent="indigo">
              <div className="divide-y divide-white/[0.06]">
                {matchedStudents.map((s) => {
                  const classLabel = s.class ? `${s.class.name}${s.class.section ? `-${s.class.section}` : ""}` : "No class";
                  return (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition rounded-[10px] px-2 -mx-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white/90 truncate">{s.fullName}</div>
                        <div className="text-xs text-white/45 truncate">
                          {s.studentId} · {s.admissionNo ?? "No admission no."} · {classLabel}
                        </div>
                      </div>
                      <span className="text-xs text-indigo-300/80 shrink-0">Open</span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {matchedTeachers.length > 0 && (
            <Card title={`Matched Teachers · ${matchedTeachers.length}`} accent="teal">
              <div className="divide-y divide-white/[0.06]">
                {matchedTeachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/users#user-${t.id}`}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition rounded-[10px] px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/90 truncate">{t.name}</div>
                      <div className="text-xs text-white/45 truncate">{t.email} · {t.schoolRole.name}</div>
                    </div>
                    <span className="text-xs text-teal-300/80 shrink-0">Open</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {query && matchedStudents.length === 0 && matchedTeachers.length === 0 && (
        <Card title="Search Results">
          <p className="text-sm text-white/50">
            No teachers or students matched <span className="text-white/75">&quot;{query}&quot;</span>.
          </p>
        </Card>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon="🧾" label="Grand Total" value={centsToUsd(totalInvoicedCents)}
          color={totalInvoicedCents > 0 ? "indigo" : "teal"} delay="stagger-1" href={grandTotalHref}
        />
        <StatCard
          icon="💰" label="Total Received" value={centsToUsd(totalReceivedCents)}
          color={totalReceivedCents > 0 ? "emerald" : "indigo"} delay="stagger-2" href={revenueHref} active={feeView === "paid"}
        />
        <StatCard
          icon="📄" label="Pending Amount" value={centsToUsd(pendingFeeCents)}
          color={pendingFeeCents > 0 ? "amber" : "emerald"} delay="stagger-3" href={pendingHref} active={feeView === "pending"}
        />
        <StatCard
          icon="🏫" label="Teachers" value={teachers}
          color="teal" delay="stagger-4" href="/admin/users"
        />
        <StatCard
          icon="📢" label="Feed Posts" value={posts}
          color="violet" delay="stagger-5" href="/feed"
        />
      </div>

      <Card
        title="Class-wise Attendance"
        description={`Entire school attendance by class · ${attendanceDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`}
        accent="teal"
      >
        {classWiseAttendanceRows.length === 0 ? (
          <p className="py-5 text-center text-sm text-white/45">No classes found for this school.</p>
        ) : (
          <div className="space-y-2">
            {classWiseAttendanceRows.map((row) => (
              <Link
                key={row.classId}
                href={withAcademicYearParam(`/attendance?date=${encodeURIComponent(attendanceDateStr)}&classId=${encodeURIComponent(row.classId)}`, selectedYear.id)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/90">{row.classLabel}</p>
                  <p className="truncate text-xs text-white/45">
                    Total {row.total} · Marked {row.marked} · Pending {row.pending}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-emerald-200">
                    Present {row.present}
                  </span>
                  <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-amber-200">
                    Leave {row.leave}
                  </span>
                  <span className="rounded-full border border-blue-500/35 bg-blue-500/12 px-2 py-0.5 text-blue-200">
                    {row.presentRate}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {feeView === "paid" && (
        <Card
          title={`Paid Students · ${paidStudents.length}`}
          description="Students who contributed to collected fee revenue"
          accent="emerald"
          className="scroll-mt-24"
        >
          <div id="fee-insights" className="space-y-2">
            {paidStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/45">No paid fee records yet.</p>
            ) : (
              paidStudents.slice(0, 120).map((student) => (
                <Link
                  key={student.studentId}
                  href={`/students/${student.studentId}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{student.fullName}</p>
                    <p className="truncate text-xs text-white/45">
                      {student.studentCode} · {student.classLabel} · {student.paymentCount} payment{student.paymentCount > 1 ? "s" : ""} · Last paid {student.lastPaidAt.toDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-emerald-300 tabular-nums">
                    {centsToUsd(student.totalPaidCents)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      )}

      {feeView === "pending" && (
        <Card
          title={`Pending Students · ${pendingStudents.length}`}
          description="Students with due or partial fee balances"
          accent="amber"
          className="scroll-mt-24"
        >
          <div id="fee-insights" className="space-y-2">
            {pendingStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/45">No pending fee balances.</p>
            ) : (
              pendingStudents.slice(0, 120).map((student) => (
                <Link
                  key={student.studentId}
                  href={`/students/${student.studentId}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{student.fullName}</p>
                    <p className="truncate text-xs text-white/45">
                      {student.studentCode} · {student.classLabel} · {student.invoiceCount} pending invoice{student.invoiceCount > 1 ? "s" : ""}
                      {student.overdueCount > 0 ? ` · ${student.overdueCount} overdue` : ""}
                      {student.nearestDueOn ? ` · Due ${student.nearestDueOn.toDateString()}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-amber-300 tabular-nums">
                    {centsToUsd(student.pendingCents)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      )}

    </div>
  );
}

function StatCard({
  icon, label, value, color, delay, href, active = false
}: {
  icon: string;
  label: string;
  value: number | string;
  color: "indigo" | "teal" | "amber" | "emerald" | "violet";
  delay: string;
  href: string;
  active?: boolean;
}) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    teal:    { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"  },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20"},
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20" },
  }[color];

  return (
    <Link
      href={href}
      className={`block animate-fade-up ${delay} rounded-[16px] sm:rounded-[18px] border border-white/[0.08] bg-white/[0.04]
                  p-3.5 sm:p-5 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-200
                  shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${active ? "ring-2 ring-indigo-400/35 border-indigo-400/30 bg-indigo-500/[0.08]" : ""}`}
    >
      <div className={`mb-2 sm:mb-3 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[11px] ${colorMap.bg} ${colorMap.border} border`}>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-white/95 tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-[12px] font-medium text-white/45 uppercase tracking-wider">{label}</div>
    </Link>
  );
}
