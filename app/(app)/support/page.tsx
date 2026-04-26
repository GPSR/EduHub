import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatConversationTarget(args: {
  scope: "SCHOOL_INTERNAL" | "PLATFORM_SUPPORT";
  schoolParticipantLabels: string[];
  platformParticipantCount: number;
}) {
  if (args.scope === "PLATFORM_SUPPORT") {
    return args.platformParticipantCount > 0
      ? `Platform support (${args.platformParticipantCount})`
      : "Platform support";
  }
  if (args.schoolParticipantLabels.length === 0) return "School support";
  if (args.schoolParticipantLabels.length <= 2) return args.schoolParticipantLabels.join(", ");
  return `${args.schoolParticipantLabels.slice(0, 2).join(", ")} +${args.schoolParticipantLabels.length - 2}`;
}

export default async function SupportPage({
  searchParams
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const session = await requireSession();
  const { conversationId } = await searchParams;

  const conversations = await prisma.supportConversation.findMany({
    where: {
      schoolId: session.schoolId,
      schoolParticipants: { some: { userId: session.userId } }
    },
    include: {
      schoolParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              schoolRole: { select: { name: true } }
            }
          }
        }
      },
      platformParticipants: {
        select: {
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

  const selectedConversation =
    conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0] ?? null;

  if (selectedConversation?.lastMessageAt) {
    const myParticipant = selectedConversation.schoolParticipants.find((participant) => participant.userId === session.userId);
    const isUnread = !myParticipant?.lastReadAt || myParticipant.lastReadAt < selectedConversation.lastMessageAt;
    if (isUnread) {
      await prisma.supportConversationSchoolParticipant.updateMany({
        where: {
          conversationId: selectedConversation.id,
          userId: session.userId,
          OR: [{ lastReadAt: null }, { lastReadAt: { lt: selectedConversation.lastMessageAt } }]
        },
        data: { lastReadAt: new Date() }
      });
    }
  }

  const messages = selectedConversation
    ? await prisma.supportMessage.findMany({
        where: {
          conversationId: selectedConversation.id,
          schoolId: session.schoolId
        },
        include: {
          senderSchoolUser: { select: { id: true, name: true, schoolRole: { select: { name: true } } } },
          senderPlatformUser: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "asc" },
        take: 400
      })
    : [];

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Support Chat"
        subtitle="Thread-based support for parents, teachers, school admins, and platform users"
      />

      {session.roleKey === "PARENT" ? <CreateParentSupportCard /> : null}
      {session.roleKey === "ADMIN" ? <CreatePlatformSupportCard /> : null}
      {session.roleKey !== "ADMIN" && session.roleKey !== "PARENT" ? <CreateSchoolSupportCard /> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[350px_1fr] gap-4">
        <Card title="Conversations" description={`${conversations.length} thread(s)`} accent="indigo">
          {conversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No support conversations"
              description="Start your first support chat using the form above."
            />
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const myParticipant = conversation.schoolParticipants.find((participant) => participant.userId === session.userId);
                const unread = Boolean(
                  conversation.lastMessageAt &&
                    (!myParticipant?.lastReadAt || myParticipant.lastReadAt < conversation.lastMessageAt)
                );
                const lastMessage = conversation.messages[0];
                const participantNames = conversation.schoolParticipants
                  .filter((participant) => participant.userId !== session.userId)
                  .map((participant) => `${participant.user.name} (${participant.user.schoolRole.name})`);

                return (
                  <Link
                    key={conversation.id}
                    href={`/support?conversationId=${encodeURIComponent(conversation.id)}`}
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
                          {formatConversationTarget({
                            scope: conversation.scope,
                            schoolParticipantLabels: participantNames,
                            platformParticipantCount: conversation.platformParticipants.length
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {conversation.scope === "PLATFORM_SUPPORT" ? <Badge tone="info">Platform</Badge> : null}
                        {unread ? <Badge tone="warning">Unread</Badge> : null}
                      </div>
                    </div>
                    {lastMessage ? (
                      <p className="mt-1 line-clamp-2 text-[12px] text-white/55">{lastMessage.body}</p>
                    ) : (
                      <p className="mt-1 text-[12px] text-white/40">No messages yet.</p>
                    )}
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
              ? selectedConversation.scope === "PLATFORM_SUPPORT"
                ? "School admin and platform support collaboration"
                : "School support conversation"
              : "Select a conversation"
          }
          accent="teal"
        >
          {!selectedConversation ? (
            <EmptyState icon="💬" title="Select a conversation" description="Choose a conversation from the left panel." />
          ) : (
            <div className="space-y-4">
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {messages.map((message) => {
                  const mine = message.senderType === "SCHOOL_USER" && message.senderSchoolUserId === session.userId;
                  const senderLabel =
                    message.senderType === "SCHOOL_USER"
                      ? `${message.senderSchoolUser?.name ?? "School user"}${message.senderSchoolUser?.schoolRole?.name ? ` (${message.senderSchoolUser.schoolRole.name})` : ""}`
                      : `${message.senderPlatformUser?.name ?? "Platform user"} (Platform)`;

                  return (
                    <article
                      key={message.id}
                      className={[
                        "max-w-[92%] rounded-[14px] border px-3 py-2.5",
                        mine
                          ? "ml-auto border-blue-400/35 bg-blue-500/[0.16]"
                          : "mr-auto border-white/[0.10] bg-white/[0.04]"
                      ].join(" ")}
                    >
                      <p className="mb-1 text-[11px] text-white/45">{senderLabel}</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/85">{message.body}</p>
                      <p className="mt-1 text-[11px] text-white/35">{timeAgo(message.createdAt)}</p>
                    </article>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="text-sm text-white/50">No messages yet.</p>
                ) : null}
              </div>

              {selectedConversation.status === "OPEN" ? (
                <ReplySupportCard conversationId={selectedConversation.id} />
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

async function CreateParentSupportCard() {
  const { createParentSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="Parent Support"
      description="Starts a support thread with class teacher, principal, head master, and admin"
      accent="indigo"
    >
      <form action={createParentSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Subject</Label>
          <Input name="subject" placeholder="Need help with attendance concern" required />
        </div>
        <div>
          <Label required>Message</Label>
          <Textarea name="body" rows={3} placeholder="Please help me with..." required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Start parent support chat</Button>
        </div>
      </form>
    </Card>
  );
}

async function CreateSchoolSupportCard() {
  const { createSchoolSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="School Support"
      description="Creates a thread with school leadership (admin, principal, head master)"
      accent="indigo"
    >
      <form action={createSchoolSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Subject</Label>
          <Input name="subject" placeholder="Need approval support" required />
        </div>
        <div>
          <Label required>Message</Label>
          <Textarea name="body" rows={3} placeholder="Explain your request in detail" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Start school support chat</Button>
        </div>
      </form>
    </Card>
  );
}

async function CreatePlatformSupportCard() {
  const { createPlatformSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="Contact Platform Support"
      description="School admin can directly open support thread with platform users"
      accent="teal"
    >
      <form action={createPlatformSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Subject</Label>
          <Input name="subject" placeholder="Need help with school subscription settings" required />
        </div>
        <div>
          <Label required>Message</Label>
          <Textarea name="body" rows={3} placeholder="Describe the support request for platform team" required />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Open platform support chat</Button>
        </div>
      </form>
    </Card>
  );
}

async function ReplySupportCard({ conversationId }: { conversationId: string }) {
  const { sendSchoolSupportMessageAction } = await import("./actions");

  return (
    <form action={sendSchoolSupportMessageAction} className="space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div>
        <Label required>Reply</Label>
        <Textarea name="body" rows={3} placeholder="Type your response" required />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Send reply</Button>
      </div>
    </form>
  );
}
