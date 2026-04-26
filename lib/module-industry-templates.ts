import { prisma } from "@/lib/db";

export type IndustryFieldType = "TEXT" | "NUMBER" | "DATE" | "DROPDOWN" | "CHECKBOX" | "TEXTAREA";

export type IndustryFieldTemplate = {
  key: string;
  label: string;
  fieldType: IndustryFieldType;
  isRequired?: boolean;
  options?: string[];
};

export type IndustryModuleTemplate = {
  moduleKey: string;
  purpose: string;
  workflow: string[];
  fields: IndustryFieldTemplate[];
};

export const INDUSTRY_MODULE_TEMPLATES: IndustryModuleTemplate[] = [
  {
    moduleKey: "STUDENTS",
    purpose: "Standardize admissions, student profile quality, and parent communication readiness.",
    workflow: [
      "Capture admission lead and student profile basics.",
      "Verify documents and emergency contacts.",
      "Allocate class/section and activate ID records.",
      "Share onboarding credentials to parents."
    ],
    fields: [
      { key: "ADMISSION_DATE", label: "Admission Date", fieldType: "DATE", isRequired: true },
      {
        key: "ADMISSION_SOURCE",
        label: "Admission Source",
        fieldType: "DROPDOWN",
        options: ["New Admission", "Transfer", "Scholarship", "Referral"]
      },
      { key: "BLOOD_GROUP", label: "Blood Group", fieldType: "DROPDOWN", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { key: "EMERGENCY_CONTACT", label: "Emergency Contact", fieldType: "TEXT", isRequired: true },
      { key: "TRANSPORT_NEEDED", label: "Transport Needed", fieldType: "CHECKBOX" },
      { key: "MEDICAL_NOTES", label: "Medical Notes", fieldType: "TEXTAREA" }
    ]
  },
  {
    moduleKey: "FEES",
    purpose: "Improve fee collection consistency and reconciliation across terms.",
    workflow: [
      "Create invoice with term, due date, and concession policy.",
      "Track partial/full payments with payment mode.",
      "Escalate overdue invoices and notify stakeholders.",
      "Close cycle with receipt and status reconciliation."
    ],
    fields: [
      {
        key: "FEE_TERM",
        label: "Fee Term",
        fieldType: "DROPDOWN",
        isRequired: true,
        options: ["Monthly", "Quarterly", "Half-Yearly", "Annual", "One-Time"]
      },
      { key: "DUE_DATE", label: "Due Date", fieldType: "DATE", isRequired: true },
      {
        key: "PAYMENT_MODE",
        label: "Payment Mode",
        fieldType: "DROPDOWN",
        options: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Online Gateway"]
      },
      {
        key: "CONCESSION_TYPE",
        label: "Concession Type",
        fieldType: "DROPDOWN",
        options: ["None", "Sibling", "Scholarship", "Need Based", "Staff Child"]
      },
      { key: "CONCESSION_AMOUNT", label: "Concession Amount", fieldType: "NUMBER" },
      { key: "RECEIPT_NO", label: "Receipt Number", fieldType: "TEXT" },
      {
        key: "COLLECTION_STATUS",
        label: "Collection Status",
        fieldType: "DROPDOWN",
        options: ["Pending", "Partially Paid", "Paid", "Overdue", "Waived"]
      }
    ]
  },
  {
    moduleKey: "ATTENDANCE",
    purpose: "Enable accurate attendance capture with actionable absentee follow-up.",
    workflow: [
      "Mark attendance by class/session.",
      "Capture late arrivals and absence reason.",
      "Trigger parent notification for absences.",
      "Track follow-up closure by class teacher."
    ],
    fields: [
      { key: "SESSION", label: "Session", fieldType: "DROPDOWN", options: ["Morning", "Afternoon", "Full Day"] },
      {
        key: "MARKING_MODE",
        label: "Marking Mode",
        fieldType: "DROPDOWN",
        options: ["Class Teacher", "Subject Teacher", "Biometric", "Manual Correction"]
      },
      { key: "LATE_MINUTES", label: "Late Minutes", fieldType: "NUMBER" },
      { key: "ABSENCE_REASON", label: "Absence Reason", fieldType: "TEXTAREA" },
      { key: "FOLLOWUP_REQUIRED", label: "Follow-up Required", fieldType: "CHECKBOX" }
    ]
  },
  {
    moduleKey: "TIMETABLE",
    purpose: "Improve timetable stability, class coverage, and substitution tracking.",
    workflow: [
      "Draft timetable with class, subject, teacher, and period.",
      "Publish timetable and notify stakeholders.",
      "Track substitutions and room changes.",
      "Review conflicts weekly and optimize load."
    ],
    fields: [
      { key: "DAY_OF_WEEK", label: "Day of Week", fieldType: "DROPDOWN", isRequired: true, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
      { key: "PERIOD_NO", label: "Period Number", fieldType: "NUMBER", isRequired: true },
      { key: "CLASSROOM", label: "Classroom", fieldType: "TEXT" },
      { key: "TEACHING_MODE", label: "Teaching Mode", fieldType: "DROPDOWN", options: ["In Person", "Online", "Hybrid"] },
      { key: "SUBSTITUTE_TEACHER", label: "Substitute Teacher", fieldType: "TEXT" },
      { key: "REMARKS", label: "Remarks", fieldType: "TEXTAREA" }
    ]
  },
  {
    moduleKey: "COMMUNICATION",
    purpose: "Standardize outbound communication approvals and delivery quality.",
    workflow: [
      "Create message draft with audience and channel.",
      "Route to leadership approval for high-priority posts.",
      "Schedule/publish and track delivery status.",
      "Capture acknowledgment for critical notices."
    ],
    fields: [
      {
        key: "MESSAGE_CHANNEL",
        label: "Message Channel",
        fieldType: "DROPDOWN",
        options: ["Announcement", "Circular", "SMS", "Email", "Push Notification"]
      },
      {
        key: "TARGET_AUDIENCE",
        label: "Target Audience",
        fieldType: "DROPDOWN",
        options: ["All", "Students", "Parents", "Teachers", "Staff", "Class-wise"]
      },
      { key: "PRIORITY", label: "Priority", fieldType: "DROPDOWN", options: ["Low", "Normal", "High", "Urgent"] },
      {
        key: "APPROVAL_STATUS",
        label: "Approval Status",
        fieldType: "DROPDOWN",
        options: ["Draft", "Under Review", "Approved", "Published", "Rejected"]
      },
      { key: "SCHEDULE_AT", label: "Schedule At", fieldType: "DATE" },
      { key: "ACK_REQUIRED", label: "Acknowledgment Required", fieldType: "CHECKBOX" }
    ]
  },
  {
    moduleKey: "HOMEWORK",
    purpose: "Create consistent assignment lifecycle from issue to review.",
    workflow: [
      "Teacher assigns homework by class/subject.",
      "Students submit via configured submission mode.",
      "Teacher reviews and records feedback/status.",
      "Escalate repeated non-submissions to parent."
    ],
    fields: [
      { key: "SUBJECT", label: "Subject", fieldType: "TEXT", isRequired: true },
      { key: "ASSIGNED_DATE", label: "Assigned Date", fieldType: "DATE", isRequired: true },
      { key: "DUE_DATE", label: "Due Date", fieldType: "DATE", isRequired: true },
      { key: "MAX_SCORE", label: "Max Score", fieldType: "NUMBER" },
      {
        key: "SUBMISSION_MODE",
        label: "Submission Mode",
        fieldType: "DROPDOWN",
        options: ["Notebook", "Worksheet", "Online", "Project"]
      },
      { key: "ATTACHMENT_LINK", label: "Attachment Link", fieldType: "TEXT" },
      { key: "REVIEW_STATUS", label: "Review Status", fieldType: "DROPDOWN", options: ["Pending Review", "Reviewed", "Rework Needed"] }
    ]
  },
  {
    moduleKey: "PROGRESS_CARD",
    purpose: "Enable reliable term-wise report generation and publishing.",
    workflow: [
      "Collect marks/grades by subject.",
      "Run moderation and pass criteria checks.",
      "Finalize class teacher and principal remarks.",
      "Publish report card and collect parent acknowledgment."
    ],
    fields: [
      {
        key: "EXAM_TERM",
        label: "Exam Term",
        fieldType: "DROPDOWN",
        isRequired: true,
        options: ["Unit Test 1", "Unit Test 2", "Midterm", "Pre-Final", "Final"]
      },
      { key: "GRADE_SCALE", label: "Grade Scale", fieldType: "DROPDOWN", options: ["Marks", "Grade", "Marks + Grade"] },
      { key: "PASS_THRESHOLD", label: "Pass Threshold", fieldType: "NUMBER" },
      { key: "TEACHER_REMARKS", label: "Teacher Remarks", fieldType: "TEXTAREA" },
      { key: "PARENT_ACK", label: "Parent Acknowledgment", fieldType: "CHECKBOX" },
      { key: "PUBLISH_STATUS", label: "Publish Status", fieldType: "DROPDOWN", options: ["Draft", "Approved", "Published"] }
    ]
  },
  {
    moduleKey: "TRANSPORT",
    purpose: "Standardize route operations and pickup/drop accountability.",
    workflow: [
      "Define route and stop sequence.",
      "Assign students, vehicle, and support staff.",
      "Track pickup/drop completion daily.",
      "Log delays/incidents and close exceptions."
    ],
    fields: [
      { key: "ROUTE_CODE", label: "Route Code", fieldType: "TEXT", isRequired: true },
      { key: "STOP_NAME", label: "Stop Name", fieldType: "TEXT", isRequired: true },
      { key: "PICKUP_TIME", label: "Pickup Time", fieldType: "TEXT" },
      { key: "DROP_TIME", label: "Drop Time", fieldType: "TEXT" },
      { key: "VEHICLE_NO", label: "Vehicle Number", fieldType: "TEXT" },
      { key: "GPS_REQUIRED", label: "GPS Required", fieldType: "CHECKBOX" },
      { key: "ROUTE_STATUS", label: "Route Status", fieldType: "DROPDOWN", options: ["Active", "Paused", "Closed"] }
    ]
  },
  {
    moduleKey: "GALLERY",
    purpose: "Set consistent media taxonomy, visibility, and publishing controls.",
    workflow: [
      "Create folder with role-based visibility.",
      "Upload and validate media quality.",
      "Approve content for public/internal visibility.",
      "Share and archive based on event lifecycle."
    ],
    fields: [
      {
        key: "FOLDER_CATEGORY",
        label: "Folder Category",
        fieldType: "DROPDOWN",
        options: ["Events", "Classroom", "Sports", "Trips", "Campus", "Achievements", "Other"]
      },
      { key: "VISIBILITY_SCOPE", label: "Visibility Scope", fieldType: "DROPDOWN", options: ["All School", "Role Based", "Class Based"] },
      { key: "COVER_IMAGE", label: "Cover Image", fieldType: "CHECKBOX" },
      { key: "PUBLISH_STATUS", label: "Publish Status", fieldType: "DROPDOWN", options: ["Draft", "Approved", "Published"] },
      { key: "TAGS", label: "Tags", fieldType: "TEXT" },
      { key: "PHOTO_CREDIT", label: "Photo Credit", fieldType: "TEXT" }
    ]
  },
  {
    moduleKey: "LEARNING_CENTER",
    purpose: "Create curriculum-aligned resource delivery by class and difficulty level.",
    workflow: [
      "Upload or map learning resources by class and subject.",
      "Review resource quality and appropriateness.",
      "Publish for student/parent access.",
      "Track usage and refresh stale content."
    ],
    fields: [
      { key: "CLASS_LEVEL", label: "Class Level", fieldType: "TEXT", isRequired: true },
      {
        key: "RESOURCE_TYPE",
        label: "Resource Type",
        fieldType: "DROPDOWN",
        options: ["Note", "Worksheet", "Presentation", "Assignment", "Reference Link", "Video"]
      },
      { key: "SUBJECT", label: "Subject", fieldType: "TEXT", isRequired: true },
      { key: "DIFFICULTY_LEVEL", label: "Difficulty Level", fieldType: "DROPDOWN", options: ["Beginner", "Intermediate", "Advanced"] },
      { key: "HOLIDAY_PROGRAM", label: "Holiday Program", fieldType: "CHECKBOX" },
      { key: "APPROVAL_STATUS", label: "Approval Status", fieldType: "DROPDOWN", options: ["Draft", "Under Review", "Approved", "Published"] }
    ]
  },
  {
    moduleKey: "YOUTUBE_LEARNING",
    purpose: "Manage curated video playlists with class-wise outcomes and review gates.",
    workflow: [
      "Curate class-wise video content and playlist metadata.",
      "Tag intended outcomes and language.",
      "Review and approve for holiday/live session usage.",
      "Retire outdated links and keep fresh recommendations."
    ],
    fields: [
      { key: "CLASS_LEVEL", label: "Class Level", fieldType: "TEXT", isRequired: true },
      { key: "SUBJECT", label: "Subject", fieldType: "TEXT", isRequired: true },
      { key: "PLAYLIST_NAME", label: "Playlist Name", fieldType: "TEXT" },
      {
        key: "VIDEO_LANGUAGE",
        label: "Video Language",
        fieldType: "DROPDOWN",
        options: ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Other"]
      },
      { key: "LEARNING_OUTCOME", label: "Learning Outcome", fieldType: "TEXTAREA" },
      { key: "HOLIDAY_ONLY", label: "Holiday Only", fieldType: "CHECKBOX" },
      { key: "REVIEW_STATUS", label: "Review Status", fieldType: "DROPDOWN", options: ["Pending", "Approved", "Archived"] }
    ]
  },
  {
    moduleKey: "SCHOOL_CALENDAR",
    purpose: "Organize school events with clear audience and notification controls.",
    workflow: [
      "Create event with type, duration, and owner.",
      "Publish to relevant classes/roles.",
      "Send reminders before event date.",
      "Close event with completion/cancellation status."
    ],
    fields: [
      {
        key: "EVENT_TYPE",
        label: "Event Type",
        fieldType: "DROPDOWN",
        options: ["Holiday", "Exam", "Function", "Meeting", "Sports", "Other"]
      },
      { key: "EVENT_START_DATE", label: "Event Start Date", fieldType: "DATE", isRequired: true },
      { key: "EVENT_END_DATE", label: "Event End Date", fieldType: "DATE" },
      { key: "APPLICABLE_CLASSES", label: "Applicable Classes", fieldType: "TEXT" },
      { key: "ORGANIZER", label: "Organizer", fieldType: "TEXT" },
      { key: "NOTIFY_PARENTS", label: "Notify Parents", fieldType: "CHECKBOX" },
      { key: "EVENT_STATUS", label: "Event Status", fieldType: "DROPDOWN", options: ["Planned", "Confirmed", "Completed", "Cancelled"] }
    ]
  },
  {
    moduleKey: "LEAVE_REQUESTS",
    purpose: "Implement clear leave approvals for student and teacher journeys.",
    workflow: [
      "Requester submits leave details with category and date range.",
      "Route to role-based approver chain.",
      "Approve/reject with reason and SLA tracking.",
      "Apply leave impact to attendance/salary policies."
    ],
    fields: [
      { key: "REQUESTER_TYPE", label: "Requester Type", fieldType: "DROPDOWN", isRequired: true, options: ["Student", "Teacher"] },
      {
        key: "LEAVE_CATEGORY",
        label: "Leave Category",
        fieldType: "DROPDOWN",
        options: ["Sick", "Casual", "Emergency", "Exam", "Official Duty", "Other"]
      },
      { key: "START_DATE", label: "Start Date", fieldType: "DATE", isRequired: true },
      { key: "END_DATE", label: "End Date", fieldType: "DATE", isRequired: true },
      { key: "REASON", label: "Reason", fieldType: "TEXTAREA", isRequired: true },
      {
        key: "APPROVAL_FLOW",
        label: "Approval Flow",
        fieldType: "DROPDOWN",
        options: ["Class Teacher -> Principal", "Class Teacher -> Headmaster", "Headmaster/Admin", "Admin"]
      },
      { key: "APPROVAL_STATUS", label: "Approval Status", fieldType: "DROPDOWN", options: ["Pending", "Approved", "Rejected", "Cancelled"] }
    ]
  },
  {
    moduleKey: "TEACHER_SALARY",
    purpose: "Standardize payroll setup with leave-linked deductions and status tracking.",
    workflow: [
      "Configure salary profile and pay cycle.",
      "Apply allowances and policy deductions.",
      "Adjust for excess leave and exceptions.",
      "Process and publish payroll status."
    ],
    fields: [
      { key: "PAY_CYCLE", label: "Pay Cycle", fieldType: "DROPDOWN", isRequired: true, options: ["Monthly", "Yearly"] },
      { key: "BASE_SALARY", label: "Base Salary", fieldType: "NUMBER", isRequired: true },
      { key: "ALLOWANCES", label: "Allowances", fieldType: "NUMBER" },
      { key: "DEDUCTIONS", label: "Deductions", fieldType: "NUMBER" },
      { key: "LEAVE_POLICY_DAYS", label: "Leave Policy Days", fieldType: "NUMBER" },
      { key: "OVERTIME_RATE", label: "Overtime Rate", fieldType: "NUMBER" },
      { key: "PAYOUT_STATUS", label: "Payout Status", fieldType: "DROPDOWN", options: ["Pending", "Processed", "Paid", "On Hold"] }
    ]
  },
  {
    moduleKey: "USERS",
    purpose: "Maintain standardized HR identity and compliance fields for school users.",
    workflow: [
      "Create user account with role and identifiers.",
      "Capture compliance and emergency details.",
      "Enable module access based on role permissions.",
      "Monitor active status and lifecycle changes."
    ],
    fields: [
      { key: "EMPLOYEE_CODE", label: "Employee Code", fieldType: "TEXT" },
      { key: "JOINING_DATE", label: "Joining Date", fieldType: "DATE" },
      {
        key: "DEPARTMENT",
        label: "Department",
        fieldType: "DROPDOWN",
        options: ["Academics", "Administration", "Transport", "Finance", "Operations", "IT", "Other"]
      },
      { key: "PRIMARY_PHONE", label: "Primary Phone", fieldType: "TEXT" },
      { key: "EMERGENCY_PHONE", label: "Emergency Phone", fieldType: "TEXT" },
      {
        key: "ID_PROOF_TYPE",
        label: "ID Proof Type",
        fieldType: "DROPDOWN",
        options: ["Aadhaar", "Passport", "Driving License", "Voter ID", "Other"]
      }
    ]
  }
];

const INDUSTRY_TEMPLATE_BY_MODULE_KEY = new Map(
  INDUSTRY_MODULE_TEMPLATES.map((template) => [template.moduleKey, template])
);

export function getIndustryTemplateByModuleKey(moduleKey: string) {
  return INDUSTRY_TEMPLATE_BY_MODULE_KEY.get(moduleKey);
}

export function listIndustryTemplateModuleKeys() {
  return [...INDUSTRY_TEMPLATE_BY_MODULE_KEY.keys()];
}

type ApplyTemplateSummaryRow = {
  moduleId: string;
  moduleKey: string;
  moduleName: string;
  createdFields: number;
  reactivatedFields: number;
  skippedFields: number;
};

type ApplyIndustryTemplatesResult = {
  appliedModules: number;
  createdFields: number;
  reactivatedFields: number;
  skippedFields: number;
  details: ApplyTemplateSummaryRow[];
};

function normalizeOptions(options: string[] | undefined) {
  if (!options || options.length === 0) return [];
  const unique = new Set<string>();
  const normalized: string[] = [];
  for (const option of options) {
    const value = option.trim().replace(/\s+/g, " ");
    if (!value) continue;
    const key = value.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    normalized.push(value.slice(0, 80));
  }
  return normalized;
}

export async function applyIndustryModuleTemplates(args?: { moduleKeys?: string[] }): Promise<ApplyIndustryTemplatesResult> {
  const requested = args?.moduleKeys?.map((key) => key.trim().toUpperCase()).filter(Boolean);
  const targetTemplates = requested?.length
    ? INDUSTRY_MODULE_TEMPLATES.filter((template) => requested.includes(template.moduleKey))
    : INDUSTRY_MODULE_TEMPLATES;

  if (targetTemplates.length === 0) {
    return {
      appliedModules: 0,
      createdFields: 0,
      reactivatedFields: 0,
      skippedFields: 0,
      details: []
    };
  }

  const modules = await prisma.module.findMany({
    where: { key: { in: targetTemplates.map((template) => template.moduleKey) } },
    select: { id: true, key: true, name: true }
  });
  const moduleByKey = new Map(modules.map((module) => [module.key, module]));

  const details: ApplyTemplateSummaryRow[] = [];

  for (const template of targetTemplates) {
    const module = moduleByKey.get(template.moduleKey);
    if (!module) continue;

    const result = await prisma.$transaction(async (tx) => {
      const existingFields = await tx.moduleField.findMany({
        where: { moduleId: module.id },
        select: { id: true, key: true, isActive: true, sortOrder: true }
      });
      const byKey = new Map(existingFields.map((field) => [field.key, field]));
      let nextSortOrder = Math.max(-1, ...existingFields.map((field) => field.sortOrder)) + 1;

      let createdFields = 0;
      let reactivatedFields = 0;
      let skippedFields = 0;

      for (const field of template.fields) {
        const existing = byKey.get(field.key);
        const options = normalizeOptions(field.options);
        const optionsJson = field.fieldType === "DROPDOWN" && options.length >= 2 ? JSON.stringify(options) : null;

        if (!existing) {
          await tx.moduleField.create({
            data: {
              moduleId: module.id,
              key: field.key,
              label: field.label,
              fieldType: field.fieldType,
              optionsJson,
              isRequired: Boolean(field.isRequired),
              isActive: true,
              sortOrder: nextSortOrder++
            }
          });
          createdFields += 1;
          continue;
        }

        if (!existing.isActive) {
          await tx.moduleField.update({
            where: { id: existing.id },
            data: { isActive: true }
          });
          reactivatedFields += 1;
          continue;
        }

        skippedFields += 1;
      }

      return { createdFields, reactivatedFields, skippedFields };
    });

    details.push({
      moduleId: module.id,
      moduleKey: module.key,
      moduleName: module.name,
      createdFields: result.createdFields,
      reactivatedFields: result.reactivatedFields,
      skippedFields: result.skippedFields
    });
  }

  return {
    appliedModules: details.length,
    createdFields: details.reduce((sum, item) => sum + item.createdFields, 0),
    reactivatedFields: details.reduce((sum, item) => sum + item.reactivatedFields, 0),
    skippedFields: details.reduce((sum, item) => sum + item.skippedFields, 0),
    details
  };
}
