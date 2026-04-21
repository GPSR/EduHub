import { Card, Button, Input, Label, Textarea, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

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

export default async function FeedPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId,
  });
  const canPost = perms["COMMUNICATION"] ? atLeastLevel(perms["COMMUNICATION"], "EDIT") : false;
  const posts = await prisma.feedPost.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="School Feed" subtitle="Announcements and updates" />
      </div>

      {canPost && <CreatePostCard />}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <Card>
            <EmptyState icon="📢" title="No announcements yet" description="Post an update for your school community." />
          </Card>
        ) : (
          posts.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-[20px] border border-white/[0.08] bg-white/[0.04]
                          p-5 hover:bg-white/[0.055] transition-all duration-200
                          animate-fade-up`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Post header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]
                                  bg-gradient-to-b from-indigo-500/30 to-violet-500/20
                                  border border-indigo-400/20 text-lg">
                    📢
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white/90">{p.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">School Announcement</p>
                  </div>
                </div>
                <span className="text-[11px] text-white/35 shrink-0 mt-0.5">{timeAgo(p.createdAt)}</span>
              </div>
              {/* Body */}
              <p className="text-[14px] text-white/70 leading-relaxed whitespace-pre-wrap pl-12">{p.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function CreatePostCard() {
  const { createPostAction } = await import("./actions");
  return (
    <Card title="New Announcement" description="Share an update with your school" accent="indigo">
      <form action={createPostAction} className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input name="title" placeholder="Holiday Notice, Exam Schedule…" required />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea name="body" rows={4} placeholder="Write the announcement…" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Publish →</Button>
        </div>
      </form>
    </Card>
  );
}
