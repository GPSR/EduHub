-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "StudentAcademicYearStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'GRADUATED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN "activeAcademicYearId" TEXT;

-- AlterTable
ALTER TABLE "AcademicYear"
  ADD COLUMN "status" "AcademicYearStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "closedByUserId" TEXT;

-- AlterTable
ALTER TABLE "SchoolCalendarEvent" ADD COLUMN "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "TeacherTimetableEntry" ADD COLUMN "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "FeeInvoice" ADD COLUMN "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "Homework" ADD COLUMN "academicYearId" TEXT;

-- AlterTable
ALTER TABLE "ExamResult" ADD COLUMN "academicYearId" TEXT;

-- CreateTable
CREATE TABLE "StudentAcademicYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "rollNumber" TEXT,
    "status" "StudentAcademicYearStatus" NOT NULL DEFAULT 'ACTIVE',
    "promotedAt" TIMESTAMP(3),
    "graduatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAcademicYear_pkey" PRIMARY KEY ("id")
);

-- Ensure every school has at least one academic year.
WITH schools_without_year AS (
  SELECT s."id" AS school_id
  FROM "School" s
  LEFT JOIN "AcademicYear" ay ON ay."schoolId" = s."id"
  WHERE ay."id" IS NULL
),
derived AS (
  SELECT
    sw.school_id,
    CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 6 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INT
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1
    END AS start_year
  FROM schools_without_year sw
)
INSERT INTO "AcademicYear" (
  "id",
  "schoolId",
  "name",
  "startsOn",
  "endsOn",
  "status",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'ay_' || SUBSTRING(MD5(d.school_id || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 1, 24),
  d.school_id,
  (d.start_year::TEXT || '-' || (d.start_year + 1)::TEXT),
  MAKE_TIMESTAMP(d.start_year, 6, 1, 0, 0, 0),
  (MAKE_DATE(d.start_year + 1, 5, 31)::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds 999 milliseconds'),
  'ACTIVE'::"AcademicYearStatus",
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM derived d;

-- Pick one active year per school and store the pointer on School.
WITH picked AS (
  SELECT DISTINCT ON (ay."schoolId")
    ay."schoolId",
    ay."id"
  FROM "AcademicYear" ay
  ORDER BY ay."schoolId", ay."isActive" DESC, ay."startsOn" DESC, ay."createdAt" DESC
)
UPDATE "School" s
SET "activeAcademicYearId" = p."id"
FROM picked p
WHERE s."id" = p."schoolId";

-- Normalize active/closed status flags across years.
UPDATE "AcademicYear" ay
SET
  "isActive" = (ay."id" = s."activeAcademicYearId"),
  "status" = CASE WHEN ay."id" = s."activeAcademicYearId" THEN 'ACTIVE'::"AcademicYearStatus" ELSE 'CLOSED'::"AcademicYearStatus" END,
  "closedAt" = CASE WHEN ay."id" = s."activeAcademicYearId" THEN NULL ELSE COALESCE(ay."closedAt", CURRENT_TIMESTAMP) END
FROM "School" s
WHERE ay."schoolId" = s."id";

-- Backfill academicYearId on yearly tables using date ranges.
UPDATE "SchoolCalendarEvent" e
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = e."schoolId"
      AND e."startsOn" BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = e."schoolId"
  )
)
WHERE e."academicYearId" IS NULL;

UPDATE "TeacherTimetableEntry" t
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = t."schoolId"
      AND t."createdAt" BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = t."schoolId"
  )
)
WHERE t."academicYearId" IS NULL;

UPDATE "FeeInvoice" i
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = i."schoolId"
      AND COALESCE(i."dueOn", i."createdAt") BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = i."schoolId"
  )
)
WHERE i."academicYearId" IS NULL;

UPDATE "AttendanceRecord" a
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = a."schoolId"
      AND a."date" BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = a."schoolId"
  )
)
WHERE a."academicYearId" IS NULL;

UPDATE "Homework" h
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = h."schoolId"
      AND COALESCE(h."dueOn", h."createdAt") BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = h."schoolId"
  )
)
WHERE h."academicYearId" IS NULL;

UPDATE "ExamResult" r
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id"
    FROM "AcademicYear" ay
    WHERE ay."schoolId" = r."schoolId"
      AND r."createdAt" BETWEEN ay."startsOn" AND ay."endsOn"
    ORDER BY ay."startsOn" DESC
    LIMIT 1
  ),
  (
    SELECT s."activeAcademicYearId"
    FROM "School" s
    WHERE s."id" = r."schoolId"
  )
)
WHERE r."academicYearId" IS NULL;

