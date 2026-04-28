import { db } from "@/lib/db";
import type { PermissionLevel } from "@/lib/db-types";

export type ModuleKey =
  | "DASHBOARD"
  | "STUDENTS"
  | "FEES"
  | "ATTENDANCE"
  | "TIMETABLE"
  | "COMMUNICATION"
  | "HOMEWORK"
  | "PROGRESS_CARD"
  | "REPORTS"
  | "ACADEMICS"
  | "NOTIFICATIONS"
  | "TRANSPORT"
  | "GALLERY"
  | "LEARNING_CENTER"
  | "YOUTUBE_LEARNING"
  | "SCHOOL_CALENDAR"
  | "LEAVE_REQUESTS"
  | "TEACHER_SALARY"
  | "SETTINGS"
  | "USERS";

export const DEFAULT_MODULES: Array<{ key: ModuleKey; name: string; mvp: boolean }> = [
  { key: "DASHBOARD", name: "Dashboard", mvp: true },
  { key: "STUDENTS", name: "Students", mvp: true },
  { key: "FEES", name: "Fees", mvp: true },
  { key: "ATTENDANCE", name: "Attendance", mvp: true },
  { key: "TIMETABLE", name: "Timetable", mvp: true },
  { key: "COMMUNICATION", name: "Communication", mvp: true },
  { key: "HOMEWORK", name: "Homework", mvp: true },
  { key: "PROGRESS_CARD", name: "Progress Card", mvp: true },
  { key: "REPORTS", name: "Reports", mvp: true },
  { key: "ACADEMICS", name: "Academics", mvp: false },
  { key: "NOTIFICATIONS", name: "Notifications", mvp: false },
  { key: "TRANSPORT", name: "Transport", mvp: false },
  { key: "GALLERY", name: "Gallery", mvp: true },
  { key: "LEARNING_CENTER", name: "Learning Center", mvp: true },
  { key: "YOUTUBE_LEARNING", name: "YouTube Learning", mvp: true },
  { key: "SCHOOL_CALENDAR", name: "School Calendar", mvp: true },
  { key: "LEAVE_REQUESTS", name: "Leave Requests", mvp: true },
  { key: "TEACHER_SALARY", name: "Teacher Salary", mvp: true },
  { key: "SETTINGS", name: "School Settings", mvp: true },
  { key: "USERS", name: "Users", mvp: true }
];

export const SYSTEM_ROLES: Array<{ key: string; name: string }> = [
  { key: "ADMIN", name: "Admin" },
  { key: "HEAD_MASTER", name: "Headmaster" },
  { key: "PRINCIPAL", name: "Principal" },
  { key: "CLASS_TEACHER", name: "Class Teacher" },
  { key: "TEACHER", name: "Teacher" },
  { key: "PARENT", name: "Parent" },
  { key: "BUS_ASSISTANT", name: "Bus Assistant" },
  { key: "CORRESPONDENT", name: "Correspondent" }
];

const LEVEL_RANK: Record<PermissionLevel, number> = {
  VIEW: 1,
  EDIT: 2,
  APPROVE: 3,
  ADMIN: 4
};

export function atLeastLevel(current: PermissionLevel, required: PermissionLevel) {
  return LEVEL_RANK[current] >= LEVEL_RANK[required];
}

export async function ensureBaseModules() {
  await db.$transaction(
    DEFAULT_MODULES.map((m) =>
      db.module.upsert({
        where: { key: m.key },
        update: { name: m.name },
        create: { key: m.key, name: m.name }
      })
    )
  );
}

export async function ensureSchoolModuleRow(schoolId: string, moduleKey: ModuleKey) {
  await ensureBaseModules();
  const module = await db.module.findUnique({
    where: { key: moduleKey },
    select: { id: true }
  });
  if (!module) return;

  const defaultEnabled = DEFAULT_MODULES.find((entry) => entry.key === moduleKey)?.mvp ?? false;

  await db.schoolModule.upsert({
    where: { schoolId_moduleId: { schoolId, moduleId: module.id } },
    update: {},
    create: {
      schoolId,
      moduleId: module.id,
      enabled: defaultEnabled
    }
  });
}

