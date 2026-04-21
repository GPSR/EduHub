import type { PermissionLevel } from "@prisma/client";
import { prisma } from "@/lib/db";

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
  await prisma.$transaction(
    DEFAULT_MODULES.map((m) =>
      prisma.module.upsert({
        where: { key: m.key },
        update: { name: m.name },
        create: { key: m.key, name: m.name }
      })
    )
  );
}

export async function seedSchoolModulesAndRolePerms(schoolId: string) {
  await ensureBaseModules();

  // Ensure system roles exist per school (enables custom roles later).
  await prisma.$transaction(
    SYSTEM_ROLES.map((r) =>
      prisma.schoolRole.upsert({
        where: { schoolId_key: { schoolId, key: r.key } },
        update: { name: r.name, isSystem: true },
        create: { schoolId, key: r.key, name: r.name, isSystem: true }
      })
    )
  );

  const modules = await prisma.module.findMany({ select: { id: true, key: true } });
  const moduleIdByKey = new Map(modules.map((m) => [m.key as ModuleKey, m.id]));

  const enableKeys = new Set(DEFAULT_MODULES.filter((m) => m.mvp).map((m) => m.key));

  await prisma.$transaction(
    modules.map((m) =>
      prisma.schoolModule.upsert({
        where: { schoolId_moduleId: { schoolId, moduleId: m.id } },
        update: { enabled: enableKeys.has(m.key as ModuleKey) },
        create: { schoolId, moduleId: m.id, enabled: enableKeys.has(m.key as ModuleKey) }
      })
    )
  );

  const roleIdByKey = new Map(
    (await prisma.schoolRole.findMany({ where: { schoolId }, select: { id: true, key: true } })).map((r) => [
      r.key,
      r.id
    ])
  );

  const setRoleModuleLevel = async (roleKey: string, moduleKey: ModuleKey, level: PermissionLevel) => {
    const schoolRoleId = roleIdByKey.get(roleKey);
    const moduleId = moduleIdByKey.get(moduleKey);
    if (!moduleId || !schoolRoleId) return;
    await prisma.roleModulePermission.upsert({
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

  // Teachers
  for (const key of ["DASHBOARD", "STUDENTS", "ATTENDANCE", "TIMETABLE", "COMMUNICATION", "HOMEWORK", "PROGRESS_CARD"] as const) {
    await setRoleModuleLevel("TEACHER", key, "EDIT");
    await setRoleModuleLevel("CLASS_TEACHER", key, "EDIT");
  }
  await setRoleModuleLevel("TEACHER", "REPORTS", "VIEW");
  await setRoleModuleLevel("CLASS_TEACHER", "REPORTS", "VIEW");

  // Parents: view-only on relevant modules
  for (const key of ["DASHBOARD", "STUDENTS", "FEES", "ATTENDANCE", "TIMETABLE", "COMMUNICATION", "HOMEWORK", "PROGRESS_CARD"] as const) {
    await setRoleModuleLevel("PARENT", key, "VIEW");
  }

  // Transport (bus assistant)
  await setRoleModuleLevel("BUS_ASSISTANT", "TRANSPORT", "EDIT");
  await setRoleModuleLevel("BUS_ASSISTANT", "STUDENTS", "VIEW");

  // Correspondent: high-level view + approvals on comms
  for (const key of ["DASHBOARD", "FEES", "REPORTS"] as const) {
    await setRoleModuleLevel("CORRESPONDENT", key, "VIEW");
  }
  await setRoleModuleLevel("CORRESPONDENT", "COMMUNICATION", "APPROVE");
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
  const [schoolModules, rolePerms, userPerms] = await Promise.all([
    prisma.schoolModule.findMany({
      where: { schoolId, enabled: true },
      select: { module: { select: { key: true } } }
    }),
    prisma.roleModulePermission.findMany({
      where: { schoolId, schoolRoleId: roleId },
      select: { module: { select: { key: true } }, level: true }
    }),
    prisma.userModulePermission.findMany({
      where: { schoolId, userId },
      select: { module: { select: { key: true } }, level: true }
    })
  ]);

  const enabled = new Set(schoolModules.map((m) => m.module.key));
  const map: Record<string, PermissionLevel> = {};

  for (const p of rolePerms) {
    if (!enabled.has(p.module.key)) continue;
    map[p.module.key] = p.level;
  }
  for (const p of userPerms) {
    if (!enabled.has(p.module.key)) continue;
    map[p.module.key] = p.level; // user override wins
  }

  return map;
}
