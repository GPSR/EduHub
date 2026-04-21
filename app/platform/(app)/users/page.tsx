import { Card, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ApprovePlatformUserForm, CreatePlatformUserForm, ManagePlatformUserForm } from "./ui";

export default async function PlatformUsersPage() {
  await requireSuperAdmin();

  const [platformUsers, schools] = await Promise.all([
    prisma.platformUser.findMany({
      where: { role: { not: "SUPER_ADMIN" } },
      include: { schoolAssignments: { include: { school: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.school.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" }, take: 300 })
  ]);

  return (
    <div className="space-y-6">
      <Card title="Create Platform User" description="Create support platform users (requires super admin approval).">
        <CreatePlatformUserForm />
      </Card>

      <Card title="Platform Users Approval">
        <div className="space-y-4">
          {platformUsers.map((u) => (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-white/60">{u.email} • {u.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={u.status === "APPROVED" ? "success" : u.status === "PENDING" ? "info" : "danger"}>{u.status}</Badge>
                  <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                </div>
              </div>

              {u.status === "PENDING" ? (
                <div className="mt-4">
                  <ApprovePlatformUserForm platformUserId={u.id} schools={schools} />
                </div>
              ) : (
                <div className="mt-4">
                  <ManagePlatformUserForm
                    platformUserId={u.id}
                    name={u.name}
                    email={u.email}
                    isActive={u.isActive}
                    schools={schools}
                    assignedSchoolIds={u.schoolAssignments.map((a) => a.schoolId)}
                  />
                </div>
              )}
            </div>
          ))}
          {platformUsers.length === 0 ? <div className="text-sm text-white/60">No platform support users found.</div> : null}
        </div>
      </Card>
    </div>
  );
}
