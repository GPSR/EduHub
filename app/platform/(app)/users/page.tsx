import { Card, Badge, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-require";
import { ApprovePlatformUserForm, CreatePlatformUserForm, ManagePlatformUserForm } from "./ui";

export default async function PlatformUsersPage() {
  await requireSuperAdmin();
  const [platformUsers, schools] = await Promise.all([
    prisma.platformUser.findMany({
      where: { role: { not: "SUPER_ADMIN" } },
      include: { schoolAssignments: { include: { school: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.school.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);

  const pending  = platformUsers.filter(u => u.status === "PENDING");
  const approved = platformUsers.filter(u => u.status !== "PENDING");

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Platform Users" subtitle="Manage support staff and their school assignments" />

      {/* Create new user */}
      <Card title="Invite Support User" description="New users require super admin approval before accessing the platform." accent="indigo">
        <CreatePlatformUserForm />
      </Card>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card title="Pending Approval" accent="amber">
          <div className="space-y-4 mt-1">
            {pending.map(u => (
              <div key={u.id} className="rounded-[16px] border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-white/90">{u.name}</p>
                    <p className="text-[12px] text-white/45">{u.email} · {u.role}</p>
                  </div>
                  <Badge tone="warning" dot>Pending</Badge>
                </div>
                <ApprovePlatformUserForm platformUserId={u.id} schools={schools} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active users */}
      <Card title="Support Users" description={`${approved.length} user${approved.length !== 1 ? "s" : ""}`}>
        {approved.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/40">No approved support users yet.</div>
        ) : (
          <div className="space-y-3 mt-1">
            {approved.map(u => {
              const initials = u.name.trim().split(/\s+/).map((p: string) => p[0]).slice(0,2).join("").toUpperCase();
              return (
                <div key={u.id} className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]
                                      bg-gradient-to-b from-indigo-400 to-indigo-600 text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white/90">{u.name}</p>
                        <p className="text-[12px] text-white/45">{u.email} · {u.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={u.status === "APPROVED" ? "success" : "danger"}>{u.status}</Badge>
                      <Badge tone={u.isActive ? "success" : "danger"} dot>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                  <ManagePlatformUserForm
                    platformUserId={u.id} name={u.name} email={u.email}
                    isActive={u.isActive} schools={schools}
                    assignedSchoolIds={u.schoolAssignments.map(a => a.schoolId)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
