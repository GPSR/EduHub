import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge, Button } from "@/components/ui";
import { StudentPhotoAvatarUploader } from "@/components/student-photo-avatar-uploader";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { sendStudentFeeReminderAction } from "../../fees/actions";
import { updateStudentProgressionAction, uploadStudentPhotoAction } from "../actions";
import { getAcademicYearContext, withAcademicYearParam } from "@/lib/academic-year";

function centsToUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function StudentProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reminder?: string; photoUpdated?: string; photoError?: string; promotion?: string; ay?: string }>;
}) {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const { id } = await params;
  const { reminder, photoUpdated, photoError, promotion, ay } = await searchParams;
  const yearContext = await getAcademicYearContext({ schoolId: session.schoolId, requestedYearId: ay });
  const selectedYear = yearContext.selectedYear;

  const student = await db.student.findFirst({
    where:
      session.roleKey === "PARENT"
        ? { id, schoolId: session.schoolId, parents: { some: { userId: session.userId } } }
        : { id, schoolId: session.schoolId },
    include: { class: true },
  });
  if (!student) return notFound();

  const className = student.class
    ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}`
    : null;

  const initials = student.fullName.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const feedWhere = student.classId
    ? {
        schoolId: session.schoolId,
        OR: [{ scope: "SCHOOL" }, { scope: "CLASS", classId: student.classId }]
      }
    : { schoolId: session.schoolId, scope: "SCHOOL" };

  const perms = await getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId });
  const canSendFeeReminder = perms["FEES"] ? atLeastLevel(perms["FEES"], "EDIT") : false;
  const canEditStudents = session.roleKey === "ADMIN" || (perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false);
  const canManageProgression = canEditStudents && session.roleKey === "ADMIN";

  const [feedPosts, invoices, selectedYearRow, promotionClasses, lastKnownPlacement] = await Promise.all([
    db.feedPost.findMany({
      where: feedWhere,
      select: { id: true, title: true, scope: true, authorId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    db.feeInvoice.findMany({
      where:
        session.roleKey === "PARENT"
          ? {
              schoolId: session.schoolId,
              studentId: student.id,
              academicYearId: selectedYear.id,
              student: { parents: { some: { userId: session.userId } } }
            }
          : { schoolId: session.schoolId, studentId: student.id, academicYearId: selectedYear.id },
      include: { payments: { select: { amountCents: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    db.studentAcademicYear.findUnique({
      where: {
        academicYearId_studentId: {
          academicYearId: selectedYear.id,
          studentId: student.id
        }
      },
      select: { classId: true, rollNumber: true, status: true }
    }),
    canManageProgression
      ? db.class.findMany({
          where: { schoolId: session.schoolId },
          select: { id: true, name: true, section: true, createdAt: true }
        })
      : Promise.resolve([]),
    canManageProgression
      ? db.studentAcademicYear.findFirst({
          where: {
            schoolId: session.schoolId,
            studentId: student.id,
            classId: { not: null }
          },
          orderBy: { updatedAt: "desc" },
          select: { classId: true }
        })
      : Promise.resolve(null)
  ]);

  const authorIds = Array.from(new Set(feedPosts.map((post) => post.authorId)));
  const authorRows = authorIds.length
    ? await db.user.findMany({
        where: { schoolId: session.schoolId, id: { in: authorIds } },
        select: { id: true, name: true }
      })
    : [];
  const authorNameById = new Map(authorRows.map((row) => [row.id, row.name]));

  const canUploadStudentPhoto = session.roleKey === "PARENT" || canEditStudents;

  const currentProgressStatus = selectedYearRow?.status ?? "ACTIVE";
  const progressionStatusLabel =
    currentProgressStatus === "GRADUATED"
      ? "Inactive"
      : currentProgressStatus === "PROMOTED"
        ? "Promoted"
        : "Active";

  const classCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sortedPromotionClasses = [...promotionClasses].sort((a, b) => {
    const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    const byName = classCollator.compare(a.name, b.name);
    if (byName !== 0) return byName;
    return classCollator.compare(a.section, b.section);
  });
  const progressionClassId = selectedYearRow?.classId ?? student.classId ?? lastKnownPlacement?.classId ?? null;
  const progressionClassIndex = progressionClassId
    ? sortedPromotionClasses.findIndex((row) => row.id === progressionClassId)
    : -1;
  const nextClass = progressionClassIndex >= 0 ? sortedPromotionClasses[progressionClassIndex + 1] : undefined;
  const nextClassLabel = nextClass ? `${nextClass.name}${nextClass.section ? ` - ${nextClass.section}` : ""}` : null;

  const feeRows = invoices.map((invoice) => {
    const paidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const pendingCents = Math.max(0, invoice.amountCents - paidCents);
    return { id: invoice.id, title: invoice.title, status: invoice.status, pendingCents, totalCents: invoice.amountCents, createdAt: invoice.createdAt };
  });
  const pendingFeeRows = feeRows.filter((row) => row.pendingCents > 0);
  const totalInvoicedCents = feeRows.reduce((sum, row) => sum + row.totalCents, 0);
  const totalPendingCents = pendingFeeRows.reduce((sum, row) => sum + row.pendingCents, 0);
  const totalPaidCents = Math.max(0, totalInvoicedCents - totalPendingCents);

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Students
      </Link>

      {reminder === "sent" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Fee reminder sent successfully.
        </div>
      )}
      {reminder === "none" && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No pending fee balances found for reminder.
        </div>
      )}
      {photoUpdated === "1" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Student photo uploaded successfully.
        </div>
      )}
      {photoError === "1" && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Unable to upload photo. Please use JPG/PNG/WEBP up to 1.5MB.
        </div>
      )}
      {promotion === "next" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Student promoted to next class successfully.
        </div>
      )}
      {promotion === "same" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Student retained in the same class.
        </div>
      )}
      {promotion === "inactive" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Student marked as inactive.
        </div>
      )}
      {promotion === "noNextClass" && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No next class available. Configure the next class in Settings.
        </div>
      )}
      {promotion === "yearLocked" && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Selected academic year is closed and cannot be updated.
        </div>
      )}
      {promotion === "yearNotActive" && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Switch to active academic year to update promotion status.
        </div>
      )}

      {canEditStudents && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="secondary" size="sm">Edit Student</Button>
          </Link>
          <Link href={`/students/${student.id}/id-card`}>
            <Button variant="secondary" size="sm">Virtual ID Card</Button>
          </Link>
        </div>
      )}
      {session.roleKey === "PARENT" && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="secondary" size="sm">Update Parent / Guardian Details</Button>
          </Link>
          <Link href={`/students/${student.id}/id-card`}>
            <Button variant="secondary" size="sm">Virtual ID Card</Button>
          </Link>
        </div>
      )}

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          {canUploadStudentPhoto ? (
            <StudentPhotoAvatarUploader
              action={uploadStudentPhotoAction}
              studentId={student.id}
              studentName={student.fullName}
              photoUrl={student.photoUrl}
              returnTo={`/students/${student.id}`}
            />
          ) : (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/[0.12] bg-white/[0.04]">
              {student.photoUrl ? (
                <Image
                  src={student.photoUrl}
                  alt={student.fullName}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center bg-gradient-to-b from-indigo-400 to-indigo-600 text-xl font-bold text-white shadow-lg">
                  {initials}
                </div>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white/95 tracking-tight">{student.fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {className && <Badge tone="info">{className}</Badge>}
              {student.rollNumber && <Badge tone="neutral">Roll {student.rollNumber}</Badge>}
              <Badge tone="neutral">ID: {student.studentId}</Badge>
            </div>
            {canUploadStudentPhoto ? <p className="mt-2 text-[11px] text-white/40">Tap the avatar to crop and upload photo.</p> : null}
          </div>
        </div>
      </div>

      {canManageProgression && (
        <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-white/94">Student Progression</p>
            <Badge tone={currentProgressStatus === "GRADUATED" ? "danger" : "info"}>
              {progressionStatusLabel}
            </Badge>
            <Badge tone="neutral">{selectedYear.name}</Badge>
          </div>
          <form action={updateStudentProgressionAction} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="academicYearId" value={selectedYear.id} />
            <input type="hidden" name="returnTo" value={withAcademicYearParam(`/students/${student.id}`, selectedYear.id)} />
            <div>
              <label className="mb-1 block text-[12px] text-white/60">Promotion action</label>
              <select
                name="outcome"
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
                defaultValue={nextClassLabel ? "NEXT_CLASS" : "SAME_CLASS"}
              >
                <option value="NEXT_CLASS" disabled={!nextClassLabel}>
                  {nextClassLabel ? `Next class (${nextClassLabel})` : "Next class (not available)"}
                </option>
                <option value="SAME_CLASS">Same class</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <p className="mt-1 text-[11px] text-white/40">Applies to active year only. Inactive can be reactivated to same or next class.</p>
            </div>
            <Button type="submit" size="sm">Update progression</Button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        <CollapsibleSection title="Academic Information" subtitle="Class, admission, and identity details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Admission Number" value={student.admissionNo ?? "—"} />
            <Field label="Class / Section" value={className ?? "—"} />
            <Field label="Roll Number" value={student.rollNumber ?? "—"} />
            <Field label="Gender" value={student.gender ?? "—"} />
            <Field label="Date of Birth" value={student.dateOfBirth ? student.dateOfBirth.toDateString() : "—"} />
            <Field label="Blood Group" value={student.bloodGroup ?? "—"} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Contact & Other Information" subtitle="Address, transport, and health notes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Address" value={student.address ?? "—"} />
            <Field label="Transport" value={student.transportDetails ?? "—"} />
            <Field label="Medical Notes" value={student.medicalNotes ?? "—"} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Parent & Guardian Information" subtitle="Family and emergency contact details">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Father's Name" value={student.fatherName ?? "—"} />
            <Field label="Mother's Name" value={student.motherName ?? "—"} />
            <Field label="Mobile(s)" value={student.parentMobiles ?? "—"} />
            <Field label="Email(s)" value={student.parentEmails ?? "—"} />
            <Field label="Occupation" value={student.parentOccupation ?? "—"} />
            <Field label="Parent Address" value={student.parentAddress ?? "—"} />
            <Field label="Emergency Contact" value={student.emergencyContact ?? "—"} />
            <Field label="Guardian Name" value={student.guardianName ?? "—"} />
            <Field label="Relationship" value={student.guardianRelationship ?? "—"} />
            <Field label="Guardian Mobile" value={student.guardianMobile ?? "—"} />
            <Field label="Guardian Alt Contact" value={student.guardianAltContact ?? "—"} />
            <Field label="Guardian Address" value={student.guardianAddress ?? "—"} />
            <Field label="Pickup Authorization" value={student.pickupAuthDetails ?? "—"} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Feed Information" subtitle="Recent announcements visible to this student">
          {feedPosts.length === 0 ? (
            <p className="text-sm text-white/50">No feed announcements yet for this student scope.</p>
          ) : (
            <div className="space-y-2">
              {feedPosts.map((post) => (
                <div key={post.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[14px] font-semibold text-white/90">{post.title}</p>
                  <p className="mt-1 text-[12px] text-white/45">
                    {post.scope === "CLASS" ? "Class feed" : "School feed"} · by {authorNameById.get(post.authorId) ?? "School Admin"} · {timeAgo(post.createdAt)}
                  </p>
                </div>
              ))}
              <div className="pt-1">
                <Link href="/feed" className="inline-flex rounded-[10px] border border-white/[0.12] px-2.5 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.06] transition">
                  Open Feed
                </Link>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Fee Information" subtitle="Invoice status and reminders">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Stat label="Invoiced" value={centsToUsd(totalInvoicedCents)} tone="text-white/90" />
            <Stat label="Paid" value={centsToUsd(totalPaidCents)} tone="text-emerald-300" />
            <Stat label="Pending" value={centsToUsd(totalPendingCents)} tone={totalPendingCents > 0 ? "text-amber-300" : "text-white/70"} />
          </div>

          {canSendFeeReminder && totalPendingCents > 0 && (
            <form action={sendStudentFeeReminderAction} className="mb-4">
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="returnTo" value={withAcademicYearParam(`/students/${student.id}`, selectedYear.id)} />
              <input type="hidden" name="academicYearId" value={selectedYear.id} />
              <Button type="submit" size="sm" variant="secondary">Send Fee Reminder</Button>
            </form>
          )}

          {pendingFeeRows.length === 0 ? (
            <p className="text-sm text-white/50">No pending fee invoices.</p>
          ) : (
            <div className="space-y-2">
              {pendingFeeRows.slice(0, 6).map((row) => (
                <Link
                  key={row.id}
                  href={withAcademicYearParam(`/fees/${row.id}`, selectedYear.id)}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white/88">{row.title}</p>
                    <p className="text-[12px] text-white/45">{row.status} · Created {row.createdAt.toDateString()}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-amber-300">{centsToUsd(row.pendingCents)}</p>
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[14px] font-semibold text-white/94">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[12px] text-white/45">{subtitle}</p> : null}
        </div>
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/45">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
          <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-white/[0.07] px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[14px] text-white/80 break-words">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p className={`mt-1 text-[16px] font-bold ${tone}`}>{value}</p>
    </div>
  );
}
