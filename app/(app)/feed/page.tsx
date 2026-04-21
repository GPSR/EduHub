import { Card, Button, Input, Label, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";

export default async function FeedPage() {
  const session = await requireSession();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const canPost = perms["COMMUNICATION"] ? atLeastLevel(perms["COMMUNICATION"], "EDIT") : false;
  const posts = await prisma.feedPost.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-6">
      <Card title="School Feed">
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-white/50">{p.createdAt.toDateString()}</div>
              </div>
              <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{p.body}</div>
            </div>
          ))}
          {posts.length === 0 ? <div className="text-sm text-white/60">No announcements yet.</div> : null}
        </div>
      </Card>

      {canPost ? <CreatePostCard /> : null}
    </div>
  );
}

async function CreatePostCard() {
  const { createPostAction } = await import("./actions");
  return (
    <Card title="Post Announcement">
      <form action={createPostAction} className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input name="title" placeholder="Holiday Notice" required />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea name="body" rows={5} placeholder="Write the announcement..." required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Post</Button>
        </div>
      </form>
    </Card>
  );
}
