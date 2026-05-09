"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { auditLog } from "@/lib/audit";
import { withAcademicYearParam } from "@/lib/academic-year";

const CreateAcademicYearSchema = z.object({
  name: z.string().trim().max(40).optional(),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  setActive: z.string().optional()
});

const SetActiveAcademicYearSchema = z.object({
  academicYearId: z.string().min(1)
});

const CloseAcademicYearSchema = z.object({
  currentYearId: z.string().min(1),
  nextYearName: z.string().trim().max(40).optional(),
  nextStartsOn: z.string().min(1),
  nextEndsOn: z.string().min(1),
  copyTimetableDraft: z.string().optional()
});

function parseDateInput(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeYearName(input: string | undefined, startsOn: Date) {
  const trimmed = input?.trim();
  if (trimmed) return trimmed;
  const startYear = startsOn.getUTCFullYear();
  return `${startYear}-${startYear + 1}`;
}

export async function createAcademicYearAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");

  const parsed = CreateAcademicYearSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? ""),
    setActive: String(formData.get("setActive") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to create academic year.");

  const startsOn = parseDateInput(parsed.data.startsOn);
  const endsOn = parseDateInput(parsed.data.endsOn);
  if (!startsOn || !endsOn) throw new Error("Select valid start and end dates.");
  if (endsOn < startsOn) throw new Error("End date must be after start date.");

  const name = normalizeYearName(parsed.data.name, startsOn);
  const shouldSetActive = parsed.data.setActive === "1";

  const year = await db.$transaction(async (tx) => {
    const existing = await tx.academicYear.findFirst({
      where: { schoolId: session.schoolId, name },
      select: { id: true }
    });
    if (existing) {
      throw new Error(`Academic year ${name} already exists.`);
    }

    const created = await tx.academicYear.create({
      data: {
        schoolId: session.schoolId,
        name,
        startsOn,
        endsOn,
        status: "ACTIVE",
        isActive: shouldSetActive
      },
      select: { id: true, name: true }
    });

    if (shouldSetActive) {
      await tx.academicYear.updateMany({
        where: { schoolId: session.schoolId, id: { not: created.id } },
        data: { isActive: false }
      });

      await tx.school.update({
        where: { id: session.schoolId },
        data: { activeAcademicYearId: created.id }
      });
    }

    return created;
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    schoolId: session.schoolId,
    action: "ACADEMIC_YEAR_CREATED",
    entityType: "AcademicYear",
    entityId: year.id,
    metadata: {
      name,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      setActive: shouldSetActive
    }
  });

  redirect("/admin/academic-years");
}

export async function setActiveAcademicYearAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");

  const parsed = SetActiveAcademicYearSchema.safeParse({
    academicYearId: formData.get("academicYearId")
  });
  if (!parsed.success) throw new Error("Unable to change active academic year.");

  const year = await db.academicYear.findFirst({
    where: { id: parsed.data.academicYearId, schoolId: session.schoolId },
    select: { id: true, name: true }
  });
  if (!year) throw new Error("Academic year not found.");

  await db.$transaction(async (tx) => {
    await tx.academicYear.updateMany({
      where: { schoolId: session.schoolId },
      data: { isActive: false }
    });

    await tx.academicYear.update({
      where: { id: year.id },
      data: { isActive: true, status: "ACTIVE", closedAt: null, closedByUserId: null }
    });

    await tx.school.update({
      where: { id: session.schoolId },
      data: { activeAcademicYearId: year.id }
    });
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    schoolId: session.schoolId,
    action: "ACADEMIC_YEAR_ACTIVATED",
    entityType: "AcademicYear",
    entityId: year.id,
    metadata: { name: year.name }
  });

  redirect(withAcademicYearParam("/admin/academic-years", year.id));
}

