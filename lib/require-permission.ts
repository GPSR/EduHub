import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require";
import type { PermissionLevel } from "@/lib/db-types";
import { atLeastLevel, ensureSchoolModuleRow, getEffectivePermissions, type ModuleKey } from "@/lib/permissions";

export async function requirePermission(moduleKey: string, required: PermissionLevel = "VIEW") {
  const session = await requireSession();
  const autoEnsureModules = new Set<ModuleKey>([
    "GALLERY",
    "LEARNING_CENTER",
    "YOUTUBE_LEARNING",
    "SCHOOL_CALENDAR",
    "LEAVE_REQUESTS",
    "TEACHER_SALARY"
  ]);
  if (autoEnsureModules.has(moduleKey as ModuleKey)) {
    await ensureSchoolModuleRow(session.schoolId, moduleKey as ModuleKey);
  }
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const level = perms[moduleKey];
  if (!level || !atLeastLevel(level, required)) redirect("/dashboard");
  return { session, level };
}
