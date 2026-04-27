-- Create teacher salary payout records table used by admin salary payout flow
CREATE TABLE IF NOT EXISTS "TeacherSalaryPayout" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "payCycle" "TeacherSalaryPayCycle" NOT NULL DEFAULT 'MONTHLY',
  "periodKey" TEXT NOT NULL,
  "paidAmountCents" INTEGER NOT NULL,
  "paidOn" TIMESTAMP(3) NOT NULL,
  "paymentMode" TEXT,
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherSalaryPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeacherSalaryPayout_schoolId_payCycle_periodKey_paidOn_idx"
  ON "TeacherSalaryPayout"("schoolId", "payCycle", "periodKey", "paidOn");

CREATE INDEX IF NOT EXISTS "TeacherSalaryPayout_schoolId_teacherUserId_payCycle_periodKey_createdAt_idx"
  ON "TeacherSalaryPayout"("schoolId", "teacherUserId", "payCycle", "periodKey", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TeacherSalaryPayout_schoolId_fkey'
  ) THEN
    ALTER TABLE "TeacherSalaryPayout"
      ADD CONSTRAINT "TeacherSalaryPayout_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TeacherSalaryPayout_teacherUserId_fkey'
  ) THEN
    ALTER TABLE "TeacherSalaryPayout"
      ADD CONSTRAINT "TeacherSalaryPayout_teacherUserId_fkey"
      FOREIGN KEY ("teacherUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
