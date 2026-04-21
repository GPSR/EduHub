import { Card, Button, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { markAllReadAction, markNotificationReadAction } from "./actions";

export default async function NotificationsPage() {
  const session = await requireSession();
  const notifications = await prisma.notification.findMany({
    where: { schoolId: session.schoolId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <Card title="Notifications" description="Updates and alerts for your account.">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-white/70">
          {unread > 0 ? <Badge tone="info">{unread} unread</Badge> : <Badge>All caught up</Badge>}
        </div>
        <form action={markAllReadAction}>
          <Button type="submit" variant="secondary" disabled={unread === 0}>
            Mark all read
          </Button>
        </form>
      </div>

      <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
        {notifications.map((n) => (
          <div key={n.id} className="px-4 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">{n.title}</div>
                {!n.readAt ? <Badge tone="info">NEW</Badge> : null}
              </div>
              {n.body ? <div className="mt-1 text-sm text-white/70 whitespace-pre-wrap">{n.body}</div> : null}
              <div className="mt-2 text-xs text-white/50">{n.createdAt.toDateString()}</div>
            </div>
            {!n.readAt ? (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="id" value={n.id} />
                <Button type="submit" variant="secondary">
                  Mark read
                </Button>
              </form>
            ) : null}
          </div>
        ))}
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-sm text-white/60">No notifications yet.</div>
        ) : null}
      </div>
    </Card>
  );
}