-- Build student-year rows for active and historical years.
INSERT INTO "StudentAcademicYear" (
  "id",
  "schoolId",
  "academicYearId",
  "studentId",
  "classId",
  "rollNumber",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'say_' || SUBSTRING(MD5(s."id" || sc."activeAcademicYearId" || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 1, 24),
  s."schoolId",
  sc."activeAcademicYearId",
  s."id",
  s."classId",
  s."rollNumber",
  'ACTIVE'::"StudentAcademicYearStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Student" s
JOIN "School" sc ON sc."id" = s."schoolId"
WHERE sc."activeAcademicYearId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "StudentAcademicYear" say
    WHERE say."academicYearId" = sc."activeAcademicYearId"
      AND say."studentId" = s."id"
  );

WITH observed AS (
  SELECT DISTINCT "schoolId", "studentId", "academicYearId" FROM "AttendanceRecord"
  UNION
  SELECT DISTINCT "schoolId", "studentId", "academicYearId" FROM "Homework"
  UNION
  SELECT DISTINCT "schoolId", "studentId", "academicYearId" FROM "ExamResult"
  UNION
  SELECT DISTINCT "schoolId", "studentId", "academicYearId" FROM "FeeInvoice"
)
INSERT INTO "StudentAcademicYear" (
  "id",
  "schoolId",
  "academicYearId",
  "studentId",
  "classId",
  "rollNumber",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'say_' || SUBSTRING(MD5(o."studentId" || o."academicYearId" || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 1, 24),
  o."schoolId",
  o."academicYearId",
  o."studentId",
  s."classId",
  s."rollNumber",
  'ACTIVE'::"StudentAcademicYearStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM observed o
JOIN "Student" s ON s."id" = o."studentId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "StudentAcademicYear" say
  WHERE say."academicYearId" = o."academicYearId"
    AND say."studentId" = o."studentId"
);

-- Make yearly references mandatory.
ALTER TABLE "SchoolCalendarEvent" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "TeacherTimetableEntry" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "FeeInvoice" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "Homework" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "ExamResult" ALTER COLUMN "academicYearId" SET NOT NULL;

-- Refresh indexes for year-scoped access.
DROP INDEX IF EXISTS "SchoolCalendarEvent_schoolId_startsOn_endsOn_idx";
DROP INDEX IF EXISTS "SchoolCalendarEvent_schoolId_eventType_startsOn_idx";
DROP INDEX IF EXISTS "SchoolCalendarEvent_schoolId_audienceScope_startsOn_idx";
DROP INDEX IF EXISTS "TeacherTimetableEntry_schoolId_weekday_startTime_idx";
DROP INDEX IF EXISTS "TeacherTimetableEntry_schoolId_teacherUserId_weekday_startT_idx";
DROP INDEX IF EXISTS "TeacherTimetableEntry_schoolId_classId_weekday_startTime_idx";
DROP INDEX IF EXISTS "FeeInvoice_schoolId_studentId_status_idx";
DROP INDEX IF EXISTS "AttendanceRecord_schoolId_date_idx";
DROP INDEX IF EXISTS "AttendanceRecord_studentId_date_key";
DROP INDEX IF EXISTS "Homework_schoolId_createdAt_idx";
DROP INDEX IF EXISTS "ExamResult_schoolId_createdAt_idx";

CREATE INDEX "School_activeAcademicYearId_idx" ON "School"("activeAcademicYearId");
CREATE INDEX "AcademicYear_schoolId_status_idx" ON "AcademicYear"("schoolId", "status");
CREATE INDEX "AcademicYear_closedByUserId_idx" ON "AcademicYear"("closedByUserId");
CREATE INDEX "SchoolCalendarEvent_schoolId_academicYearId_startsOn_endsOn_idx" ON "SchoolCalendarEvent"("schoolId", "academicYearId", "startsOn", "endsOn");
CREATE INDEX "SchoolCalendarEvent_schoolId_academicYearId_eventType_start_idx" ON "SchoolCalendarEvent"("schoolId", "academicYearId", "eventType", "startsOn");
CREATE INDEX "SchoolCalendarEvent_schoolId_academicYearId_audienceScope_s_idx" ON "SchoolCalendarEvent"("schoolId", "academicYearId", "audienceScope", "startsOn");
CREATE INDEX "TeacherTimetableEntry_schoolId_academicYearId_weekday_start_idx" ON "TeacherTimetableEntry"("schoolId", "academicYearId", "weekday", "startTime");
CREATE INDEX "TeacherTimetableEntry_schoolId_academicYearId_teacherUserId_idx" ON "TeacherTimetableEntry"("schoolId", "academicYearId", "teacherUserId", "weekday", "startTime");
CREATE INDEX "TeacherTimetableEntry_schoolId_academicYearId_classId_weekd_idx" ON "TeacherTimetableEntry"("schoolId", "academicYearId", "classId", "weekday", "startTime");
CREATE INDEX "FeeInvoice_schoolId_academicYearId_studentId_status_idx" ON "FeeInvoice"("schoolId", "academicYearId", "studentId", "status");
CREATE INDEX "AttendanceRecord_schoolId_academicYearId_date_idx" ON "AttendanceRecord"("schoolId", "academicYearId", "date");
CREATE UNIQUE INDEX "AttendanceRecord_studentId_academicYearId_date_key" ON "AttendanceRecord"("studentId", "academicYearId", "date");
CREATE INDEX "Homework_schoolId_academicYearId_createdAt_idx" ON "Homework"("schoolId", "academicYearId", "createdAt");
CREATE INDEX "ExamResult_schoolId_academicYearId_createdAt_idx" ON "ExamResult"("schoolId", "academicYearId", "createdAt");
CREATE UNIQUE INDEX "StudentAcademicYear_academicYearId_studentId_key" ON "StudentAcademicYear"("academicYearId", "studentId");
CREATE INDEX "StudentAcademicYear_schoolId_academicYearId_classId_idx" ON "StudentAcademicYear"("schoolId", "academicYearId", "classId");
CREATE INDEX "StudentAcademicYear_schoolId_studentId_idx" ON "StudentAcademicYear"("schoolId", "studentId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_activeAcademicYearId_fkey" FOREIGN KEY ("activeAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEvent" ADD CONSTRAINT "SchoolCalendarEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTimetableEntry" ADD CONSTRAINT "TeacherTimetableEntry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