export async function closeAcademicYearAction(formData: FormData) {
  const { session } = await requirePermission("SETTINGS", "ADMIN");

  const parsed = CloseAcademicYearSchema.safeParse({
    currentYearId: formData.get("currentYearId"),
    nextYearName: String(formData.get("nextYearName") ?? "").trim() || undefined,
    nextStartsOn: String(formData.get("nextStartsOn") ?? ""),
    nextEndsOn: String(formData.get("nextEndsOn") ?? ""),
    copyTimetableDraft: String(formData.get("copyTimetableDraft") ?? "").trim() || undefined
  });
  if (!parsed.success) throw new Error("Unable to close academic year.");

  const nextStartsOn = parseDateInput(parsed.data.nextStartsOn);
  const nextEndsOn = parseDateInput(parsed.data.nextEndsOn);
  if (!nextStartsOn || !nextEndsOn) throw new Error("Select valid next year start/end dates.");
  if (nextEndsOn < nextStartsOn) throw new Error("Next year end date must be after start date.");
  const nextYearName = normalizeYearName(parsed.data.nextYearName, nextStartsOn);

  const promotionEntries = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("promote_"))
    .map(([key, value]) => ({ fromClassId: key.replace(/^promote_/, ""), targetClassId: String(value ?? "").trim() }));

  const closeSummary = await db.$transaction(async (tx) => {
    const currentYear = await tx.academicYear.findFirst({
      where: { id: parsed.data.currentYearId, schoolId: session.schoolId },
      select: { id: true, name: true, status: true, isActive: true }
    });
    if (!currentYear) throw new Error("Current academic year not found.");
    if (!currentYear.isActive) throw new Error("Only active academic year can be closed.");
    if (currentYear.status === "CLOSED") throw new Error("Academic year is already closed.");

    const classes = await tx.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true }
    });
    const classIds = new Set(classes.map((row) => row.id));

    const promotionMap = new Map<string, string>();
    for (const entry of promotionEntries) {
      if (!entry.fromClassId) continue;
      if (!entry.targetClassId) continue;
      if (entry.targetClassId !== "__SAME__" && entry.targetClassId !== "__GRADUATE__" && !classIds.has(entry.targetClassId)) {
        throw new Error("Promotion mapping contains an invalid target class.");
      }
      promotionMap.set(entry.fromClassId, entry.targetClassId);
    }

    const existingNext = await tx.academicYear.findFirst({
      where: { schoolId: session.schoolId, name: nextYearName },
      select: { id: true }
    });
    if (existingNext?.id === currentYear.id) {
      throw new Error("Next academic year must be different from the current year.");
    }

    const nextYear = existingNext
      ? await tx.academicYear.update({
          where: { id: existingNext.id },
          data: {
            startsOn: nextStartsOn,
            endsOn: nextEndsOn,
            status: "ACTIVE",
            closedAt: null,
            closedByUserId: null
          },
          select: { id: true, name: true }
        })
      : await tx.academicYear.create({
          data: {
            schoolId: session.schoolId,
            name: nextYearName,
            startsOn: nextStartsOn,
            endsOn: nextEndsOn,
            status: "ACTIVE",
            isActive: false
          },
          select: { id: true, name: true }
        });

    const currentRows = await tx.studentAcademicYear.findMany({
      where: {
        schoolId: session.schoolId,
        academicYearId: currentYear.id,
        status: "ACTIVE"
      },
      include: {
        student: { select: { id: true, fullName: true } }
      }
    });

    let promotedCount = 0;
    let graduatedCount = 0;

    for (const row of currentRows) {
      const targetSelection = row.classId ? promotionMap.get(row.classId) ?? "__SAME__" : "__SAME__";
      if (targetSelection === "__GRADUATE__") {
        await tx.studentAcademicYear.update({
          where: { id: row.id },
          data: { status: "GRADUATED", graduatedAt: new Date() }
        });
        await tx.student.update({
          where: { id: row.student.id },
          data: { classId: null, rollNumber: null }
        });
        graduatedCount += 1;
        continue;
      }

      const nextClassId = targetSelection === "__SAME__" ? row.classId : targetSelection;

      await tx.studentAcademicYear.update({
        where: { id: row.id },
        data: { status: "PROMOTED", promotedAt: new Date() }
      });

      await tx.studentAcademicYear.upsert({
        where: {
          academicYearId_studentId: {
            academicYearId: nextYear.id,
            studentId: row.student.id
          }
        },
        update: {
          classId: nextClassId ?? null,
          rollNumber: row.rollNumber ?? null,
          status: "ACTIVE",
          promotedAt: null,
          graduatedAt: null
        },
        create: {
          schoolId: session.schoolId,
          academicYearId: nextYear.id,
          studentId: row.student.id,
          classId: nextClassId ?? null,
          rollNumber: row.rollNumber ?? null,
          status: "ACTIVE"
        }
      });

      await tx.student.update({
        where: { id: row.student.id },
        data: {
          classId: nextClassId ?? null,
          rollNumber: row.rollNumber ?? null
        }
      });

      promotedCount += 1;
    }

    let copiedTimetableCount = 0;
    if (parsed.data.copyTimetableDraft === "1") {
      const [sourceRows, targetRows] = await Promise.all([
        tx.teacherTimetableEntry.findMany({
          where: { schoolId: session.schoolId, academicYearId: currentYear.id },
          select: {
            teacherUserId: true,
            classId: true,
            subjectName: true,
            weekday: true,
            startTime: true,
            endTime: true,
            room: true,
            createdByUserId: true
          }
        }),
        tx.teacherTimetableEntry.findMany({
          where: { schoolId: session.schoolId, academicYearId: nextYear.id },
          select: {
            teacherUserId: true,
            classId: true,
            subjectName: true,
            weekday: true,
            startTime: true,
            endTime: true,
            room: true
          }
        })
      ]);

      const existingKeys = new Set(
        targetRows.map((row) =>
          `${row.teacherUserId}::${row.classId}::${row.subjectName}::${row.weekday}::${row.startTime}::${row.endTime}::${row.room ?? ""}`
        )
      );

      const toCreate = sourceRows.filter((row) => {
        const key = `${row.teacherUserId}::${row.classId}::${row.subjectName}::${row.weekday}::${row.startTime}::${row.endTime}::${row.room ?? ""}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      if (toCreate.length > 0) {
        await tx.teacherTimetableEntry.createMany({
          data: toCreate.map((row) => ({
            schoolId: session.schoolId,
            academicYearId: nextYear.id,
            teacherUserId: row.teacherUserId,
            classId: row.classId,
            subjectName: row.subjectName,
            weekday: row.weekday,
            startTime: row.startTime,
            endTime: row.endTime,
            room: row.room,
            createdByUserId: row.createdByUserId
          }))
        });
      }
      copiedTimetableCount = toCreate.length;
    }

    await tx.academicYear.updateMany({
      where: { schoolId: session.schoolId },
      data: { isActive: false }
    });

    await tx.academicYear.update({
      where: { id: currentYear.id },
      data: {
        status: "CLOSED",
        isActive: false,
        closedAt: new Date(),
        closedByUserId: session.userId
      }
    });

    await tx.academicYear.update({
      where: { id: nextYear.id },
      data: {
        status: "ACTIVE",
        isActive: true,
        closedAt: null,
        closedByUserId: null
      }
    });

    await tx.school.update({
      where: { id: session.schoolId },
      data: { activeAcademicYearId: nextYear.id }
    });

    return {
      currentYear,
      nextYear,
      promotedCount,
      graduatedCount,
      copiedTimetableCount,
      studentCount: currentRows.length
    };
  });

  await auditLog({
    actor: { type: "SCHOOL_USER", id: session.userId, schoolId: session.schoolId },
    schoolId: session.schoolId,
    action: "ACADEMIC_YEAR_CLOSED",
    entityType: "AcademicYear",
    entityId: closeSummary.currentYear.id,
    metadata: {
      currentYear: closeSummary.currentYear.name,
      nextYear: closeSummary.nextYear.name,
      promotedCount: closeSummary.promotedCount,
      graduatedCount: closeSummary.graduatedCount,
      studentCount: closeSummary.studentCount,
      copiedTimetableCount: closeSummary.copiedTimetableCount,
      nextStartsOn: parsed.data.nextStartsOn,
      nextEndsOn: parsed.data.nextEndsOn
    }
  });

  redirect(withAcademicYearParam("/admin/academic-years", closeSummary.nextYear.id));
}
