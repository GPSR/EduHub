DO $$
BEGIN
  CREATE TYPE "ExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE "SchoolExam" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "classId" TEXT,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "questionPaperUrl" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "isPublished" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolExamQuestion" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "optionA" TEXT NOT NULL,
  "optionB" TEXT NOT NULL,
  "optionC" TEXT NOT NULL,
  "optionD" TEXT NOT NULL,
  "correctOption" TEXT NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolExamAttempt" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "ExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION,
  "answersJson" TEXT,
  CONSTRAINT "SchoolExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolExam_schoolId_academicYearId_startsAt_idx" ON "SchoolExam"("schoolId", "academicYearId", "startsAt");
CREATE INDEX "SchoolExam_schoolId_classId_startsAt_idx" ON "SchoolExam"("schoolId", "classId", "startsAt");
CREATE INDEX "SchoolExam_schoolId_isPublished_startsAt_idx" ON "SchoolExam"("schoolId", "isPublished", "startsAt");

CREATE INDEX "SchoolExamQuestion_examId_sortOrder_idx" ON "SchoolExamQuestion"("examId", "sortOrder");
CREATE INDEX "SchoolExamQuestion_schoolId_createdAt_idx" ON "SchoolExamQuestion"("schoolId", "createdAt");

CREATE UNIQUE INDEX "SchoolExamAttempt_examId_studentId_key" ON "SchoolExamAttempt"("examId", "studentId");
CREATE INDEX "SchoolExamAttempt_schoolId_studentId_startedAt_idx" ON "SchoolExamAttempt"("schoolId", "studentId", "startedAt");
CREATE INDEX "SchoolExamAttempt_schoolId_examId_status_idx" ON "SchoolExamAttempt"("schoolId", "examId", "status");

ALTER TABLE "SchoolExam"
  ADD CONSTRAINT "SchoolExam_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExam"
  ADD CONSTRAINT "SchoolExam_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExam"
  ADD CONSTRAINT "SchoolExam_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolExam"
  ADD CONSTRAINT "SchoolExam_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExamQuestion"
  ADD CONSTRAINT "SchoolExamQuestion_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExamQuestion"
  ADD CONSTRAINT "SchoolExamQuestion_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "SchoolExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExamAttempt"
  ADD CONSTRAINT "SchoolExamAttempt_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExamAttempt"
  ADD CONSTRAINT "SchoolExamAttempt_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "SchoolExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolExamAttempt"
  ADD CONSTRAINT "SchoolExamAttempt_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
