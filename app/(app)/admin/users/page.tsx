import { Card, Badge, Button, Select, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { deleteUserAction, sendUserPasswordResetAction, setUserActiveAction, updateUserRoleAction } from "./actions";
import { AdminCreateUserPanel } from "@/components/admin-create-user-panel";
import { UserPasswordUpdateForm } from "./user-password-form";

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
      include: { schoolRole: true, classAssignments: { include: { class: true } } },
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

  const userIds = users.map((u) => u.id);
  const [feedCounts, recentFeedPosts] = userIds.length
    ? await Promise.all([
        prisma.feedPost.groupBy({
          by: ["authorId"],
          where: { schoolId: session.schoolId, authorId: { in: userIds } },
          _count: { _all: true }
        }),
        prisma.feedPost.findMany({
          where: { schoolId: session.schoolId, authorId: { in: userIds } },
          select: { id: true, authorId: true, title: true, scope: true, classId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 700
        })
      ])
    : [[], []];

  const classLabelById = new Map(classes.map((c) => [c.id, `${c.name}${c.section ? `-${c.section}` : ""}`]));
  const feedCountByAuthorId = new Map(feedCounts.map((entry) => [entry.authorId, entry._count._all]));
  const recentFeedByAuthorId = new Map<string, Array<{ id: string; title: string; scope: string; classId: string | null; createdAt: Date }>>();
  for (const post of recentFeedPosts) {
    const existing = recentFeedByAuthorId.get(post.authorId) ?? [];
    if (existing.length >= 3) continue;
    existing.push(post);
    recentFeedByAuthorId.set(post.authorId, existing);
  }

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
            const classLabels = u.classAssignments.map((assignment) => classLabelById.get(assignment.classId) ?? assignment.class.name).filter(Boolean);
            const feedCount = feedCountByAuthorId.get(u.id) ?? 0;
            const recentFeed = recentFeedByAuthorId.get(u.id) ?? [];
            return (
              <div
                key={u.id}
                id={`user-${u.id}`}
                className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-3.5 sm:px-4 py-4
                             scroll-mt-24 target:bg-indigo-500/[0.08]
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

                <details className="w-full rounded-[12px] border border-white/[0.07] bg-white/[0.03]">
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white/55">
                    View User Information
                  </summary>
                  <div className="border-t border-white/[0.07] px-3 py-3 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-2">Contact Information</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <InfoField label="Email" value={u.email} />
                        <InfoField label="Phone" value={u.phoneNumber ?? "—"} />
                        <InfoField label="Alternate Phone" value={u.alternatePhoneNumber ?? "—"} />
                        <InfoField label="Address" value={u.address ?? "—"} />
                        <InfoField label="Location" value={[u.city, u.state, u.country].filter(Boolean).join(", ") || "—"} />
                        <InfoField label="Postal Code" value={u.postalCode ?? "—"} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-2">Academic Information</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <InfoField label="Role" value={u.schoolRole.name} />
                        <InfoField label="Class Assignments" value={classLabels.length ? classLabels.join(", ") : "No class assigned"} />
                        <InfoField label="Class Teacher" value={u.classAssignments.some((a) => a.isClassTeacher) ? "Yes" : "No"} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-2">Feed Information</p>
                      <div className="rounded-[10px] border border-white/[0.07] bg-black/20 p-3">
                        <p className="text-[13px] text-white/80 mb-2">
                          Total posts: <span className="font-semibold text-indigo-300">{feedCount}</span>
                        </p>
                        {recentFeed.length === 0 ? (
                          <p className="text-[12px] text-white/45">No feed posts yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {recentFeed.map((post) => (
                              <p key={post.id} className="text-[12px] text-white/65 break-words">
                                {post.title} · {post.scope === "CLASS" ? `Class ${post.classId && classLabelById.get(post.classId) ? classLabelById.get(post.classId) : "Feed"}` : "School Feed"} · {post.createdAt.toDateString()}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-2">Security</p>
                      <div className="rounded-[10px] border border-white/[0.07] bg-black/20 p-3">
                        <p className="mb-3 text-[12px] text-white/55">
                          Set a new password directly for this user. Existing unused reset links will be invalidated.
                        </p>
                        <UserPasswordUpdateForm userId={u.id} />
                      </div>
                    </div>
                  </div>
                </details>
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[13px] text-white/80 break-words">{value}</p>
    </div>
  );
}
