import { Card, Button, Input, Label, Textarea, SectionHeader, EmptyState, Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import Link from "next/link";
import { markFeedSeen } from "@/lib/feed-unread";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toDateString();
}

export default async function FeedPage({
  searchParams,
}: { searchParams: Promise<{ classId?: string }> }) {
  await requirePermission("COMMUNICATION", "VIEW");
  const session = await requireSession();
  const { classId: filterClassId } = await searchParams;
  const perms   = await getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId });
  const canPost = perms["COMMUNICATION"] ? atLeastLevel(perms["COMMUNICATION"], "EDIT") : false;

  const classes = await db.class.findMany({
    where: { schoolId: session.schoolId }, orderBy: [{ name: "asc" }, { section: "asc" }],
  });

  // Parents only see school-wide + their children's class posts
  let classFilter: object = {};
  if (session.roleKey === "PARENT") {
    const childClassIds = (await db.student.findMany({
      where:  { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      select: { classId: true },
    })).map(s => s.classId).filter(Boolean) as string[];
    classFilter = { OR: [{ scope: "SCHOOL" }, { classId: { in: childClassIds } }] };
  } else if (filterClassId) {
    classFilter = { OR: [{ scope: "SCHOOL" }, { classId: filterClassId }] };
  }

  const posts = await db.feedPost.findMany({
    where:   { schoolId: session.schoolId, ...classFilter },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  // Get author names
  const authorIds = [...new Set(posts.map(p => p.authorId))];
  const authors   = await db.user.findMany({
    where:  { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorById = new Map(authors.map(u => [u.id, u.name]));

  // Class names lookup
  const classById = new Map(classes.map(c => [c.id, `${c.name}${c.section ? `-${c.section}` : ""}`]));

  await markFeedSeen(session.schoolId, session.userId);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="School Feed" subtitle="Announcements and updates" />
      </div>

      {canPost && <CreatePostCard classes={classes} />}

      {/* Class filter */}
      {classes.length > 0 && session.roleKey !== "PARENT" && (
        <div className="flex flex-wrap gap-2">
          <Link href="/feed">
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium border transition
              ${!filterClassId ? "bg-indigo-500/[0.18] border-indigo-400/30 text-white" : "border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.05]"}`}>
              📢 All
            </span>
          </Link>
          {classes.map(c => {
            const label = `${c.name}${c.section ? `-${c.section}` : ""}`;
            return (
              <Link key={c.id} href={`/feed?classId=${c.id}`}>
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium border transition
                  ${filterClassId === c.id ? "bg-indigo-500/[0.18] border-indigo-400/30 text-white" : "border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.05]"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <Card><EmptyState icon="📢" title="No announcements yet" description="Post an update for your school community." /></Card>
        ) : (
          posts.map((p, i) => {
            const isClassPost  = p.scope === "CLASS" && p.classId;
            const className    = isClassPost ? classById.get(p.classId!) : null;
            const authorName   = authorById.get(p.authorId) ?? "School";
            return (
              <div key={p.id}
                className={`rounded-[18px] sm:rounded-[20px] border p-4 sm:p-5 transition-all duration-200 hover:bg-white/[0.055] animate-fade-up
                             ${isClassPost ? "border-violet-500/20 bg-violet-500/[0.04]" : "border-white/[0.08] bg-white/[0.04]"}`}
                style={{ animationDelay: `${i * 40}ms` }}>

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border
                                     ${isClassPost ? "bg-violet-500/15 border-violet-400/20" : "bg-indigo-500/15 border-indigo-400/20"}`}>
                      <span className="text-lg">{isClassPost ? "🏫" : "📢"}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white/90">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-white/35">{authorName}</p>
                        {className && <Badge tone="neutral">{className}</Badge>}
                        {!isClassPost && <Badge tone="info">School-wide</Badge>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-white/30 shrink-0 mt-0.5">{timeAgo(p.createdAt)}</span>
                </div>

                <p className="text-[14px] text-white/70 leading-relaxed whitespace-pre-wrap pl-12">{p.body}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

async function CreatePostCard({ classes }: { classes: { id: string; name: string; section: string }[] }) {
  const { createPostAction } = await import("./actions");
  return (
    <Card title="New Announcement" description="Share with the whole school or a specific class" accent="indigo">
      <form action={createPostAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label required>Title</Label>
            <Input name="title" placeholder="Holiday Notice, Exam Schedule…" required />
          </div>
          <div>
            <Label>Target audience</Label>
            <select name="classId"
              className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-400/50 transition-all">
              <option value="">📢 Entire school</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  🏫 {c.name}{c.section ? `-${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label required>Message</Label>
          <Textarea name="body" rows={4} placeholder="Write the announcement…" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Publish →</Button>
        </div>
      </form>
    </Card>
  );
}
