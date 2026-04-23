import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { requirePermission } from "@/lib/require-permission";
import { markAllReadAction, markNotificationReadAction } from "./actions";
import Link from "next/link";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function NotificationsPage() {
  await requirePermission("NOTIFICATIONS", "VIEW");
  const session = await requireSession();
  const notifications = await prisma.notification.findMany({
    where: { schoolId: session.schoolId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter(n => !n.readAt).length;
  const normalized = notifications.map((n) => {
    const body = n.body ?? "";
    const match = body.match(/(?:^|\n)LINK:(\/[^\s]+)/);
    const deepLink = match?.[1] ?? null;
    const cleanBody = match ? body.replace(match[0], "").trim() : body;
    return { ...n, deepLink, cleanBody };
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <SectionHeader
          title="Notifications"
          subtitle={unread > 0 ? `${unread} unread notification${unread !== 1 ? "s" : ""}` : "All caught up"}
        />
        {unread > 0 && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="secondary" size="sm">Mark all read</Button>
          </form>
        )}
      </div>

      <Card>
        {notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications" description="You're all caught up! New alerts will appear here." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {normalized.map((n, i) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-3.5 sm:px-4 py-3.5 transition-colors
                             ${!n.readAt ? "bg-indigo-500/[0.04]" : "hover:bg-white/[0.02]"}
                             ${i === 0 ? "rounded-t-[16px]" : ""}
                             ${i === notifications.length - 1 ? "rounded-b-[16px]" : ""}`}
              >
                {/* Dot indicator */}
                <div className="mt-1.5 shrink-0">
                  {!n.readAt ? (
                    <span className="block h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-white/15" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[14px] font-semibold text-white/90">{n.title}</span>
                    {!n.readAt && <Badge tone="info">New</Badge>}
                  </div>
                  {n.cleanBody ? <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{n.cleanBody}</p> : null}
                  <p className="mt-2 text-[11px] text-white/30">{timeAgo(n.createdAt)}</p>
                  {n.deepLink ? (
                    <Link
                      href={n.deepLink}
                      className="mt-2 inline-flex rounded-[10px] border border-white/[0.12] px-2.5 py-1.5 text-[11px] text-white/75 hover:bg-white/[0.06]"
                    >
                      Open live tracking
                    </Link>
                  ) : null}
                </div>

                {/* Mark read action */}
                {!n.readAt && (
                  <form action={markNotificationReadAction} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">✓</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
