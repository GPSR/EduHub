import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Button, Select, Badge } from "@/components/ui";
import { deleteUserAction, setUserActiveAction, updateUserRoleAction } from "./actions";
import { AdminCreateUserPanel } from "@/components/admin-create-user-panel";

export default async function AdminUsersPage() {
  const { session } = await requirePermission("USERS", "ADMIN");

  const [users, students, classes, roles] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { schoolRole: true }
    }),
    prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" } }),
    prisma.class.findMany({ where: { schoolId: session.schoolId }, orderBy: [{ name: "asc" }, { section: "asc" }] })
    ,
    prisma.schoolRole.findMany({ where: { schoolId: session.schoolId }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] })
  ]);

  const modules = await prisma.schoolModule.findMany({
    where: { schoolId: session.schoolId, enabled: true },
    include: { module: true },
    orderBy: { module: { name: "asc" } }
  });

  return (
    <div className="space-y-6">
      <Card title="Users">
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">
                  {u.name} <span className="text-xs text-white/50">({u.schoolRole.name})</span>
                  {!u.isActive ? <span className="ml-2"><Badge tone="danger">Inactive</Badge></span> : null}
                </div>
                <div className="text-xs text-white/60">{u.email}</div>
              </div>
              {u.schoolRole.key === "ADMIN" ? (
                <div className="text-xs text-white/50">{u.createdAt.toDateString()}</div>
              ) : (
                <div className="flex items-center gap-2">
                  <form action={updateUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <Select name="schoolRoleId" defaultValue={u.schoolRoleId} className="text-sm">
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" variant="secondary" disabled={u.id === session.userId}>
                      Update role
                    </Button>
                  </form>
                  <form action={setUserActiveAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
                    <Button type="submit" variant={u.isActive ? "secondary" : "primary"} disabled={u.id === session.userId}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <form action={deleteUserAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <Button type="submit" variant="danger" disabled={u.id === session.userId}>
                      Delete
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 ? <div className="px-4 py-8 text-sm text-white/60">No users.</div> : null}
        </div>
      </Card>

      <AdminCreateUserPanel
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name }))}
        modules={modules.map((m) => ({ id: m.module.id, key: m.module.key, name: m.module.name }))}
        students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
        classes={classes.map((c) => ({
          id: c.id,
          label: `${c.name}${c.section ? `-${c.section}` : ""}`
        }))}
      />
    </div>
  );
}
