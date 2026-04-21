import type { PermissionLevel } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

export async function requirePermission(moduleKey: string, required: PermissionLevel = "VIEW") {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const level = perms[moduleKey];
  if (!level || !atLeastLevel(level, required)) redirect("/dashboard");
  return { session, level };
}