export async function seedSchoolModulesAndRolePerms(schoolId: string) {
  await ensureBaseModules();

  // Ensure system roles exist per school (enables custom roles later).
  await db.$transaction(
    SYSTEM_ROLES.map((r) =>
      db.schoolRole.upsert({
        where: { schoolId_key: { schoolId, key: r.key } },
        update: { name: r.name, isSystem: true },
        create: { schoolId, key: r.key, name: r.name, isSystem: true }
      })
    )
  );

  const modules = await db.module.findMany({ select: { id: true, key: true } });
  const moduleIdByKey = new Map(modules.map((m) => [m.key as ModuleKey, m.id]));

  const enableKeys = new Set(DEFAULT_MODULES.filter((m) => m.mvp).map((m) => m.key));

  await db.$transaction(
    modules.map((m) =>
      db.schoolModule.upsert({
        where: { schoolId_moduleId: { schoolId, moduleId: m.id } },
        update: { enabled: enableKeys.has(m.key as ModuleKey) },
        create: { schoolId, moduleId: m.id, enabled: enableKeys.has(m.key as ModuleKey) }
      })
    )
  );

  const roleIdByKey = new Map(
    (await db.schoolRole.findMany({ where: { schoolId }, select: { id: true, key: true } })).map((r) => [
      r.key,
      r.id
    ])
  );

  const setRoleModuleLevel = async (roleKey: string, moduleKey: ModuleKey, level: PermissionLevel) => {
    const schoolRoleId = roleIdByKey.get(roleKey);
    const moduleId = moduleIdByKey.get(moduleKey);
    if (!moduleId || !schoolRoleId) return;
    await db.roleModulePermission.upsert({
      where: { schoolId_schoolRoleId_moduleId: { schoolId, schoolRoleId, moduleId } },
      update: { level },
      create: { schoolId, schoolRoleId, moduleId, level }
    });
  };

  // Admin: full access to all enabled MVP modules
  for (const m of DEFAULT_MODULES.filter((x) => x.mvp)) {
    await setRoleModuleLevel("ADMIN", m.key, "ADMIN");
  }
  await setRoleModuleLevel("ADMIN", "USERS", "ADMIN");
  await setRoleModuleLevel("ADMIN", "SETTINGS", "ADMIN");

  // Headmaster/Principal: approve where relevant, otherwise admin-lite
  for (const key of ["DASHBOARD", "STUDENTS", "FEES", "ATTENDANCE", "TIMETABLE", "COMMUNICATION", "HOMEWORK", "PROGRESS_CARD", "REPORTS"] as const) {
    await setRoleModuleLevel("HEAD_MASTER", key, key === "COMMUNICATION" || key === "REPORTS" ? "APPROVE" : "EDIT");
    await setRoleModuleLevel("PRINCIPAL", key, key === "COMMUNICATION" || key === "REPORTS" ? "APPROVE" : "EDIT");
  }
  await setRoleModuleLevel("HEAD_MASTER", "GALLERY", "APPROVE");
  await setRoleModuleLevel("PRINCIPAL", "GALLERY", "APPROVE");
  await setRoleModuleLevel("HEAD_MASTER", "LEARNING_CENTER", "APPROVE");
  await setRoleModuleLevel("PRINCIPAL", "LEARNING_CENTER", "APPROVE");
  await setRoleModuleLevel("HEAD_MASTER", "YOUTUBE_LEARNING", "APPROVE");
  await setRoleModuleLevel("PRINCIPAL", "YOUTUBE_LEARNING", "APPROVE");
  await setRoleModuleLevel("HEAD_MASTER", "SCHOOL_CALENDAR", "EDIT");
  await setRoleModuleLevel("PRINCIPAL", "SCHOOL_CALENDAR", "EDIT");
  await setRoleModuleLevel("HEAD_MASTER", "LEAVE_REQUESTS", "APPROVE");
  await setRoleModuleLevel("PRINCIPAL", "LEAVE_REQUESTS", "APPROVE");
  await setRoleModuleLevel("HEAD_MASTER", "TEACHER_SALARY", "VIEW");
  await setRoleModuleLevel("PRINCIPAL", "TEACHER_SALARY", "VIEW");

  // Teachers
  for (const key of ["DASHBOARD", "STUDENTS", "ATTENDANCE", "TIMETABLE", "COMMUNICATION", "HOMEWORK", "PROGRESS_CARD", "GALLERY", "LEARNING_CENTER"] as const) {
    await setRoleModuleLevel("TEACHER", key, "EDIT");
    await setRoleModuleLevel("CLASS_TEACHER", key, "EDIT");
  }
  await setRoleModuleLevel("TEACHER", "YOUTUBE_LEARNING", "EDIT");
  await setRoleModuleLevel("CLASS_TEACHER", "YOUTUBE_LEARNING", "EDIT");
  await setRoleModuleLevel("TEACHER", "SCHOOL_CALENDAR", "EDIT");
  await setRoleModuleLevel("CLASS_TEACHER", "SCHOOL_CALENDAR", "EDIT");
  await setRoleModuleLevel("TEACHER", "LEAVE_REQUESTS", "EDIT");
  await setRoleModuleLevel("CLASS_TEACHER", "LEAVE_REQUESTS", "APPROVE");
  await setRoleModuleLevel("TEACHER", "REPORTS", "VIEW");
  await setRoleModuleLevel("CLASS_TEACHER", "REPORTS", "VIEW");

  // Parents: view-only on relevant modules
  for (const key of ["DASHBOARD", "STUDENTS", "FEES", "ATTENDANCE", "TIMETABLE", "COMMUNICATION", "HOMEWORK", "PROGRESS_CARD", "GALLERY", "LEARNING_CENTER"] as const) {
    await setRoleModuleLevel("PARENT", key, "VIEW");
  }
  await setRoleModuleLevel("PARENT", "YOUTUBE_LEARNING", "VIEW");
  await setRoleModuleLevel("PARENT", "SCHOOL_CALENDAR", "VIEW");
  await setRoleModuleLevel("PARENT", "LEAVE_REQUESTS", "EDIT");

  // Transport (bus assistant)
  await setRoleModuleLevel("BUS_ASSISTANT", "TRANSPORT", "EDIT");
  await setRoleModuleLevel("BUS_ASSISTANT", "GALLERY", "VIEW");
  await setRoleModuleLevel("BUS_ASSISTANT", "LEARNING_CENTER", "VIEW");
  await setRoleModuleLevel("BUS_ASSISTANT", "SCHOOL_CALENDAR", "VIEW");

  // Correspondent: high-level view + approvals on comms
  for (const key of ["DASHBOARD", "FEES", "REPORTS", "GALLERY", "LEARNING_CENTER", "YOUTUBE_LEARNING", "SCHOOL_CALENDAR"] as const) {
    await setRoleModuleLevel("CORRESPONDENT", key, "VIEW");
  }
  await setRoleModuleLevel("CORRESPONDENT", "COMMUNICATION", "APPROVE");
  await setRoleModuleLevel("CORRESPONDENT", "LEAVE_REQUESTS", "VIEW");
}

