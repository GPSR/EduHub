import Link from "next/link";
import { Badge, Button, Card, EmptyState, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { getSchoolSupportChatTopics } from "@/lib/support-chat-topics";
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

function listTimeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type SupportListTab = "all" | "active" | "waiting" | "resolved";

function normalizeSupportTab(value?: string): SupportListTab {
  if (value === "active" || value === "waiting" || value === "resolved") return value;
  return "all";
}

function buildSupportHref(args: {
  conversationId?: string | null;
  q?: string;
  tab?: SupportListTab;
  compose?: boolean;
}) {
  const params = new URLSearchParams();
  if (args.conversationId) params.set("conversationId", args.conversationId);
  if (args.q && args.q.trim()) params.set("q", args.q.trim());
  if (args.tab && args.tab !== "all") params.set("tab", args.tab);
  if (args.compose) params.set("compose", "1");
  const query = params.toString();
  return query ? `/support?${query}` : "/support";
}

export default async function SupportPage({
  searchParams
}: {
  searchParams: Promise<{ conversationId?: string; q?: string; tab?: string; compose?: string }>;
}) {
  const session = await requireSession();
  const { conversationId, q, tab, compose } = await searchParams;
  const currentQuery = (q ?? "").trim();
  const normalizedQuery = currentQuery.toLowerCase();
  const currentTab = normalizeSupportTab(tab);
  const composeOpen = compose === "1";
  const topics = await getSchoolSupportChatTopics(session.schoolId);

  let loadError: string | null = null;
  let conversations: any[] = [];
  try {
    conversations = await db.supportConversation.findMany({
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
  } catch (error) {
      console.error("support conversations load failed", error);
      loadError = "Support chat is temporarily unavailable. Please refresh and try again.";
  }

  const conversationRows = conversations.map((conversation) => {
    const myParticipant = conversation.schoolParticipants.find((participant: any) => participant.userId === session.userId);
    const unread = Boolean(
      conversation.lastMessageAt && (!myParticipant?.lastReadAt || myParticipant.lastReadAt < conversation.lastMessageAt)
    );
    const lastMessage = conversation.messages[0] ?? null;
    const participantNames = conversation.schoolParticipants
      .filter((participant: any) => participant.userId !== session.userId)
      .map(
        (participant: any) =>
          `${participant.user.name}${participant.user.schoolRole?.name ? ` (${participant.user.schoolRole.name})` : ""}`
      );
    const targetLabel = formatConversationTarget({
      scope: conversation.scope,
      schoolParticipantLabels: participantNames,
      platformParticipantCount: conversation.platformParticipants.length
    });
    const lastAt = conversation.lastMessageAt ?? conversation.createdAt;
    const waiting = conversation.status === "OPEN" && unread;

    return {
      conversation,
      unread,
      waiting,
      targetLabel,
      lastMessage,
      lastAt,
      searchableText: `${conversation.subject} ${targetLabel} ${lastMessage?.body ?? ""}`.toLowerCase()
    };
  });

  const visibleConversationRows = conversationRows.filter((row) => {
    if (normalizedQuery && !row.searchableText.includes(normalizedQuery)) return false;
    if (currentTab === "active") return row.conversation.status === "OPEN";
    if (currentTab === "waiting") return row.waiting;
    if (currentTab === "resolved") return row.conversation.status === "CLOSED";
    return true;
  });

  const tabCounts = {
    all: conversationRows.length,
    active: conversationRows.filter((row) => row.conversation.status === "OPEN").length,
    waiting: conversationRows.filter((row) => row.waiting).length,
    resolved: conversationRows.filter((row) => row.conversation.status === "CLOSED").length
  } as const;

  const selectedConversationFromQuery = conversationId
    ? conversations.find((conversation) => conversation.id === conversationId) ?? null
    : null;
  const selectedConversation = selectedConversationFromQuery ?? visibleConversationRows[0]?.conversation ?? null;

  if (selectedConversation?.lastMessageAt) {
    const myParticipant = selectedConversation.schoolParticipants.find((participant: any) => participant.userId === session.userId);
    const isUnread = !myParticipant?.lastReadAt || myParticipant.lastReadAt < selectedConversation.lastMessageAt;
    if (isUnread) {
      try {
        await db.supportConversationSchoolParticipant.updateMany({
          where: {
            conversationId: selectedConversation.id,
            userId: session.userId,
            OR: [{ lastReadAt: null }, { lastReadAt: { lt: selectedConversation.lastMessageAt } }]
          },
          data: { lastReadAt: new Date() }
        });
      } catch (error) {
        console.error("support conversation read-receipt update failed", error);
      }
    }
  }

  let messages: any[] = [];
  if (selectedConversation) {
    try {
      messages = await db.supportMessage.findMany({
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
      });
    } catch (error) {
      console.error("support messages load failed", error);
      loadError = loadError ?? "Support messages are temporarily unavailable. Please refresh and try again.";
    }
  }

  const composeCards = (
    <>
      {session.roleKey === "PARENT" ? <CreateParentSupportCard topics={topics} /> : null}
      {session.roleKey === "ADMIN" ? <CreatePlatformSupportCard topics={topics} /> : null}
      {session.roleKey !== "ADMIN" && session.roleKey !== "PARENT" ? <CreateSchoolSupportCard topics={topics} /> : null}
    </>
  );

  const mobileThreadOpen = Boolean(selectedConversationFromQuery);

  return (
    <div className="space-y-5 animate-fade-up">
      <LiveChatRefresh />

      <div className="md:hidden space-y-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {!mobileThreadOpen ? (
          <>
            <section className="rounded-[22px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3.5 text-white/90 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white/95">Chat Support</h1>
                <Link
                  href={buildSupportHref({ tab: currentTab, compose: !composeOpen })}
                  aria-label={composeOpen ? "Close new support form" : "Start support chat"}
                  className="sm-btn min-h-0 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[26px] leading-none text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105 active:scale-[0.98]"
                  title={composeOpen ? "Close new chat" : "New chat"}
                >
                  {composeOpen ? "×" : "+"}
                </Link>
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {([
                  { key: "all", label: "All" },
                  { key: "active", label: "Active" },
                  { key: "waiting", label: "Waiting" },
                  { key: "resolved", label: "Resolved" }
                ] as const).map((tabItem) => {
                  const isActive = currentTab === tabItem.key;
                  return (
                    <Link
                      key={tabItem.key}
                      href={buildSupportHref({ tab: tabItem.key, compose: composeOpen })}
                      className={[
                        "inline-flex h-10 items-center justify-center rounded-[14px] border text-[14px] font-semibold transition",
                        isActive
                          ? "border-blue-300/60 bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white"
                          : "border-white/[0.12] bg-white/[0.04] text-white/72 hover:bg-white/[0.08]"
                      ].join(" ")}
                    >
                      {tabItem.label}
                      <span className="ml-1 text-[11px] opacity-75">
                        {tabItem.key === "all"
                          ? tabCounts.all
                          : tabItem.key === "active"
                            ? tabCounts.active
                            : tabItem.key === "waiting"
                              ? tabCounts.waiting
                              : tabCounts.resolved}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {loadError ? (
              <div className="rounded-[14px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12px] text-rose-200">
                {loadError}
              </div>
            ) : null}

            {composeOpen ? <div className="space-y-3">{composeCards}</div> : null}

            {visibleConversationRows.length === 0 ? (
              <div className="rounded-[18px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 backdrop-blur-xl">
                <p className="text-[14px] font-semibold text-white/90">No conversations found</p>
                <p className="mt-1 text-[12px] text-white/52">
                  Start a new support chat or change filters.
                </p>
              </div>
            ) : (
              <section className="overflow-hidden rounded-[18px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] backdrop-blur-xl">
                {visibleConversationRows.map((row, index) => (
                  <Link
                    key={row.conversation.id}
                    href={buildSupportHref({
                      conversationId: row.conversation.id,
                      tab: currentTab,
                      compose: composeOpen
                    })}
                    className={[
                      "flex items-start gap-3 px-3.5 py-3 transition",
                      index !== visibleConversationRows.length - 1 ? "border-b border-white/[0.08]" : "",
                      selectedConversation?.id === row.conversation.id ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                    ].join(" ")}
                  >
                    <div className="relative mt-0.5 h-11 w-11 shrink-0 rounded-full bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white grid place-items-center text-[18px]">
                      👤
                      {row.unread ? (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0f1728]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-white/92">{row.conversation.subject}</p>
                          <p className="truncate text-[12px] text-white/62">{row.targetLabel}</p>
                        </div>
                        <p className="shrink-0 text-[12px] text-white/40">{listTimeAgo(row.lastAt)}</p>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-white/56">
                        {row.lastMessage?.body ?? "No messages yet."}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            )}

          </>
        ) : (
          <>
            <section className="rounded-[18px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3.5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={buildSupportHref({ tab: currentTab, compose: composeOpen })}
                  className="inline-flex h-8 items-center rounded-[10px] border border-white/[0.12] bg-[#101a2d] px-2.5 text-[12px] font-semibold text-white/80"
                >
                  ← Back
                </Link>
                <div className="flex items-center gap-1.5">
                  {selectedConversation?.scope === "PLATFORM_SUPPORT" ? <Badge tone="info">Platform</Badge> : null}
                  {selectedConversation?.status === "CLOSED" ? <Badge tone="neutral">Closed</Badge> : <Badge tone="success">Open</Badge>}
                </div>
              </div>
              <h2 className="mt-2 text-[18px] font-semibold text-white/92">{selectedConversation?.subject ?? "Conversation"}</h2>
            </section>

            <section className="rounded-[18px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3.5 backdrop-blur-xl">
              <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
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
                          ? "ml-auto border-[#67b4ff]/40 bg-[#4f8dfd]/20 text-white"
                          : "mr-auto border-white/[0.12] bg-white/[0.05] text-white/88"
                      ].join(" ")}
                    >
                      <p className="mb-1 text-[11px] opacity-70">{senderLabel}</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
                      <p className="mt-1 text-[11px] opacity-55">{timeAgo(message.createdAt)}</p>
                    </article>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="text-sm text-white/50">No messages yet.</p>
                ) : null}
              </div>
            </section>

            {selectedConversation?.status === "OPEN" ? (
              <ReplySupportCard conversationId={selectedConversation.id} mode="light" />
            ) : (
              <div className="rounded-[12px] border border-white/[0.12] bg-[#101a2d] px-3 py-2 text-sm text-white/60">
                Conversation is closed.
              </div>
            )}
          </>
        )}
      </div>

      <div className="hidden md:block space-y-4">
        <section className="rounded-[24px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 text-white/90 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white/95">Chat Support</h2>
            <Link
              href={buildSupportHref({ tab: currentTab, compose: !composeOpen, conversationId })}
              aria-label={composeOpen ? "Close new support form" : "Start support chat"}
              className="sm-btn min-h-0 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[26px] leading-none text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105 active:scale-[0.98]"
              title={composeOpen ? "Close new chat" : "New chat"}
            >
              {composeOpen ? "×" : "+"}
            </Link>
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-4 gap-2 xl:min-w-[460px]">
              {([
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "waiting", label: "Waiting" },
                { key: "resolved", label: "Resolved" }
              ] as const).map((tabItem) => {
                const isActive = currentTab === tabItem.key;
                return (
                  <Link
                    key={tabItem.key}
                    href={buildSupportHref({ tab: tabItem.key, compose: composeOpen, conversationId })}
                    className={[
                      "inline-flex h-10 items-center justify-center rounded-[14px] border text-[14px] font-semibold transition",
                      isActive
                        ? "border-blue-300/60 bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white"
                        : "border-white/[0.12] bg-white/[0.04] text-white/72 hover:bg-white/[0.08]"
                    ].join(" ")}
                  >
                    {tabItem.label}
                    <span className="ml-1 text-[11px] opacity-75">
                      {tabItem.key === "all"
                        ? tabCounts.all
                        : tabItem.key === "active"
                          ? tabCounts.active
                          : tabItem.key === "waiting"
                            ? tabCounts.waiting
                            : tabCounts.resolved}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-[14px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12px] text-rose-200">
            {loadError}
          </div>
        ) : null}

        {composeOpen ? <div className="space-y-3">{composeCards}</div> : null}

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <section className="overflow-hidden rounded-[20px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] backdrop-blur-xl">
            <div className="border-b border-white/[0.08] px-4 py-3">
              <p className="text-[13px] font-semibold text-white/80">{visibleConversationRows.length} conversation(s)</p>
            </div>
            {visibleConversationRows.length === 0 ? (
              <div className="p-5">
                <p className="text-[14px] font-semibold text-white/88">No support conversations</p>
                <p className="mt-1 text-[12px] text-white/50">Start your first support chat.</p>
              </div>
            ) : (
              <div>
                {visibleConversationRows.map((row, index) => (
                  <Link
                    key={row.conversation.id}
                    href={buildSupportHref({ conversationId: row.conversation.id, tab: currentTab, compose: composeOpen })}
                    className={[
                      "flex items-start gap-3 px-3.5 py-3 transition",
                      index !== visibleConversationRows.length - 1 ? "border-b border-white/[0.08]" : "",
                      selectedConversation?.id === row.conversation.id ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                    ].join(" ")}
                  >
                    <div className="relative mt-0.5 h-11 w-11 shrink-0 rounded-full bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white grid place-items-center text-[18px]">
                      👤
                      {row.unread ? (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0f1728]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-white/92">{row.conversation.subject}</p>
                          <p className="truncate text-[12px] text-white/62">{row.targetLabel}</p>
                        </div>
                        <p className="shrink-0 text-[12px] text-white/40">{listTimeAgo(row.lastAt)}</p>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-white/56">{row.lastMessage?.body ?? "No messages yet."}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[20px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 backdrop-blur-xl">
            {!selectedConversation ? (
              <EmptyState icon="💬" title="Select a conversation" description="Choose a conversation from the list." />
            ) : (
              <div className="space-y-3">
                <div className="border-b border-white/[0.08] pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[18px] font-semibold text-white/92">{selectedConversation.subject}</h3>
                    <div className="flex items-center gap-1.5">
                      {selectedConversation.scope === "PLATFORM_SUPPORT" ? <Badge tone="info">Platform</Badge> : null}
                      {selectedConversation.status === "CLOSED" ? <Badge tone="neutral">Closed</Badge> : <Badge tone="success">Open</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-[12px] text-white/56">
                    {selectedConversation.scope === "PLATFORM_SUPPORT"
                      ? "School admin and platform support collaboration"
                      : "School support conversation"}
                  </p>
                </div>

                <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
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
                            ? "ml-auto border-[#67b4ff]/40 bg-[#4f8dfd]/20 text-white"
                            : "mr-auto border-white/[0.12] bg-white/[0.05] text-white/88"
                        ].join(" ")}
                      >
                        <p className="mb-1 text-[11px] opacity-70">{senderLabel}</p>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
                        <p className="mt-1 text-[11px] opacity-55">{timeAgo(message.createdAt)}</p>
                      </article>
                    );
                  })}
                  {messages.length === 0 ? <p className="text-sm text-white/50">No messages yet.</p> : null}
                </div>

                {selectedConversation.status === "OPEN" ? (
                  <ReplySupportCard conversationId={selectedConversation.id} mode="light" />
                ) : (
                  <div className="rounded-[12px] border border-white/[0.12] bg-[#101a2d] px-3 py-2 text-sm text-white/60">
                    Conversation is closed.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

async function CreateParentSupportCard({ topics }: { topics: string[] }) {
  const { createParentSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="Parent Support"
      description="Starts a support thread with class teacher, principal, head master, and admin"
      accent="indigo"
    >
      <form action={createParentSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Topic</Label>
          <SupportTopicSelect topics={topics} />
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

async function CreateSchoolSupportCard({ topics }: { topics: string[] }) {
  const { createSchoolSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="School Support"
      description="Creates a thread with school leadership (admin, principal, head master)"
      accent="indigo"
    >
      <form action={createSchoolSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Topic</Label>
          <SupportTopicSelect topics={topics} />
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

async function CreatePlatformSupportCard({ topics }: { topics: string[] }) {
  const { createPlatformSupportConversationAction } = await import("./actions");

  return (
    <Card
      title="Contact Platform Support"
      description="School admin can directly open support thread with platform users"
      accent="teal"
    >
      <form action={createPlatformSupportConversationAction} className="grid grid-cols-1 gap-3">
        <div>
          <Label required>Topic</Label>
          <SupportTopicSelect topics={topics} />
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

async function ReplySupportCard({ conversationId, mode = "dark" }: { conversationId: string; mode?: "dark" | "light" }) {
  const { closeSchoolSupportConversationAction, sendSchoolSupportMessageAction } = await import("./actions");

  if (mode === "light") {
    return (
      <div className="space-y-3 rounded-[14px] border border-white/[0.12] bg-[#101a2d] p-3">
        <form action={sendSchoolSupportMessageAction} className="space-y-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-white/80">Reply</p>
            <Textarea
              name="body"
              rows={3}
              placeholder="Type your response"
              required
              className="border-white/[0.12] bg-[#0f1728]/85 text-white placeholder:text-white/35 focus:border-blue-300/70 focus:ring-blue-500/22"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-4 text-[13px] font-semibold text-white shadow-[0_14px_26px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105"
            >
              Send reply
            </button>
          </div>
        </form>

        <form action={closeSchoolSupportConversationAction} className="flex justify-end">
          <input type="hidden" name="conversationId" value={conversationId} />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-[11px] border border-white/[0.14] bg-[#0f1728]/80 px-3.5 text-[12px] font-semibold text-white/78 transition hover:bg-white/[0.08]"
          >
            Close chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      <form action={closeSchoolSupportConversationAction} className="flex justify-end">
        <input type="hidden" name="conversationId" value={conversationId} />
        <Button type="submit" variant="secondary">Close chat</Button>
      </form>
    </div>
  );
}

function SupportTopicSelect({ topics }: { topics: string[] }) {
  return (
    <select
      name="topic"
      defaultValue={topics[0] ?? "Others"}
      className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
      required
    >
      {topics.map((topic) => (
        <option key={topic} value={topic}>
          {topic}
        </option>
      ))}
    </select>
  );
}
