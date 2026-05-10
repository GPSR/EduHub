ALTER TABLE "LearningCenterResource"
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL_KNOWLEDGE';

UPDATE "LearningCenterResource"
SET "category" = 'GENERAL_KNOWLEDGE'
WHERE "category" IS NULL;

INSERT INTO "LearningCenterResource" (
  "id",
  "schoolId",
  "classId",
  "category",
  "title",
  "summary",
  "resourceType",
  "content",
  "linkUrl",
  "attachmentUrl",
  "createdByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('yl_', y."id") AS "id",
  y."schoolId",
  y."classId",
  CASE WHEN y."holidayOnly" THEN 'HOLIDAY_LEARNING' ELSE 'YOUTUBE_LEARNING' END AS "category",
  y."title",
  LEFT(COALESCE(y."description", ''), 300) AS "summary",
  'VIDEO'::"LearningCenterResourceType" AS "resourceType",
  y."description" AS "content",
  y."youtubeUrl" AS "linkUrl",
  NULL AS "attachmentUrl",
  y."createdByUserId",
  y."createdAt",
  y."updatedAt"
FROM "YouTubeLearningVideo" y
WHERE y."isActive" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "LearningCenterResource" lr
    WHERE lr."id" = CONCAT('yl_', y."id")
  );
