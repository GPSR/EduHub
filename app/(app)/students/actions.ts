"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formatSchoolId } from "@/lib/id-sequence";
import { auditLog } from "@/lib/audit";
import { clearUserProfileImages, deleteUploadedImageByUrl, saveUploadedImage, saveUserProfileImage } from "@/lib/uploads";
import { ensureActiveAcademicYearForSchool, withAcademicYearParam } from "@/lib/academic-year";
import { randomToken } from "@/lib/token";
import { resolveSchoolAppBaseUrl } from "@/lib/app-env";
import { sendTransactionalEmail } from "@/lib/mailer";

const StudentCreateSchema = z.object({
  fullName: z.string().min(2),
  classId: z.string().optional(),
  className: z.string().optional(),
  section: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().min(2),
  parentMobile: z.string().regex(/^\+?[0-9][0-9()\-\s]{6,19}$/).optional(),
  parentEmail: z.string().email().optional(),
  transportDetails: z.string().optional(),
  medicalNotes: z.string().optional()
});

const StudentUpdateSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().optional(),
  admissionNo: z.string().optional(),
  fullName: z.string().optional(),
  className: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  transportDetails: z.string().optional(),
  medicalNotes: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  parentMobiles: z.string().optional(),
  parentEmails: z.string().optional(),
  parentOccupation: z.string().optional(),
  parentAddress: z.string().optional(),
  emergencyContact: z.string().optional(),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  guardianMobile: z.string().optional(),
  guardianAltContact: z.string().optional(),
  guardianAddress: z.string().optional(),
  pickupAuthDetails: z.string().optional()
});

const StudentProgressionSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  outcome: z.enum(["NEXT_CLASS", "SAME_CLASS", "INACTIVE"]),
  returnTo: z.string().optional()
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isParentRole(roleKey?: string | null) {
  const normalized = String(roleKey ?? "").trim().toUpperCase();
  return normalized === "PARENT" || normalized.startsWith("PARENT_");
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildParentEnrollmentInviteEmail(args: {
  schoolName: string;
  studentName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const schoolName = escapeHtml(args.schoolName);
  const studentName = escapeHtml(args.studentName);
  const inviteUrl = escapeHtml(args.inviteUrl);
  const expiresText = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(args.expiresAt);

  const subject = `Parent Enrollment Invite | ${args.schoolName}`;
  const text = [
    `You are invited to enroll in EduHub for ${args.schoolName}.`,
    "",
    `Student: ${args.studentName}`,
    "Create your parent account using this secure link:",
    args.inviteUrl,
    "",
    `This invite expires on ${expiresText}.`,
    "If you did not expect this invitation, you can ignore this email."
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:620px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">Welcome to EduHub</h2>
    <p style="margin:0 0 12px;">You are invited to enroll in <strong>${schoolName}</strong> as a parent user.</p>
    <p style="margin:0 0 12px;"><strong>Student:</strong> ${studentName}</p>
    <p style="margin:0 0 16px;">Use the secure link below to create your parent account:</p>
    <p style="margin:0 0 20px;">
      <a href="${inviteUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
        Enroll Parent Account
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#334155;">Or copy this URL:</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;color:#1e3a8a;">${inviteUrl}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#334155;">This invite expires on <strong>${escapeHtml(expiresText)}</strong>.</p>
    <p style="margin:0;font-size:12px;color:#64748b;">If you did not expect this invitation, you can ignore this email.</p>
  </div>`;

  return { subject, text, html };
}

async function ensureParentEnrollmentAccessForStudent(args: {
  schoolId: string;
  actorUserId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  parentEmail: string;
}) {
  const normalizedParentEmail = normalizeEmail(args.parentEmail);
  if (!normalizedParentEmail) return;

  try {
    const existingUser = await db.user.findFirst({
      where: { schoolId: args.schoolId, email: normalizedParentEmail },
      select: { id: true, schoolRole: { select: { key: true } } }
    });

    if (existingUser) {
      if (isParentRole(existingUser.schoolRole.key)) {
        await db.studentParent.createMany({
          data: [
            {
              schoolId: args.schoolId,
              studentId: args.studentId,
              userId: existingUser.id,
              relation: "Parent"
            }
          ],
          skipDuplicates: true
        });
        await auditLog({
          actor: { type: "SCHOOL_USER", id: args.actorUserId, schoolId: args.schoolId },
          action: "STUDENT_PARENT_LINKED_TO_EXISTING_PARENT_USER",
          entityType: "Student",
          entityId: args.studentId,
          metadata: { parentEmail: normalizedParentEmail, existingUserId: existingUser.id }
        });
      } else {
        await auditLog({
          actor: { type: "SCHOOL_USER", id: args.actorUserId, schoolId: args.schoolId },
          action: "STUDENT_PARENT_INVITE_SKIPPED_EMAIL_ALREADY_IN_USE",
          entityType: "Student",
          entityId: args.studentId,
          metadata: { parentEmail: normalizedParentEmail, existingUserRole: existingUser.schoolRole.key }
        });
      }
      return;
    }

    const parentRole = await db.schoolRole.findFirst({
      where: { schoolId: args.schoolId, key: "PARENT" },
      select: { id: true }
    });
    if (!parentRole) {
      await auditLog({
        actor: { type: "SCHOOL_USER", id: args.actorUserId, schoolId: args.schoolId },
        action: "STUDENT_PARENT_INVITE_SKIPPED_ROLE_MISSING",
        entityType: "Student",
        entityId: args.studentId,
        metadata: { parentEmail: normalizedParentEmail }
      });
      return;
    }

    const token = randomToken(24);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.schoolInvite.create({
      data: {
        schoolId: args.schoolId,
        email: normalizedParentEmail,
        schoolRoleId: parentRole.id,
        token,
        expiresAt
      }
    });

    const inviteUrl = `${resolveSchoolAppBaseUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
    const mail = buildParentEnrollmentInviteEmail({
      schoolName: args.schoolName,
      studentName: args.studentName,
      inviteUrl,
      expiresAt
    });
    const emailResult = await sendTransactionalEmail({
      to: normalizedParentEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });

    await auditLog({
      actor: { type: "SCHOOL_USER", id: args.actorUserId, schoolId: args.schoolId },
      action: "STUDENT_PARENT_ENROLLMENT_INVITE_CREATED",
      entityType: "Student",
      entityId: args.studentId,
      metadata: {
        parentEmail: normalizedParentEmail,
        emailSent: emailResult.sent,
        emailReason: "reason" in emailResult ? emailResult.reason : null
      }
    });
  } catch (error) {
    await auditLog({
      actor: { type: "SCHOOL_USER", id: args.actorUserId, schoolId: args.schoolId },
      action: "STUDENT_PARENT_ENROLLMENT_INVITE_FAILED",
      entityType: "Student",
      entityId: args.studentId,
      metadata: {
        parentEmail: normalizedParentEmail,
        error: error instanceof Error ? error.message : "invite_send_failed"
      }
    });
  }
}

export async function createStudentAction(formData: FormData) {
  const { session } = await requirePermission("STUDENTS", "EDIT");
  const activeYear = await ensureActiveAcademicYearForSchool(session.schoolId);
  const parentMobile = String(formData.get("parentMobile") ?? "").trim() || undefined;
  const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase() || undefined;
  const totalFeeRaw = String(formData.get("totalFee") ?? "").trim();
  let totalFeeCents: number | null = null;

  if (totalFeeRaw.length > 0) {
    const totalFeeAmount = Number(totalFeeRaw);
    if (!Number.isFinite(totalFeeAmount) || totalFeeAmount <= 0) {
      redirect("/students/new?error=totalFeeInvalid");
    }
    totalFeeCents = Math.round(totalFeeAmount * 100);
    if (!Number.isFinite(totalFeeCents) || totalFeeCents <= 0) {
      redirect("/students/new?error=totalFeeInvalid");
    }
  }

  if (!parentMobile && !parentEmail) {
    redirect("/students/new?error=parentContactRequired");
  }

  const parsed = StudentCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    classId: String(formData.get("classId") ?? "").trim() || undefined,
    className: formData.get("className") || undefined,
    section: formData.get("section") || undefined,
    gender: String(formData.get("gender") ?? "").trim() || undefined,
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || undefined,
    bloodGroup: String(formData.get("bloodGroup") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    parentName: String(formData.get("parentName") ?? "").trim() || undefined,
    parentMobile,
    parentEmail,
    transportDetails: String(formData.get("transportDetails") ?? "").trim() || undefined,
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim() || undefined
  });
  if (!parsed.success) {
    const firstPath = String(parsed.error.issues[0]?.path?.[0] ?? "");
    if (firstPath === "parentName") redirect("/students/new?error=parentNameRequired");
    if (firstPath === "parentMobile") redirect("/students/new?error=parentMobileInvalid");
    if (firstPath === "parentEmail") redirect("/students/new?error=parentEmailInvalid");
    throw new Error("Unable to process request.");
  }

  let classId: string | null = null;
  if (parsed.data.classId) {
    const cls = await db.class.findFirst({
      where: { id: parsed.data.classId, schoolId: session.schoolId },
      select: { id: true }
    });
    classId = cls?.id ?? null;
  } else if (parsed.data.className) {
    const cls = await db.class.upsert({
      where: {
        schoolId_name_section: {
          schoolId: session.schoolId,
          name: parsed.data.className,
          section: parsed.data.section ?? ""
        }
      },
      update: {},
      create: {
        schoolId: session.schoolId,
        name: parsed.data.className,
        section: parsed.data.section ?? ""
      }
    });
    classId = cls.id;
  }

  const created = await db.$transaction(async (tx) => {
    const school = await tx.school.findUnique({ where: { id: session.schoolId } });
    if (!school) throw new Error("Unable to process request.");

    const studentId = formatSchoolId({ school, format: school.studentIdFormat, seq: school.studentIdNext });
    const admissionNo = formatSchoolId({ school, format: school.admissionNoFormat, seq: school.admissionNoNext });

    await tx.school.update({
      where: { id: school.id },
      data: {
        studentIdNext: { increment: 1 },
        admissionNoNext: { increment: 1 }
      }
    });

    let rollNumber: string | undefined;
    if (classId) {
      const classStrength = await tx.student.count({ where: { schoolId: session.schoolId, classId } });
      rollNumber = String(classStrength + 1);
    }

    const createdStudent = await tx.student.create({
      data: {
        schoolId: session.schoolId,
        studentId,
        fullName: parsed.data.fullName,
        admissionNo,
        rollNumber,
        classId,
        gender: parsed.data.gender || undefined,
        dateOfBirth: parseDateInput(parsed.data.dateOfBirth ?? null),
        bloodGroup: parsed.data.bloodGroup || undefined,
        address: parsed.data.address || undefined,
        fatherName: parsed.data.parentName || undefined,
        parentMobiles: parsed.data.parentMobile || undefined,
        parentEmails: parsed.data.parentEmail || undefined,
        transportDetails: parsed.data.transportDetails || undefined,
        medicalNotes: parsed.data.medicalNotes || undefined
      }
    });

    await tx.studentAcademicYear.upsert({
      where: {
        academicYearId_studentId: {
          academicYearId: activeYear.id,
          studentId: createdStudent.id
        }
      },
      update: {
        classId,
        rollNumber: createdStudent.rollNumber,
        status: "ACTIVE",
        graduatedAt: null,
        promotedAt: null
      },
      create: {
        schoolId: session.schoolId,
        academicYearId: activeYear.id,
        studentId: createdStudent.id,
        classId,
        rollNumber: createdStudent.rollNumber,
        status: "ACTIVE"
      }
    });

    if (session.roleKey === "ADMIN" && totalFeeCents !== null) {
      await tx.feeInvoice.create({
        data: {
          schoolId: session.schoolId,
          academicYearId: activeYear.id,
          studentId: createdStudent.id,
          title: `Total Fee - ${activeYear.name}`,
          amountCents: totalFeeCents,
          dueOn: null
        }
      });
    }

    return { student: createdStudent, schoolName: school.name };
  });

  if (parsed.data.parentEmail) {
    await ensureParentEnrollmentAccessForStudent({
      schoolId: session.schoolId,
      actorUserId: session.userId,
      schoolName: created.schoolName,
      studentId: created.student.id,
      studentName: created.student.fullName,
      parentEmail: parsed.data.parentEmail
    });
  }

  redirect(`/students/${created.student.id}`);
}

function normalizeOptional(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  return v.length ? v : null;
}

function parseDateInput(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstCsvValue(value?: string | null) {
  if (!value) return null;
  const first = value
    .split(",")
    .map((item) => item.trim())
    .find((item) => item.length > 0);
  return first ?? null;
}

function safeReturnPath(value: FormDataEntryValue | string | null | undefined, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

function withQuery(path: string, key: string, value: string) {
  const glue = path.includes("?") ? "&" : "?";
  return `${path}${glue}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function classComparator(a: { name: string; section: string }, b: { name: string; section: string }) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const byName = collator.compare(a.name, b.name);
  if (byName !== 0) return byName;
  return collator.compare(a.section, b.section);
}

export async function updateStudentProgressionAction(formData: FormData) {
  const { session } = await requirePermission("STUDENTS", "EDIT");
  if (session.roleKey !== "ADMIN") throw new Error("Only school admin can update student progression.");

  const parsed = StudentProgressionSchema.safeParse({
    studentId: String(formData.get("studentId") ?? "").trim(),
    academicYearId: String(formData.get("academicYearId") ?? "").trim(),
    outcome: String(formData.get("outcome") ?? "").trim(),
    returnTo: String(formData.get("returnTo") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to update student progression.");

  const defaultReturn = withAcademicYearParam(`/students/${parsed.data.studentId}`, parsed.data.academicYearId);
  const returnTo = safeReturnPath(parsed.data.returnTo, defaultReturn);

  const [student, year] = await Promise.all([
    db.student.findFirst({
      where: { id: parsed.data.studentId, schoolId: session.schoolId },
      select: { id: true, fullName: true, classId: true, rollNumber: true }
    }),
    db.academicYear.findFirst({
      where: { id: parsed.data.academicYearId, schoolId: session.schoolId },
      select: { id: true, name: true, status: true, isActive: true }
    })
  ]);
  if (!student || !year) throw new Error("Unable to process request.");

  if (year.status === "CLOSED") {
    redirect(withQuery(returnTo, "promotion", "yearLocked"));
  }
  if (!year.isActive) {
    redirect(withQuery(returnTo, "promotion", "yearNotActive"));
  }

  const currentYearRow = await db.studentAcademicYear.findUnique({
    where: {
      academicYearId_studentId: {
        academicYearId: year.id,
        studentId: student.id
      }
    },
    select: { classId: true, rollNumber: true }
  });

  const currentClassId = currentYearRow?.classId ?? student.classId ?? null;
  const currentRollNumber = currentYearRow?.rollNumber ?? student.rollNumber ?? null;
  let nextClassId = currentClassId;
  let nextRollNumber = currentRollNumber;
  let status: "ACTIVE" | "GRADUATED" = "ACTIVE";
  let promotedAt: Date | null = null;
  let graduatedAt: Date | null = null;
  let resultKey: "next" | "same" | "inactive" = "same";

  if (parsed.data.outcome === "NEXT_CLASS") {
    if (!currentClassId) {
      redirect(withQuery(returnTo, "promotion", "noNextClass"));
    }
    const classes = await db.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, section: true }
    });
    const sortedClasses = [...classes].sort(classComparator);
    const currentIndex = sortedClasses.findIndex((row) => row.id === currentClassId);
    if (currentIndex < 0 || currentIndex >= sortedClasses.length - 1) {
      redirect(withQuery(returnTo, "promotion", "noNextClass"));
    }
    nextClassId = sortedClasses[currentIndex + 1].id;
    const nextClassStrength = await db.student.count({
      where: { schoolId: session.schoolId, classId: nextClassId, id: { not: student.id } }
    });
    nextRollNumber = String(nextClassStrength + 1);
    promotedAt = new Date();
    resultKey = "next";
  } else if (parsed.data.outcome === "SAME_CLASS") {
    if (nextClassId && !nextRollNumber) {
      const classStrength = await db.student.count({
        where: { schoolId: session.schoolId, classId: nextClassId, id: { not: student.id } }
      });
      nextRollNumber = String(classStrength + 1);
    }
    resultKey = "same";
  } else {
    nextClassId = null;
    nextRollNumber = null;
    status = "GRADUATED";
    graduatedAt = new Date();
    resultKey = "inactive";
  }

  await db.$transaction(async (tx) => {
    await tx.studentAcademicYear.upsert({
      where: {
        academicYearId_studentId: {
          academicYearId: year.id,
          studentId: student.id
        }
      },
      update: {
        classId: nextClassId,
        rollNumber: nextRollNumber,
        status,
        promotedAt,
        graduatedAt
      },
      create: {
        schoolId: session.schoolId,
        academicYearId: year.id,
        studentId: student.id,
        classId: nextClassId,
        rollNumber: nextRollNumber,
        status,
        promotedAt,
        graduatedAt
      }
    });

    await tx.student.update({
      where: { id: student.id },
      data: {
        classId: nextClassId,
        rollNumber: nextRollNumber
      }
    });
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: "STUDENT_PROGRESSION_UPDATED",
    entityType: "Student",
    entityId: student.id,
    schoolId: session.schoolId,
    metadata: {
      academicYearId: year.id,
      academicYearName: year.name,
      outcome: parsed.data.outcome,
      updatedClassId: nextClassId
    }
  });

  redirect(withQuery(returnTo, "promotion", resultKey));
}

export async function updateStudentAction(formData: FormData) {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canEditStudents = session.roleKey === "ADMIN" || (perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false);

  const parsed = StudentUpdateSchema.safeParse({
    id: formData.get("id"),
    studentId: String(formData.get("studentId") ?? "").trim() || undefined,
    admissionNo: String(formData.get("admissionNo") ?? "").trim() || undefined,
    fullName: String(formData.get("fullName") ?? "").trim() || undefined,
    className: String(formData.get("className") ?? "").trim() || undefined,
    section: String(formData.get("section") ?? "").trim() || undefined,
    rollNumber: String(formData.get("rollNumber") ?? "").trim() || undefined,
    gender: String(formData.get("gender") ?? "").trim() || undefined,
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || undefined,
    bloodGroup: String(formData.get("bloodGroup") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    transportDetails: String(formData.get("transportDetails") ?? "").trim() || undefined,
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim() || undefined,
    fatherName: String(formData.get("fatherName") ?? "").trim() || undefined,
    motherName: String(formData.get("motherName") ?? "").trim() || undefined,
    parentMobiles: String(formData.get("parentMobiles") ?? "").trim() || undefined,
    parentEmails: String(formData.get("parentEmails") ?? "").trim() || undefined,
    parentOccupation: String(formData.get("parentOccupation") ?? "").trim() || undefined,
    parentAddress: String(formData.get("parentAddress") ?? "").trim() || undefined,
    emergencyContact: String(formData.get("emergencyContact") ?? "").trim() || undefined,
    guardianName: String(formData.get("guardianName") ?? "").trim() || undefined,
    guardianRelationship: String(formData.get("guardianRelationship") ?? "").trim() || undefined,
    guardianMobile: String(formData.get("guardianMobile") ?? "").trim() || undefined,
    guardianAltContact: String(formData.get("guardianAltContact") ?? "").trim() || undefined,
    guardianAddress: String(formData.get("guardianAddress") ?? "").trim() || undefined,
    pickupAuthDetails: String(formData.get("pickupAuthDetails") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to update student.");

  const existing = await db.student.findFirst({
    where:
      canEditStudents
        ? { id: parsed.data.id, schoolId: session.schoolId }
        : {
            id: parsed.data.id,
            schoolId: session.schoolId,
            parents: { some: { userId: session.userId } }
          },
    select: {
      id: true,
      studentId: true,
      admissionNo: true,
      fullName: true,
      classId: true,
      rollNumber: true,
      gender: true,
      dateOfBirth: true,
      bloodGroup: true,
      address: true,
      transportDetails: true,
      medicalNotes: true,
      fatherName: true,
      motherName: true,
      parentMobiles: true,
      parentEmails: true,
      parentOccupation: true,
      parentAddress: true,
      emergencyContact: true,
      guardianName: true,
      guardianRelationship: true,
      guardianMobile: true,
      guardianAltContact: true,
      guardianAddress: true,
      pickupAuthDetails: true
    }
  });
  if (!existing) redirect("/students");

  let classId: string | null = existing.classId;
  if (canEditStudents) {
    if (parsed.data.className) {
      const cls = await db.class.upsert({
        where: {
          schoolId_name_section: {
            schoolId: session.schoolId,
            name: parsed.data.className,
            section: parsed.data.section ?? ""
          }
        },
        update: {},
        create: {
          schoolId: session.schoolId,
          name: parsed.data.className,
          section: parsed.data.section ?? ""
        }
      });
      classId = cls.id;
    } else {
      classId = null;
    }
  }

  let rollNumber = existing.rollNumber ?? undefined;
  if (canEditStudents && !rollNumber && classId) {
    const classStrength = await db.student.count({
      where: { schoolId: session.schoolId, classId, id: { not: existing.id } }
    });
    rollNumber = String(classStrength + 1);
  }

  const useStudentAddressForParent = Boolean(formData.get("parentAddressSameAsStudent"));
  const parentAddressValue = useStudentAddressForParent
    ? (canEditStudents
        ? (normalizeOptional(formData.get("address")) ?? existing.address ?? null)
        : (existing.address ?? null))
    : normalizeOptional(formData.get("parentAddress"));

  const updated = await db.student.update({
    where: { id: parsed.data.id },
    data: {
      // Identity + academic fields are admin-controlled.
      studentId: existing.studentId,
      admissionNo: existing.admissionNo,
      fullName: canEditStudents ? (parsed.data.fullName ?? existing.fullName) : existing.fullName,
      classId: canEditStudents ? classId : existing.classId,
      rollNumber: canEditStudents ? (rollNumber ?? null) : existing.rollNumber,
      gender: canEditStudents ? normalizeOptional(formData.get("gender")) : undefined,
      dateOfBirth: canEditStudents ? parseDateInput(normalizeOptional(formData.get("dateOfBirth"))) : undefined,
      bloodGroup: canEditStudents ? normalizeOptional(formData.get("bloodGroup")) : undefined,
      address: canEditStudents ? normalizeOptional(formData.get("address")) : undefined,
      transportDetails: canEditStudents ? normalizeOptional(formData.get("transportDetails")) : undefined,
      medicalNotes: canEditStudents ? normalizeOptional(formData.get("medicalNotes")) : undefined,
      fatherName: normalizeOptional(formData.get("fatherName")),
      motherName: normalizeOptional(formData.get("motherName")),
      parentMobiles: normalizeOptional(formData.get("parentMobiles")),
      parentEmails: normalizeOptional(formData.get("parentEmails")),
      parentOccupation: normalizeOptional(formData.get("parentOccupation")),
      parentAddress: parentAddressValue,
      emergencyContact: normalizeOptional(formData.get("emergencyContact")),
      guardianName: normalizeOptional(formData.get("guardianName")),
      guardianRelationship: normalizeOptional(formData.get("guardianRelationship")),
      guardianMobile: normalizeOptional(formData.get("guardianMobile")),
      guardianAltContact: normalizeOptional(formData.get("guardianAltContact")),
      guardianAddress: normalizeOptional(formData.get("guardianAddress")),
      pickupAuthDetails: normalizeOptional(formData.get("pickupAuthDetails"))
    },
    select: {
      id: true,
      fullName: true,
      classId: true,
      rollNumber: true,
      gender: true,
      dateOfBirth: true,
      bloodGroup: true,
      address: true,
      transportDetails: true,
      medicalNotes: true,
      fatherName: true,
      motherName: true,
      parentMobiles: true,
      parentEmails: true,
      parentOccupation: true,
      parentAddress: true,
      emergencyContact: true,
      guardianName: true,
      guardianRelationship: true,
      guardianMobile: true,
      guardianAltContact: true,
      guardianAddress: true,
      pickupAuthDetails: true
    }
  });

  if (canEditStudents) {
    const activeYear = await ensureActiveAcademicYearForSchool(session.schoolId);
    await db.studentAcademicYear.upsert({
      where: {
        academicYearId_studentId: {
          academicYearId: activeYear.id,
          studentId: existing.id
        }
      },
      update: {
        classId,
        rollNumber: updated.rollNumber ?? null
      },
      create: {
        schoolId: session.schoolId,
        academicYearId: activeYear.id,
        studentId: existing.id,
        classId,
        rollNumber: updated.rollNumber ?? null,
        status: "ACTIVE"
      }
    });
  }

  if (!canEditStudents && session.roleKey === "PARENT") {
    await db.user.update({
      where: { id: session.userId },
      data: {
        phoneNumber: firstCsvValue(updated.parentMobiles),
        address: updated.parentAddress,
        emergencyContactPhone: updated.emergencyContact
      }
    });
  }

  const changed: Record<string, { before: string; after: string }> = {};
  const toAuditString = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  };
  const track = (key: string, before: unknown, after: unknown) => {
    const beforeStr = toAuditString(before);
    const afterStr = toAuditString(after);
    if (beforeStr !== afterStr) changed[key] = { before: beforeStr, after: afterStr };
  };

  track("fullName", existing.fullName, updated.fullName);
  track("classId", existing.classId, updated.classId);
  track("rollNumber", existing.rollNumber, updated.rollNumber);
  track("gender", existing.gender, updated.gender);
  track("dateOfBirth", existing.dateOfBirth, updated.dateOfBirth);
  track("bloodGroup", existing.bloodGroup, updated.bloodGroup);
  track("address", existing.address, updated.address);
  track("transportDetails", existing.transportDetails, updated.transportDetails);
  track("medicalNotes", existing.medicalNotes, updated.medicalNotes);
  track("fatherName", existing.fatherName, updated.fatherName);
  track("motherName", existing.motherName, updated.motherName);
  track("parentMobiles", existing.parentMobiles, updated.parentMobiles);
  track("parentEmails", existing.parentEmails, updated.parentEmails);
  track("parentOccupation", existing.parentOccupation, updated.parentOccupation);
  track("parentAddress", existing.parentAddress, updated.parentAddress);
  track("emergencyContact", existing.emergencyContact, updated.emergencyContact);
  track("guardianName", existing.guardianName, updated.guardianName);
  track("guardianRelationship", existing.guardianRelationship, updated.guardianRelationship);
  track("guardianMobile", existing.guardianMobile, updated.guardianMobile);
  track("guardianAltContact", existing.guardianAltContact, updated.guardianAltContact);
  track("guardianAddress", existing.guardianAddress, updated.guardianAddress);
  track("pickupAuthDetails", existing.pickupAuthDetails, updated.pickupAuthDetails);

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    action: canEditStudents ? "STUDENT_UPDATED" : "STUDENT_PARENT_DETAILS_UPDATED",
    entityType: "Student",
    entityId: updated.id,
    schoolId: session.schoolId,
    metadata: {
      studentName: updated.fullName,
      updatedByRole: session.roleKey,
      changedFields: Object.keys(changed),
      changes: changed
    }
  });

  redirect(`/students/${parsed.data.id}`);
}

export async function uploadStudentPhotoAction(formData: FormData) {
  const session = await requireSession();
  const studentId = String(formData.get("id") ?? "").trim();
  const file = formData.get("photo");
  if (!studentId || !(file instanceof File)) redirect("/students");

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canEditStudents = session.roleKey === "ADMIN" || (perms["STUDENTS"] ? atLeastLevel(perms["STUDENTS"], "EDIT") : false);

  const student = await db.student.findFirst({
    where: canEditStudents
      ? { id: studentId, schoolId: session.schoolId }
      : {
          id: studentId,
          schoolId: session.schoolId,
          parents: { some: { userId: session.userId } }
        },
    select: { id: true, photoUrl: true }
  });
  if (!student) redirect("/students");
  const returnTo = safeReturnPath(formData.get("returnTo"), `/students/${student.id}/edit`);

  const saved = await saveUploadedImage({
    file,
    folder: `schools/${session.schoolId}/students/${student.id}`,
    prefix: "student-photo"
  });
  if (!saved.ok) redirect(withQuery(returnTo, "photoError", "1"));

  await db.student.update({
    where: { id: student.id },
    data: { photoUrl: saved.url }
  });
  await deleteUploadedImageByUrl(student.photoUrl);

  redirect(withQuery(returnTo, "photoUpdated", "1"));
}

export async function uploadParentPhotoAction(formData: FormData) {
  const session = await requireSession();
  const studentId = String(formData.get("id") ?? "").trim();
  const file = formData.get("photo");
  if (!studentId || !(file instanceof File)) redirect("/students");

  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId: session.schoolId,
      parents: { some: { userId: session.userId } }
    },
    select: { id: true }
  });
  if (!student) redirect("/students");

  await clearUserProfileImages(session.userId);
  const saved = await saveUserProfileImage(session.schoolId, session.userId, file);
  if (!saved.ok) redirect(`/students/${student.id}/edit`);

  redirect(`/students/${student.id}/edit`);
}
