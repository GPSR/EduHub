import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/db";
import { getSchoolIdCardTemplate } from "@/lib/id-card-template";
import { getSchoolProfile } from "@/lib/school-profile";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function barcodePattern(value: string) {
  const source = (value || "ID0000").toUpperCase();
  return source.split("").map((char, index) => ((char.charCodeAt(0) + index) % 4) + 1);
}

export default async function StudentVirtualIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("STUDENTS", "VIEW");
  const session = await requireSession();
  const { id } = await params;

  const [student, school, template, schoolProfile] = await Promise.all([
    prisma.student.findFirst({
      where:
        session.roleKey === "PARENT"
          ? { id, schoolId: session.schoolId, parents: { some: { userId: session.userId } } }
          : { id, schoolId: session.schoolId },
      include: { class: true }
    }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { name: true, brandingLogoUrl: true } }),
    getSchoolIdCardTemplate(session.schoolId),
    getSchoolProfile(session.schoolId)
  ]);

  if (!student || !school) return notFound();

  const classLabel = student.class ? `${student.class.name}${student.class.section ? `-${student.class.section}` : ""}` : "—";
  const showSchoolLabel = template.schoolLabel.trim().toLowerCase() !== school.name.trim().toLowerCase();
  const footerText = schoolProfile.address || template.footerText;
  const issueDate = student.joiningDate ?? student.createdAt;
  const validTill = new Date(issueDate);
  validTill.setFullYear(validTill.getFullYear() + 1);
  const parentName = student.fatherName ?? student.motherName ?? "—";
  const parentContact = student.parentMobiles ?? student.parentEmails ?? "—";
  const guardianContact = student.guardianMobile ?? student.guardianAltContact ?? "—";

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href={`/students/${student.id}`} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Back to student
      </Link>

      <div className="mx-auto max-w-[860px]">
        <div
          className="relative overflow-hidden rounded-[26px] border p-5 sm:p-6 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.95)]"
          style={{ background: template.background, borderColor: "rgba(255,255,255,0.24)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_48%,rgba(0,0,0,0.18))]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: template.accent }} />
          <div className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full blur-3xl opacity-20" style={{ background: template.accent }} />

          <div className="relative" style={{ color: template.textColor }}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
              <div className="flex min-w-0 items-center gap-3">
                {school.brandingLogoUrl ? (
                  <Image
                    src={school.brandingLogoUrl}
                    alt={school.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-[12px] object-cover border border-white/30"
                  />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-[12px] border border-white/30 text-sm font-bold">
                    {initials(school.name)}
                  </div>
                )}
                <div className="min-w-0">
                  {showSchoolLabel ? (
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: template.accent }}>
                      {template.schoolLabel}
                    </p>
                  ) : null}
                  <p className="truncate text-[17px] font-semibold leading-tight">{school.name}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] opacity-70">{template.headerText}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="grid h-9 w-12 place-items-center rounded-[9px] border text-[9px] font-semibold uppercase tracking-[0.12em]"
                  style={{ borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.14)" }}
                >
                  CHIP
                </div>
                <div
                  className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ borderColor: "rgba(255,255,255,0.28)" }}
                >
                  Student Card
                </div>
              </div>
            </div>

            <div className={template.showPhoto ? "mt-5 grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]" : "mt-5"}>
              {template.showPhoto ? (
                <div className="rounded-[16px] border p-2.5 backdrop-blur-sm" style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(0,0,0,0.18)" }}>
                  {student.photoUrl ? (
                    <Image
                      src={student.photoUrl}
                      alt={student.fullName}
                      width={160}
                      height={190}
                      className="h-[190px] w-full rounded-[12px] object-cover border border-white/20"
                    />
                  ) : (
                    <div className="grid h-[190px] w-full place-items-center rounded-[12px] border border-white/20 text-4xl font-bold">
                      {initials(student.fullName)}
                    </div>
                  )}
                  <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">Card Holder</p>
                </div>
              ) : null}

              <div className="rounded-[16px] border p-4 backdrop-blur-sm" style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(0,0,0,0.18)" }}>
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-65">Student Name</p>
                <h2 className="mt-1 text-[23px] font-bold leading-tight">{student.fullName}</h2>

                <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <InfoLine label="Student ID" value={student.studentId} />
                  <InfoLine label="Admission No" value={student.admissionNo ?? "—"} />
                  <InfoLine label="Class / Section" value={classLabel} />
                  <InfoLine label="Roll Number" value={student.rollNumber ?? "—"} />
                  <InfoLine label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                  <InfoLine label="Gender" value={student.gender ?? "—"} />
                  <InfoLine label="Blood Group" value={student.bloodGroup ?? "—"} />
                  <InfoLine label="Medical Notes" value={student.medicalNotes ?? "—"} />
                </div>
              </div>
            </div>

            {(template.showParent || template.showGuardian) && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {template.showParent ? (
                  <ContactBlock
                    title="Parent Contact"
                    line1={parentName}
                    line2={parentContact}
                    line3={student.parentAddress ?? student.address ?? "—"}
                  />
                ) : null}
                {template.showGuardian ? (
                  <ContactBlock
                    title="Guardian Contact"
                    line1={student.guardianName ?? "—"}
                    line2={guardianContact}
                    line3={student.guardianRelationship ?? "—"}
                  />
                ) : null}
              </div>
            )}

            <div className="mt-4 rounded-[14px] border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(0,0,0,0.24)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="h-9 w-full overflow-hidden rounded-[6px] border border-white/20 px-2 py-1">
                    <div className="flex h-full items-end gap-[2px]" style={{ color: template.accent }}>
                      {barcodePattern(student.studentId).map((width, index) => (
                        <span
                          key={`${width}-${index}`}
                          className="inline-block h-full rounded-[1px] bg-current opacity-95"
                          style={{ width: `${width * 3}px`, height: index % 2 === 0 ? "100%" : "75%" }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.24em] opacity-75">{student.studentId}</p>
                </div>
                <div className="text-[11px] leading-relaxed sm:text-right">
                  <p>
                    <span className="opacity-65">Issued:</span> {formatDate(issueDate)}
                  </p>
                  <p>
                    <span className="opacity-65">Valid Till:</span> {formatDate(validTill)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t pt-3 text-[11px] sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
              <p className="opacity-80">{footerText || "—"}</p>
              <div className="text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] opacity-65">Authorized Signatory</p>
                <p className="mt-1 text-[12px] font-semibold">{school.name}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-white/45">
          Digital student identity card. Verify with school administration for official use.
        </p>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] opacity-60">{label}</p>
      <p className="truncate text-[13px] font-semibold">{value}</p>
    </div>
  );
}

function ContactBlock({
  title,
  line1,
  line2,
  line3
}: {
  title: string;
  line1: string;
  line2: string;
  line3: string;
}) {
  return (
    <div className="rounded-[13px] border px-3.5 py-3 backdrop-blur-sm" style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(0,0,0,0.22)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-65">{title}</p>
      <p className="mt-1 text-[13px] font-semibold break-words">{line1}</p>
      <p className="text-[12px] break-words opacity-85">{line2}</p>
      <p className="text-[11px] break-words opacity-70">{line3}</p>
    </div>
  );
}