export async function getEffectivePermissions({
  schoolId,
  userId,
  roleId
}: {
  schoolId: string;
  userId: string;
  roleId: string;
}): Promise<Record<string, PermissionLevel>> {
  const [schoolModules, rolePerms, userPerms, role] = await Promise.all([
    db.schoolModule.findMany({
      where: { schoolId },
      select: { enabled: true, module: { select: { key: true } } }
    }),
    db.roleModulePermission.findMany({
      where: { schoolId, schoolRoleId: roleId },
      select: { module: { select: { key: true } }, level: true }
    }),
    db.userModulePermission.findMany({
      where: { schoolId, userId },
      select: { module: { select: { key: true } }, level: true }
    }),
    db.schoolRole.findUnique({
      where: { id: roleId },
      select: { key: true }
    })
  ]);

  const enabled = new Set(schoolModules.filter((m) => m.enabled).map((m) => m.module.key));
  const moduleStateByKey = new Map(schoolModules.map((m) => [m.module.key, m.enabled]));
  const map: Record<string, PermissionLevel> = {};

  for (const p of rolePerms) {
    if (!enabled.has(p.module.key)) continue;
    map[p.module.key] = p.level;
  }
  for (const p of userPerms) {
    if (!enabled.has(p.module.key)) continue;
    map[p.module.key] = p.level; // user override wins
  }

  // Transport defaults: keep tracking visible to all school personas when module is enabled.
  if (enabled.has("TRANSPORT") && !map.TRANSPORT) {
    if (role?.key === "BUS_ASSISTANT") map.TRANSPORT = "EDIT";
    else if (role?.key === "ADMIN") map.TRANSPORT = "ADMIN";
    else map.TRANSPORT = "VIEW";
  }

  const galleryNotConfigured = !moduleStateByKey.has("GALLERY");
  const learningCenterNotConfigured = !moduleStateByKey.has("LEARNING_CENTER");
  const youtubeLearningNotConfigured = !moduleStateByKey.has("YOUTUBE_LEARNING");
  const calendarNotConfigured = !moduleStateByKey.has("SCHOOL_CALENDAR");
  const leaveRequestsNotConfigured = !moduleStateByKey.has("LEAVE_REQUESTS");
  const teacherSalaryNotConfigured = !moduleStateByKey.has("TEACHER_SALARY");

  if ((enabled.has("GALLERY") || galleryNotConfigured) && !map.GALLERY) {
    if (role?.key === "ADMIN") map.GALLERY = "ADMIN";
    else if (role?.key === "HEAD_MASTER" || role?.key === "PRINCIPAL") map.GALLERY = "APPROVE";
    else if (role?.key === "TEACHER" || role?.key === "CLASS_TEACHER") map.GALLERY = "EDIT";
    else map.GALLERY = "VIEW";
  }

  if ((enabled.has("LEARNING_CENTER") || learningCenterNotConfigured) && !map.LEARNING_CENTER) {
    if (role?.key === "ADMIN") map.LEARNING_CENTER = "ADMIN";
    else if (role?.key === "HEAD_MASTER" || role?.key === "PRINCIPAL") map.LEARNING_CENTER = "APPROVE";
    else if (role?.key === "TEACHER" || role?.key === "CLASS_TEACHER") map.LEARNING_CENTER = "EDIT";
    else map.LEARNING_CENTER = "VIEW";
  }

  if ((enabled.has("YOUTUBE_LEARNING") || youtubeLearningNotConfigured) && !map.YOUTUBE_LEARNING) {
    if (role?.key === "ADMIN") map.YOUTUBE_LEARNING = "ADMIN";
    else if (role?.key === "HEAD_MASTER" || role?.key === "PRINCIPAL") map.YOUTUBE_LEARNING = "APPROVE";
    else if (role?.key === "TEACHER" || role?.key === "CLASS_TEACHER") map.YOUTUBE_LEARNING = "EDIT";
    else map.YOUTUBE_LEARNING = "VIEW";
  }

  if ((enabled.has("SCHOOL_CALENDAR") || calendarNotConfigured) && !map.SCHOOL_CALENDAR) {
    if (role?.key === "ADMIN") map.SCHOOL_CALENDAR = "ADMIN";
    else if (
      role?.key === "HEAD_MASTER" ||
      role?.key === "PRINCIPAL" ||
      role?.key === "TEACHER" ||
      role?.key === "CLASS_TEACHER"
    )
      map.SCHOOL_CALENDAR = "EDIT";
    else map.SCHOOL_CALENDAR = "VIEW";
  }

  if ((enabled.has("LEAVE_REQUESTS") || leaveRequestsNotConfigured) && !map.LEAVE_REQUESTS) {
    if (role?.key === "ADMIN") map.LEAVE_REQUESTS = "ADMIN";
    else if (role?.key === "HEAD_MASTER" || role?.key === "PRINCIPAL" || role?.key === "CLASS_TEACHER")
      map.LEAVE_REQUESTS = "APPROVE";
    else if (role?.key === "TEACHER" || role?.key === "PARENT") map.LEAVE_REQUESTS = "EDIT";
    else map.LEAVE_REQUESTS = "VIEW";
  }

  if ((enabled.has("TEACHER_SALARY") || teacherSalaryNotConfigured) && !map.TEACHER_SALARY) {
    if (role?.key === "ADMIN") map.TEACHER_SALARY = "ADMIN";
    else if (role?.key === "HEAD_MASTER" || role?.key === "PRINCIPAL") map.TEACHER_SALARY = "VIEW";
  }

  return map;
}
