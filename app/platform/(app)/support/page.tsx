import Link from "next/link";
import { Badge, Button, Card, EmptyState, Label, SectionHeader, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";
import { LiveChatRefresh } from "@/components/live-chat-refresh";

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function PlatformSupportPage({
  searchParams
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { session } = await requirePlatformUser();
  const { conversationId } = await searchParams;

  let loadError: string | null = null;
  let conversations: any[] = [];
  try {
    conversations = await prisma.supportConversation.findMany({
      where: {
        platformParticipants: { some: { platformUserId: session.platformUserId } }
      },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        schoolParticipants: {
          include: {
            user: { select: { id: true, name: true, schoolRole: { select: { name: true } } } }
          }
        },
        platformParticipants: {
          include: {
            platformUser: { select: { id: true, name: true } }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            senderType: true,
            senderSchoolUser: { select: { name: true } },
            senderPlatformUser: { select: { name: true } }
          }
        }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 120
    });
  } catch (error) {
    console.error("platform support conversations load failed", error);
    loadError = "Support chat is temporarily unavailable. Please refresh and try again.";
  }

  const selectedConversation =
    conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0] ?? null;

  if (selectedConversation?.lastMessageAt) {
    const myParticipant = selectedConversation.platformParticipants.find(
      (participant: any) => participant.platformUserId === session.platformUserId
    );
    const isUnread = !myParticipant?.lastReadAt || myParticipant.lastReadAt < selectedConversation.lastMessageAt;
    if (isUnread) {
      try {
        await prisma.supportConversationPlatformParticipant.updateMany({
          where: {
            conversationId: selectedConversation.id,
            platformUserId: session.platformUserId,
            OR: [{ lastReadAt: null }, { lastReadAt: { lt: selectedConversation.lastMessageAt } }]
          },
          data: { lastReadAt: new Date() }
        });
      } catch (error) {
        console.error("platform support read-receipt update failed", error);
      }
    }
  }

  let messages: any[] = [];
  if (selectedConversation) {
    try {
      messages = await prisma.supportMessage.findMany({
        where: { conversationId: selectedConversation.id },
        include: {
          senderSchoolUser: { select: { id: true, name: true, schoolRole: { select: { name: true } } } },
          senderPlatformUser: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "asc" },
        take: 500
      });
    } catch (error) {
      console.error("platform support messages load failed", error);
      loadError = loadError ?? "Support messages are temporarily unavailable. Please refresh and try again.";
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <LiveChatRefresh />
      <SectionHeader
        title="Platform Support Chat"
        subtitle="Reply to school-admin conversations opened from school support"
      />

      {loadError ? (
        <div className="rounded-[12px] border border-rose-500/25 bg-rose-500/12 px-3.5 py-2.5 text-[12px] text-rose-100">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <Card title="Support Threads" description={`${conversations.length} conversation(s)`} accent="indigo">
          {conversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No support threads"
              description="School admins can open platform support chats from their support page."
            />
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const myParticipant = conversation.platformParticipants.find(
                  (participant: any) => participant.platformUserId === session.platformUserId
                );
                const unread = Boolean(
                  conversation.lastMessageAt &&
                    (!myParticipant?.lastReadAt || myParticipant.lastReadAt < conversation.lastMessageAt)
                );
                const lastMessage = conversation.messages[0];
                const schoolLead = conversation.schoolParticipants
                  .map(
                    (participant: any) =>
                      `${participant.user.name}${participant.user.schoolRole?.name ? ` (${participant.user.schoolRole.name})` : ""}`
                  )
                  .slice(0, 2)
                  .join(", ");

                return (
                  <Link
                    key={conversation.id}
                    href={`/platform/support?conversationId=${encodeURIComponent(conversation.id)}`}
                    className={[
                      "block rounded-[14px] border px-3 py-2.5 transition",
                      selectedConversation?.id === conversation.id
                        ? "border-blue-400/35 bg-blue-500/[0.14]"
                        : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white/90">{conversation.subject}</p>
                        <p className="truncate text-[11px] text-white/45">
                          {conversation.school.name} ({conversation.school.slug})
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge tone="info">Platform</Badge>
                        {conversation.status === "CLOSED" ? <Badge tone="neutral">Closed</Badge> : null}
                        {unread ? <Badge tone="warning">Unread</Badge> : null}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-white/58">
                      {lastMessage ? lastMessage.body : schoolLead || "No messages yet"}
                    </p>
                    <p className="mt-1 text-[11px] text-white/35">
                      {conversation.lastMessageAt ? timeAgo(conversation.lastMessageAt) : timeAgo(conversation.createdAt)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title={selectedConversation ? selectedConversation.subject : "Thread"}
          description={
            selectedConversation
              ? `${selectedConversation.school.name} · ${selectedConversation.school.slug}`
              : "Select a conversation"
          }
          accent="teal"
        >
          {!selectedConversation ? (
            <EmptyState icon="💬" title="Choose a thread" description="Pick a support conversation from the list." />
          ) : (
            <div className="space-y-4">
              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {messages.map((message) => {
                  const mine = message.senderType === "PLATFORM_USER" && message.senderPlatformUserId === session.platformUserId;
                  const senderLabel =
                    message.senderType === "PLATFORM_USER"
                      ? `${message.senderPlatformUser?.name ?? "Platform user"} (Platform)`
                      : `${message.senderSchoolUser?.name ?? "School user"}${message.senderSchoolUser?.schoolRole?.name ? ` (${message.senderSchoolUser.schoolRole.name})` : ""}`;

                  return (
                    <article
                      key={message.id}
                      className={[
                        "max-w-[92%] rounded-[14px] border px-3 py-2.5",
                        mine
                          ? "ml-auto border-cyan-300/35 bg-cyan-500/[0.16]"
                          : "mr-auto border-white/[0.10] bg-white/[0.04]"
                      ].join(" ")}
                    >
                      <p className="mb-1 text-[11px] text-white/45">{senderLabel}</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/85">{message.body}</p>
                      <p className="mt-1 text-[11px] text-white/35">{timeAgo(message.createdAt)}</p>
                    </article>
                  );
                })}
                {messages.length === 0 ? <p className="text-sm text-white/50">No messages yet.</p> : null}
              </div>

              {selectedConversation.status === "OPEN" ? (
                <ReplyPlatformSupportCard conversationId={selectedConversation.id} />
              ) : (
                <div className="rounded-[12px] border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-sm text-white/55">
                  Conversation is closed.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

async function ReplyPlatformSupportCard({ conversationId }: { conversationId: string }) {
  const { closePlatformSupportConversationAction, sendPlatformSupportMessageAction } = await import("./actions");

  return (
    <div className="space-y-3">
      <form action={sendPlatformSupportMessageAction} className="space-y-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <div>
          <Label required>Reply</Label>
          <Textarea name="body" rows={3} placeholder="Type your platform response" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Send reply</Button>
        </div>
      </form>

      <form action={closePlatformSupportConversationAction} className="flex justify-end">
        <input type="hidden" name="conversationId" value={conversationId} />
        <Button type="submit" variant="secondary">Close chat</Button>
      </form>
    </div>
  );
}
