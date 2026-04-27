-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT_USER');

-- CreateEnum
CREATE TYPE "PlatformUserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('PREMIUM', 'BETA', 'DEFAULT', 'UNLIMITED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'EDIT', 'APPROVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "OnboardingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'HOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PasswordResetSubjectType" AS ENUM ('PLATFORM_USER', 'SCHOOL_USER');

-- CreateEnum
CREATE TYPE "GalleryFolderSource" AS ENUM ('SCHOOL', 'PLATFORM');

-- CreateEnum
CREATE TYPE "LearningCenterResourceType" AS ENUM ('NOTE', 'VIDEO', 'LINK', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "SupportConversationScope" AS ENUM ('SCHOOL_INTERNAL', 'PLATFORM_SUPPORT');

-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportMessageSenderType" AS ENUM ('SCHOOL_USER', 'PLATFORM_USER');

-- CreateEnum
CREATE TYPE "SchoolCalendarEventType" AS ENUM ('HOLIDAY', 'FUNCTION', 'EXAM', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolCalendarEventAudienceScope" AS ENUM ('SCHOOL_WIDE', 'CLASS_WISE');

-- CreateEnum
CREATE TYPE "TeacherSalaryPayCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LeaveRequesterType" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('PLATFORM_USER', 'SCHOOL_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UpdateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByPlatformUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUserSchoolAssignment" (
    "id" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUserSchoolAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandingLogoUrl" TEXT,
    "brandingColor" TEXT,
    "studentIdFormat" TEXT NOT NULL DEFAULT 'STU-{YYYY}-{SEQ}',
    "admissionNoFormat" TEXT NOT NULL DEFAULT 'ADM-{YYYY}-{SEQ}',
    "studentIdNext" INTEGER NOT NULL DEFAULT 1,
    "admissionNoNext" INTEGER NOT NULL DEFAULT 1,
    "idSequencePad" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolOnboardingRequest" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolSlug" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminPhoneCountryCode" TEXT,
    "adminPhone" TEXT,
    "status" "OnboardingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "schoolId" TEXT,
    "approvedByPlatformUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolOnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "bestTimeToReach" TEXT NOT NULL,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "reviewedByPlatformUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleField" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "optionsJson" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolModuleField" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "moduleFieldId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN,
    "labelOverride" TEXT,
    "optionsOverrideJson" TEXT,
    "sortOrderOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolModuleField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolInvite" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "schoolRoleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'PREMIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "customPlanId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlanSetting" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "durationDays" INTEGER,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "durationDays" INTEGER,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "scope" "SupportConversationScope" NOT NULL DEFAULT 'SCHOOL_INTERNAL',
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "createdBySchoolUserId" TEXT,
    "createdByPlatformUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversationSchoolParticipant" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "SupportConversationSchoolParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversationPlatformParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "SupportConversationPlatformParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "senderType" "SupportMessageSenderType" NOT NULL,
    "senderSchoolUserId" TEXT,
    "senderPlatformUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentUpdateRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "UpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolRoleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "gender" TEXT,
    "phoneNumber" TEXT,
    "alternatePhoneNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "subjectType" "PasswordResetSubjectType" NOT NULL,
    "platformUserId" TEXT,
    "userId" TEXT,
    "schoolId" TEXT,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolRole" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolModule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleModulePermission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolRoleId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModulePermission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolGalleryFolder" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "GalleryFolderSource" NOT NULL DEFAULT 'SCHOOL',
    "createdByUserId" TEXT,
    "createdByPlatformUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolGalleryFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolGalleryFolderRole" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "schoolRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolGalleryFolderRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolGalleryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "imageUrl" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdByPlatformUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolGalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningCenterResource" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "resourceType" "LearningCenterResourceType" NOT NULL DEFAULT 'NOTE',
    "content" TEXT,
    "linkUrl" TEXT,
    "attachmentUrl" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCenterResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeLearningVideo" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeUrl" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "holidayOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeLearningVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCalendarEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "SchoolCalendarEventType" NOT NULL DEFAULT 'OTHER',
    "audienceScope" "SchoolCalendarEventAudienceScope" NOT NULL DEFAULT 'SCHOOL_WIDE',
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCalendarEventClass" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolCalendarEventClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSalaryProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "payCycle" "TeacherSalaryPayCycle" NOT NULL DEFAULT 'MONTHLY',
    "grossAmountCents" INTEGER NOT NULL,
    "leaveAllowanceDays" INTEGER NOT NULL DEFAULT 2,
    "deductionPerLeaveDayCents" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalaryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherTimetableEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherTimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requesterType" "LeaveRequesterType" NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "studentId" TEXT,
    "teacherUserId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "decisionNote" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plateNumber" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "busId" TEXT,
    "name" TEXT NOT NULL,
    "stopsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusDriverAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusDriverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherClassAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "admissionNo" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "classId" TEXT,
    "rollNumber" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "joiningDate" TIMESTAMP(3),
    "transportDetails" TEXT,
    "medicalNotes" TEXT,
    "documentsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "parentMobiles" TEXT,
    "parentEmails" TEXT,
    "parentOccupation" TEXT,
    "parentAddress" TEXT,
    "emergencyContact" TEXT,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "guardianMobile" TEXT,
    "guardianAltContact" TEXT,
    "guardianAddress" TEXT,
    "pickupAuthDetails" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentParent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentParent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInvoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueOn" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SCHOOL',
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "notedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "dueOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");

-- CreateIndex
CREATE INDEX "PlatformUserSchoolAssignment_schoolId_idx" ON "PlatformUserSchoolAssignment"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUserSchoolAssignment_platformUserId_schoolId_key" ON "PlatformUserSchoolAssignment"("platformUserId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "SchoolOnboardingRequest_status_createdAt_idx" ON "SchoolOnboardingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolOnboardingRequest_schoolSlug_idx" ON "SchoolOnboardingRequest"("schoolSlug");

-- CreateIndex
CREATE INDEX "SchoolOnboardingRequest_adminEmail_createdAt_idx" ON "SchoolOnboardingRequest"("adminEmail", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolOnboardingRequest_adminPhone_createdAt_idx" ON "SchoolOnboardingRequest"("adminPhone", "createdAt");

-- CreateIndex
CREATE INDEX "DemoRequest_status_createdAt_idx" ON "DemoRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DemoRequest_email_createdAt_idx" ON "DemoRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "DemoRequest_schoolName_createdAt_idx" ON "DemoRequest"("schoolName", "createdAt");

-- CreateIndex
CREATE INDEX "DemoRequest_reviewedByPlatformUserId_createdAt_idx" ON "DemoRequest"("reviewedByPlatformUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ModuleField_moduleId_isActive_sortOrder_idx" ON "ModuleField"("moduleId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleField_moduleId_key_key" ON "ModuleField"("moduleId", "key");

-- CreateIndex
CREATE INDEX "SchoolModuleField_schoolId_idx" ON "SchoolModuleField"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolModuleField_moduleFieldId_idx" ON "SchoolModuleField"("moduleFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolModuleField_schoolId_moduleFieldId_key" ON "SchoolModuleField"("schoolId", "moduleFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolInvite_token_key" ON "SchoolInvite"("token");

-- CreateIndex
CREATE INDEX "SchoolInvite_schoolId_email_idx" ON "SchoolInvite"("schoolId", "email");

-- CreateIndex
CREATE INDEX "SchoolInvite_schoolRoleId_idx" ON "SchoolInvite"("schoolRoleId");

-- CreateIndex
CREATE INDEX "SchoolInvite_expiresAt_usedAt_idx" ON "SchoolInvite"("expiresAt", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_schoolId_key" ON "Subscription"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanSetting_plan_key" ON "SubscriptionPlanSetting"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "CustomSubscriptionPlan_code_key" ON "CustomSubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_schoolId_userId_readAt_idx" ON "Notification"("schoolId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_schoolId_createdAt_idx" ON "Notification"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportConversation_schoolId_createdAt_idx" ON "SupportConversation"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportConversation_schoolId_scope_createdAt_idx" ON "SupportConversation"("schoolId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportConversationSchoolParticipant_schoolId_userId_joined_idx" ON "SupportConversationSchoolParticipant"("schoolId", "userId", "joinedAt");

-- CreateIndex
CREATE INDEX "SupportConversationSchoolParticipant_conversationId_joinedA_idx" ON "SupportConversationSchoolParticipant"("conversationId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportConversationSchoolParticipant_conversationId_userId_key" ON "SupportConversationSchoolParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "SupportConversationPlatformParticipant_platformUserId_joine_idx" ON "SupportConversationPlatformParticipant"("platformUserId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportConversationPlatformParticipant_conversationId_platf_key" ON "SupportConversationPlatformParticipant"("conversationId", "platformUserId");

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_schoolId_createdAt_idx" ON "SupportMessage"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentUpdateRequest_schoolId_status_createdAt_idx" ON "StudentUpdateRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentUpdateRequest_schoolId_studentId_createdAt_idx" ON "StudentUpdateRequest"("schoolId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "User_schoolId_schoolRoleId_idx" ON "User"("schoolId", "schoolRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_subjectType_expiresAt_usedAt_idx" ON "PasswordResetToken"("subjectType", "expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_platformUserId_idx" ON "PasswordResetToken"("platformUserId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_schoolId_idx" ON "PasswordResetToken"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolRole_schoolId_idx" ON "SchoolRole"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRole_schoolId_key_key" ON "SchoolRole"("schoolId", "key");

-- CreateIndex
CREATE INDEX "SchoolModule_schoolId_enabled_idx" ON "SchoolModule"("schoolId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolModule_schoolId_moduleId_key" ON "SchoolModule"("schoolId", "moduleId");

-- CreateIndex
CREATE INDEX "RoleModulePermission_schoolId_schoolRoleId_idx" ON "RoleModulePermission"("schoolId", "schoolRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleModulePermission_schoolId_schoolRoleId_moduleId_key" ON "RoleModulePermission"("schoolId", "schoolRoleId", "moduleId");

-- CreateIndex
CREATE INDEX "UserModulePermission_schoolId_userId_idx" ON "UserModulePermission"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserModulePermission_schoolId_userId_moduleId_key" ON "UserModulePermission"("schoolId", "userId", "moduleId");

-- CreateIndex
CREATE INDEX "SchoolGalleryFolder_schoolId_createdAt_idx" ON "SchoolGalleryFolder"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolGalleryFolder_schoolId_source_createdAt_idx" ON "SchoolGalleryFolder"("schoolId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolGalleryFolderRole_schoolId_schoolRoleId_idx" ON "SchoolGalleryFolderRole"("schoolId", "schoolRoleId");

-- CreateIndex
CREATE INDEX "SchoolGalleryFolderRole_folderId_idx" ON "SchoolGalleryFolderRole"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolGalleryFolderRole_folderId_schoolRoleId_key" ON "SchoolGalleryFolderRole"("folderId", "schoolRoleId");

-- CreateIndex
CREATE INDEX "SchoolGalleryItem_schoolId_createdAt_idx" ON "SchoolGalleryItem"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolGalleryItem_folderId_createdAt_idx" ON "SchoolGalleryItem"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningCenterResource_schoolId_classId_createdAt_idx" ON "LearningCenterResource"("schoolId", "classId", "createdAt");

-- CreateIndex
CREATE INDEX "YouTubeLearningVideo_schoolId_classId_createdAt_idx" ON "YouTubeLearningVideo"("schoolId", "classId", "createdAt");

-- CreateIndex
CREATE INDEX "YouTubeLearningVideo_schoolId_holidayOnly_createdAt_idx" ON "YouTubeLearningVideo"("schoolId", "holidayOnly", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_schoolId_startsOn_endsOn_idx" ON "SchoolCalendarEvent"("schoolId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_schoolId_eventType_startsOn_idx" ON "SchoolCalendarEvent"("schoolId", "eventType", "startsOn");

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_schoolId_audienceScope_startsOn_idx" ON "SchoolCalendarEvent"("schoolId", "audienceScope", "startsOn");

-- CreateIndex
CREATE INDEX "SchoolCalendarEventClass_schoolId_classId_idx" ON "SchoolCalendarEventClass"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "SchoolCalendarEventClass_eventId_idx" ON "SchoolCalendarEventClass"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCalendarEventClass_eventId_classId_key" ON "SchoolCalendarEventClass"("eventId", "classId");

-- CreateIndex
CREATE INDEX "TeacherSalaryProfile_schoolId_payCycle_isActive_idx" ON "TeacherSalaryProfile"("schoolId", "payCycle", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalaryProfile_schoolId_teacherUserId_key" ON "TeacherSalaryProfile"("schoolId", "teacherUserId");

-- CreateIndex
CREATE INDEX "TeacherTimetableEntry_schoolId_weekday_startTime_idx" ON "TeacherTimetableEntry"("schoolId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "TeacherTimetableEntry_schoolId_teacherUserId_weekday_startT_idx" ON "TeacherTimetableEntry"("schoolId", "teacherUserId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "TeacherTimetableEntry_schoolId_classId_weekday_startTime_idx" ON "TeacherTimetableEntry"("schoolId", "classId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_status_createdAt_idx" ON "LeaveRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_requesterType_fromDate_idx" ON "LeaveRequest"("schoolId", "requesterType", "fromDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_studentId_fromDate_idx" ON "LeaveRequest"("schoolId", "studentId", "fromDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_teacherUserId_fromDate_idx" ON "LeaveRequest"("schoolId", "teacherUserId", "fromDate");

-- CreateIndex
CREATE INDEX "Bus_schoolId_idx" ON "Bus"("schoolId");

-- CreateIndex
CREATE INDEX "BusRoute_schoolId_idx" ON "BusRoute"("schoolId");

-- CreateIndex
CREATE INDEX "BusRoute_busId_idx" ON "BusRoute"("busId");

-- CreateIndex
CREATE INDEX "BusDriverAssignment_schoolId_busId_idx" ON "BusDriverAssignment"("schoolId", "busId");

-- CreateIndex
CREATE UNIQUE INDEX "BusDriverAssignment_schoolId_userId_key" ON "BusDriverAssignment"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isActive_idx" ON "AcademicYear"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_section_key" ON "Class"("schoolId", "name", "section");

-- CreateIndex
CREATE INDEX "TeacherClassAssignment_schoolId_userId_idx" ON "TeacherClassAssignment"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "TeacherClassAssignment_schoolId_classId_idx" ON "TeacherClassAssignment"("schoolId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassAssignment_userId_classId_key" ON "TeacherClassAssignment"("userId", "classId");

-- CreateIndex
CREATE INDEX "Student_schoolId_classId_idx" ON "Student"("schoolId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentId_key" ON "Student"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentParent_schoolId_userId_idx" ON "StudentParent"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentParent_studentId_userId_key" ON "StudentParent"("studentId", "userId");

-- CreateIndex
CREATE INDEX "FeeInvoice_schoolId_studentId_status_idx" ON "FeeInvoice"("schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "FeedPost_schoolId_createdAt_idx" ON "FeedPost"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_date_idx" ON "AttendanceRecord"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_date_key" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE INDEX "Homework_schoolId_createdAt_idx" ON "Homework"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamResult_schoolId_createdAt_idx" ON "ExamResult"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformUser" ADD CONSTRAINT "PlatformUser_approvedByPlatformUserId_fkey" FOREIGN KEY ("approvedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformUserSchoolAssignment" ADD CONSTRAINT "PlatformUserSchoolAssignment_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformUserSchoolAssignment" ADD CONSTRAINT "PlatformUserSchoolAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolOnboardingRequest" ADD CONSTRAINT "SchoolOnboardingRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolOnboardingRequest" ADD CONSTRAINT "SchoolOnboardingRequest_approvedByPlatformUserId_fkey" FOREIGN KEY ("approvedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_reviewedByPlatformUserId_fkey" FOREIGN KEY ("reviewedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleField" ADD CONSTRAINT "ModuleField_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolModuleField" ADD CONSTRAINT "SchoolModuleField_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolModuleField" ADD CONSTRAINT "SchoolModuleField_moduleFieldId_fkey" FOREIGN KEY ("moduleFieldId") REFERENCES "ModuleField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolInvite" ADD CONSTRAINT "SchoolInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolInvite" ADD CONSTRAINT "SchoolInvite_schoolRoleId_fkey" FOREIGN KEY ("schoolRoleId") REFERENCES "SchoolRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customPlanId_fkey" FOREIGN KEY ("customPlanId") REFERENCES "CustomSubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_createdBySchoolUserId_fkey" FOREIGN KEY ("createdBySchoolUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_createdByPlatformUserId_fkey" FOREIGN KEY ("createdByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversationSchoolParticipant" ADD CONSTRAINT "SupportConversationSchoolParticipant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversationSchoolParticipant" ADD CONSTRAINT "SupportConversationSchoolParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversationSchoolParticipant" ADD CONSTRAINT "SupportConversationSchoolParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversationPlatformParticipant" ADD CONSTRAINT "SupportConversationPlatformParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversationPlatformParticipant" ADD CONSTRAINT "SupportConversationPlatformParticipant_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderSchoolUserId_fkey" FOREIGN KEY ("senderSchoolUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderPlatformUserId_fkey" FOREIGN KEY ("senderPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentUpdateRequest" ADD CONSTRAINT "StudentUpdateRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentUpdateRequest" ADD CONSTRAINT "StudentUpdateRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolRoleId_fkey" FOREIGN KEY ("schoolRoleId") REFERENCES "SchoolRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRole" ADD CONSTRAINT "SchoolRole_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolModule" ADD CONSTRAINT "SchoolModule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolModule" ADD CONSTRAINT "SchoolModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleModulePermission" ADD CONSTRAINT "RoleModulePermission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleModulePermission" ADD CONSTRAINT "RoleModulePermission_schoolRoleId_fkey" FOREIGN KEY ("schoolRoleId") REFERENCES "SchoolRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleModulePermission" ADD CONSTRAINT "RoleModulePermission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModulePermission" ADD CONSTRAINT "UserModulePermission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModulePermission" ADD CONSTRAINT "UserModulePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModulePermission" ADD CONSTRAINT "UserModulePermission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolder" ADD CONSTRAINT "SchoolGalleryFolder_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolder" ADD CONSTRAINT "SchoolGalleryFolder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolder" ADD CONSTRAINT "SchoolGalleryFolder_createdByPlatformUserId_fkey" FOREIGN KEY ("createdByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolderRole" ADD CONSTRAINT "SchoolGalleryFolderRole_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolderRole" ADD CONSTRAINT "SchoolGalleryFolderRole_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "SchoolGalleryFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryFolderRole" ADD CONSTRAINT "SchoolGalleryFolderRole_schoolRoleId_fkey" FOREIGN KEY ("schoolRoleId") REFERENCES "SchoolRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryItem" ADD CONSTRAINT "SchoolGalleryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryItem" ADD CONSTRAINT "SchoolGalleryItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "SchoolGalleryFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryItem" ADD CONSTRAINT "SchoolGalleryItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolGalleryItem" ADD CONSTRAINT "SchoolGalleryItem_createdByPlatformUserId_fkey" FOREIGN KEY ("createdByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningCenterResource" ADD CONSTRAINT "LearningCenterResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningCenterResource" ADD CONSTRAINT "LearningCenterResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningCenterResource" ADD CONSTRAINT "LearningCenterResource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeLearningVideo" ADD CONSTRAINT "YouTubeLearningVideo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeLearningVideo" ADD CONSTRAINT "YouTubeLearningVideo_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeLearningVideo" ADD CONSTRAINT "YouTubeLearningVideo_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEvent" ADD CONSTRAINT "SchoolCalendarEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEvent" ADD CONSTRAINT "SchoolCalendarEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEventClass" ADD CONSTRAINT "SchoolCalendarEventClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEventClass" ADD CONSTRAINT "SchoolCalendarEventClass_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SchoolCalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCalendarEventClass" ADD CONSTRAINT "SchoolCalendarEventClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryProfile" ADD CONSTRAINT "TeacherSalaryProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryProfile" ADD CONSTRAINT "TeacherSalaryProfile_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTimetableEntry" ADD CONSTRAINT "TeacherTimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTimetableEntry" ADD CONSTRAINT "TeacherTimetableEntry_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTimetableEntry" ADD CONSTRAINT "TeacherTimetableEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTimetableEntry" ADD CONSTRAINT "TeacherTimetableEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bus" ADD CONSTRAINT "Bus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRoute" ADD CONSTRAINT "BusRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRoute" ADD CONSTRAINT "BusRoute_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusDriverAssignment" ADD CONSTRAINT "BusDriverAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusDriverAssignment" ADD CONSTRAINT "BusDriverAssignment_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusDriverAssignment" ADD CONSTRAINT "BusDriverAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

