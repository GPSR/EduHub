import { Card, Badge, Button, Select, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { deleteUserAction, sendUserPasswordResetAction, setUserActiveAction, updateUserRoleAction } from "./actions";
import { AdminCreateUserPanel } from "@/components/admin-create-user-panel";

function avatarColor(name: string) {
  const colors = [
    "from-indigo-400 to-indigo-600",
    "from-violet-400 to-violet-600",
    "from-teal-400 to-teal-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { session } = await requirePermission("USERS", "ADMIN");
  const { reset } = await searchParams;

  const [users, students, classes, roles] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { schoolRole: true },
    }),
    prisma.student.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { fullName: "asc" },
      include: { class: true }
    }),
    prisma.class.findMany({ where: { schoolId: session.schoolId }, orderBy: [{ name: "asc" }, { section: "asc" }] }),
    prisma.schoolRole.findMany({ where: { schoolId: session.schoolId }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
  ]);

  const modules = await prisma.schoolModule.findMany({
    where: { schoolId: session.schoolId, enabled: true },
    include: { module: true },
    orderBy: { module: { name: "asc" } },
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Users" subtitle={`${users.length} user${users.length !== 1 ? "s" : ""} in your school`} />
      {reset === "sent" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Password reset email sent successfully. Link expires in 30 minutes.
        </div>
      )}
      {reset === "failed" && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Could not send password reset email. Please check email provider settings.
        </div>
      )}

      <Card>
        <div className="divide-y divide-white/[0.06]">
          {users.map((u, i) => {
            const initials = u.name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div
                key={u.id}
                className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-3.5 sm:px-4 py-4
                             ${i === 0 ? "rounded-t-[16px]" : ""}
                             ${i === users.length - 1 ? "rounded-b-[16px]" : ""}
                             ${!u.isActive ? "opacity-60" : ""}`}
              >
                {/* Avatar */}
                <div className={`hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-[11px]
                                  bg-gradient-to-b ${avatarColor(u.name)} text-xs font-bold text-white shadow-sm`}>
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-white/90">{u.name}</span>
                    <Badge tone={u.isActive ? "neutral" : "danger"}>{u.schoolRole.name}</Badge>
                    {!u.isActive && <Badge tone="danger">Inactive</Badge>}
                    {u.id === session.userId && <Badge tone="info">You</Badge>}
                  </div>
                  <p className="text-[12px] text-white/40 mt-0.5">{u.email} · Joined {u.createdAt.toDateString()}</p>
                </div>

                {/* Actions */}
                {u.schoolRole.key !== "ADMIN" && u.id !== session.userId && (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0">
                    <form action={updateUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <Select name="schoolRoleId" defaultValue={u.schoolRoleId} className="text-sm py-1.5 !mt-0">
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </Select>
                      <Button type="submit" variant="secondary" size="sm">Update</Button>
                    </form>
                    <form action={setUserActiveAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
                      <Button type="submit" variant={u.isActive ? "secondary" : "primary"} size="sm">
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <Button type="submit" variant="danger" size="sm">Delete</Button>
                    </form>
                    <form action={sendUserPasswordResetAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <Button type="submit" variant="secondary" size="sm">Send reset email</Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="px-4 py-10 text-sm text-white/50 text-center">No users yet.</div>
          )}
        </div>
      </Card>

      <AdminCreateUserPanel
        roles={roles.map(r => ({ id: r.id, key: r.key, name: r.name }))}
        modules={modules.map(m => ({ id: m.module.id, key: m.module.key, name: m.module.name }))}
        students={students.map(s => ({ id: s.id, fullName: s.fullName, classId: s.classId ?? null }))}
        classes={classes.map(c => ({ id: c.id, label: `${c.name}${c.section ? `-${c.section}` : ""}` }))}
      />
    </div>
  );
}
