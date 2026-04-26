import { Card, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardGlobalSearch } from "../dashboard-global-search";
import { FolderSlideshow } from "../gallery/folder-slideshow";
import { getLatestGallerySlideshow } from "@/lib/latest-gallery-slideshow";

function centsToUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; fees?: string }>;
}) {
  await requirePermission("DASHBOARD", "VIEW");
  const session = await requireSession();
  if (session.roleKey !== "ADMIN") redirect("/students");
  const { q, fees } = await searchParams;
  const query = (q ?? "").trim();
  const feeView = fees === "paid" || fees === "pending" ? fees : null;

  const [
    teachers,
    posts,
    school,
    quickSearchStudents,
    quickSearchTeachers,
    feeInvoicedTotals,
    feeCollectedTotals,
    latestSlideshow
  ] = await Promise.all([
    prisma.user.count({
      where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } }
    }),
    prisma.feedPost.count({ where: { schoolId: session.schoolId } }),
    prisma.school.findUnique({
      where: { id: session.schoolId },
      include: { subscription: true }
    }),
    prisma.student.findMany({
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
    prisma.user.findMany({
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
    prisma.feeInvoice.aggregate({
      where: { schoolId: session.schoolId },
      _sum: { amountCents: true }
    }),
    prisma.feePayment.aggregate({
      where: { invoice: { schoolId: session.schoolId } },
      _sum: { amountCents: true }
    }),
    getLatestGallerySlideshow({
      schoolId: session.schoolId,
      roleKey: session.roleKey,
      roleId: session.roleId,
      take: 20
    })
  ]);

  const totalInvoicedCents = feeInvoicedTotals._sum.amountCents ?? 0;
  const totalRevenueCents = feeCollectedTotals._sum.amountCents ?? 0;
  const pendingFeeCents = Math.max(0, totalInvoicedCents - totalRevenueCents);

  const paidEntries =
    feeView === "paid"
      ? await prisma.feePayment.findMany({
          where: { invoice: { schoolId: session.schoolId } },
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
      ? await prisma.feeInvoice.findMany({
          where: { schoolId: session.schoolId, status: { not: "PAID" } },
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
  const revenueHref = query
    ? `/dashboard?q=${encodeURIComponent(query)}&fees=paid#fee-insights`
    : "/dashboard?fees=paid#fee-insights";
  const pendingHref = query
    ? `/dashboard?q=${encodeURIComponent(query)}&fees=pending#fee-insights`
    : "/dashboard?fees=pending#fee-insights";

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader title="Dashboard" subtitle={`Welcome back — ${school?.name ?? "your school"}`} />

      <Card className="relative z-[110] overflow-visible">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="💰" label="Total Revenue" value={centsToUsd(totalRevenueCents)}
          color={totalRevenueCents > 0 ? "emerald" : "indigo"} delay="stagger-1" href={revenueHref} active={feeView === "paid"}
        />
        <StatCard
          icon="🏫" label="Teachers" value={teachers}
          color="teal" delay="stagger-2" href="/admin/users"
        />
        <StatCard
          icon="🧾" label="Pending Fee Amount" value={centsToUsd(pendingFeeCents)}
          color={pendingFeeCents > 0 ? "amber" : "emerald"} delay="stagger-3" href={pendingHref} active={feeView === "pending"}
        />
        <StatCard
          icon="📢" label="Feed Posts" value={posts}
          color="violet" delay="stagger-4" href="/feed"
        />
      </div>

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

      <Card title="Quick Access" accent="teal">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: "/admin/users", icon: "🏫", label: "Teachers"   },
            { href: "/attendance", icon: "✅", label: "Attendance" },
            { href: "/academics",  icon: "📚", label: "Academics"  },
            { href: "/transport",  icon: "🚌", label: "Transport"  },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-[13px] border border-white/[0.07] bg-white/[0.03]
                         px-3.5 py-3 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150"
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[13px] font-medium text-white/80">{item.label}</span>
            </a>
          ))}
        </div>
      </Card>
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
