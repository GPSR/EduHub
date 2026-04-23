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

  return (
    <div className="space-y-5 animate-fade-up">
      <Link href={`/students/${student.id}`} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
        ← Back to student
      </Link>

      <div className="rounded-[22px] border border-white/[0.10] p-6 max-w-[780px] mx-auto" style={{ background: template.background }}>
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
          <div className="flex items-center gap-3 min-w-0">
            {school.brandingLogoUrl ? (
              <Image src={school.brandingLogoUrl} alt={school.name} width={48} height={48} className="h-12 w-12 rounded-[10px] object-cover border border-white/20" />
            ) : (
              <div className="h-12 w-12 rounded-[10px] grid place-items-center text-xs font-bold text-white/90 border border-white/25">{initials(school.name)}</div>
            )}
            <div className="min-w-0">
              {showSchoolLabel ? (
                <p className="text-[12px] uppercase tracking-wider" style={{ color: template.accent }}>{template.schoolLabel}</p>
              ) : null}
              <p className="text-[15px] font-semibold truncate" style={{ color: template.textColor }}>{school.name}</p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full border" style={{ color: template.textColor, borderColor: "rgba(255,255,255,0.28)" }}>
            {template.headerText}
          </span>
        </div>

        <div className="pt-5 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-5">
          <div>
            {template.showPhoto && student.photoUrl ? (
              <Image src={student.photoUrl} alt={student.fullName} width={120} height={140} className="h-[140px] w-[120px] rounded-[12px] object-cover border border-white/20" />
            ) : template.showPhoto ? (
              <div className="h-[140px] w-[120px] rounded-[12px] grid place-items-center text-2xl font-bold border border-white/20" style={{ color: template.textColor }}>
                {initials(student.fullName)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Student Name" value={student.fullName} color={template.textColor} />
            <Field label="Student ID" value={student.studentId} color={template.textColor} />
            <Field label="Admission No" value={student.admissionNo ?? "—"} color={template.textColor} />
            <Field label="Class" value={classLabel} color={template.textColor} />
            <Field label="Roll No" value={student.rollNumber ?? "—"} color={template.textColor} />
            <Field label="DOB" value={student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : "—"} color={template.textColor} />
            {template.showParent ? <Field label="Parent Name" value={student.fatherName ?? "—"} color={template.textColor} /> : null}
            {template.showParent ? <Field label="Parent Mobile" value={student.parentMobiles ?? "—"} color={template.textColor} /> : null}
            {template.showParent ? <Field label="Parent Email" value={student.parentEmails ?? "—"} color={template.textColor} /> : null}
            {template.showGuardian ? <Field label="Guardian" value={student.guardianName ?? "—"} color={template.textColor} /> : null}
            {template.showGuardian ? <Field label="Guardian Mobile" value={student.guardianMobile ?? "—"} color={template.textColor} /> : null}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t text-[11px]" style={{ borderColor: "rgba(255,255,255,0.18)", color: template.textColor }}>
          {footerText || "—"}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-white/20 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="text-[13px] font-medium break-words" style={{ color }}>{value}</p>
    </div>
  );
}
