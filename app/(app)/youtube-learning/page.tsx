import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { markYouTubeLearningSeen } from "@/lib/youtube-learning-unread";

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildYouTubeLearningHref(args: {
  classId?: string | null;
  holiday?: boolean;
  videoId?: string | null;
  compose?: boolean;
}) {
  const params = new URLSearchParams();
  if (args.classId) params.set("classId", args.classId);
  if (args.holiday) params.set("holiday", "1");
  if (args.videoId) params.set("videoId", args.videoId);
  if (args.compose) params.set("compose", "1");
  const query = params.toString();
  return query ? `/youtube-learning?${query}` : "/youtube-learning";
}

export default async function YouTubeLearningPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; holiday?: string; videoId?: string; compose?: string }>;
}) {
  await requirePermission("YOUTUBE_LEARNING", "VIEW");
  const session = await requireSession();
  const { classId: filterClassId, holiday, videoId, compose } = await searchParams;
  const composeOpen = compose === "1";

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const learningLevel = perms.YOUTUBE_LEARNING;
  const canCreate = learningLevel ? atLeastLevel(learningLevel, "EDIT") : false;

  const classes = await db.class.findMany({
    where: { schoolId: session.schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: "asc" }, { section: "asc" }]
  });

  const classLabelById = new Map(classes.map((cls) => [cls.id, classLabel(cls.name, cls.section)]));

  let allowedClassIds: string[] | null = null;

  if (session.roleKey === "PARENT") {
    const rows = await db.student.findMany({
      where: {
        schoolId: session.schoolId,
        parents: { some: { userId: session.userId } }
      },
      select: { classId: true }
    });
    allowedClassIds = [...new Set(rows.map((row) => row.classId).filter(Boolean) as string[])];
  } else if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const rows = await db.teacherClassAssignment.findMany({
      where: {
        schoolId: session.schoolId,
        userId: session.userId
      },
      select: { classId: true }
    });
    allowedClassIds = [...new Set(rows.map((row) => row.classId))];
  }

  const hasClassFilter = Boolean(filterClassId && classLabelById.has(filterClassId));
  const holidayOnly = holiday === "1";

  const visibilityWhere = (() => {
    if (allowedClassIds) {
      return { OR: [{ classId: null }, { classId: { in: allowedClassIds } }] };
    }
    if (hasClassFilter && filterClassId) {
      return { OR: [{ classId: null }, { classId: filterClassId }] };
    }
    return {};
  })();

  const videos = await db.youTubeLearningVideo.findMany({
    where: {
      schoolId: session.schoolId,
      isActive: true,
      ...(holidayOnly ? { holidayOnly: true } : {}),
      ...visibilityWhere
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
      createdByUser: { select: { name: true } }
    },
    orderBy: [{ createdAt: "desc" }],
    take: 180
  });

  await markYouTubeLearningSeen({ schoolId: session.schoolId, userId: session.userId });

  const selectedVideo = videos.find((entry) => entry.id === videoId) ?? null;

  function videoHref(targetVideoId: string) {
    return buildYouTubeLearningHref({
      classId: hasClassFilter && filterClassId ? filterClassId : null,
      holiday: holidayOnly,
      videoId: targetVideoId,
      compose: composeOpen
    });
  }

  const visibleClasses =
    allowedClassIds === null
      ? classes
      : classes.filter((cls) => allowedClassIds?.includes(cls.id));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="YouTube Learning"
          subtitle="Class-wise useful video library for holiday learning and revision"
        />
        {canCreate ? (
          <Link
            href={buildYouTubeLearningHref({
              classId: hasClassFilter && filterClassId ? filterClassId : null,
              holiday: holidayOnly,
              videoId,
              compose: !composeOpen
            })}
            aria-label={composeOpen ? "Close YouTube learning form" : "Add YouTube learning video"}
            className="sm-btn min-h-0 mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[26px] leading-none text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105 active:scale-[0.98]"
            title={composeOpen ? "Close" : "Add video"}
          >
            {composeOpen ? "×" : "+"}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={buildYouTubeLearningHref({ compose: composeOpen })}>
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
              !hasClassFilter
                ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
            ].join(" ")}
          >
            ▶️ All classes
          </span>
        </Link>

        {visibleClasses.map((cls) => {
          const label = classLabel(cls.name, cls.section);
          const active = filterClassId === cls.id;

          return (
            <Link
              key={cls.id}
              href={buildYouTubeLearningHref({ classId: cls.id, holiday: holidayOnly, compose: composeOpen })}
            >
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  active
                    ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                    : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
                ].join(" ")}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <Link
          href={buildYouTubeLearningHref({
            classId: hasClassFilter && filterClassId ? filterClassId : null,
            holiday: !holidayOnly,
            compose: composeOpen
          })}
        >
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
              holidayOnly
                ? "border-emerald-400/35 bg-emerald-500/[0.18] text-emerald-100"
                : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
            ].join(" ")}
          >
            🎒 Holiday only
          </span>
        </Link>
      </div>

      {canCreate && composeOpen ? (
        <CreateYouTubeLearningCard classes={visibleClasses} roleKey={session.roleKey} selectedClassId={filterClassId} />
      ) : null}

      <Card
        title="Video Library"
        description={`${videos.length} video(s) available${holidayOnly ? " · Holiday mode" : ""}`}
        accent="teal"
      >
        {videos.length === 0 ? (
          <EmptyState
            icon="▶️"
            title="No YouTube resources yet"
            description="Add curated class videos so students can continue learning during holidays."
          />
        ) : (
          <div className="space-y-3">
            {selectedVideo ? (
              <article className="overflow-hidden rounded-[16px] border border-white/[0.10] bg-[#0b1324]">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeVideoId}?rel=0&modestbranding=1`}
                    title={selectedVideo.title}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="space-y-1.5 px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="info">
                      {selectedVideo.class
                        ? classLabel(selectedVideo.class.name, selectedVideo.class.section)
                        : "All classes"}
                    </Badge>
                    {selectedVideo.holidayOnly ? <Badge tone="success">Holiday</Badge> : null}
                  </div>
                  <p className="text-[14px] font-semibold text-white/92">{selectedVideo.title}</p>
                  {selectedVideo.description ? (
                    <p className="text-[12px] text-white/65 whitespace-pre-wrap">{selectedVideo.description}</p>
                  ) : null}
                  <p className="text-[11px] text-white/40">
                    By {selectedVideo.createdByUser.name} · {timeAgo(selectedVideo.createdAt)}
                  </p>
                </div>
              </article>
            ) : (
              <div className="rounded-[14px] border border-white/[0.10] bg-white/[0.03] px-3.5 py-3 text-[12px] text-white/62">
                Select any video card below to play it inside the app.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {videos.map((video) => {
                const classTag = video.class ? classLabel(video.class.name, video.class.section) : "All classes";
                const thumb = `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`;
                const active = selectedVideo?.id === video.id;

                return (
                  <article
                    key={video.id}
                    className={[
                      "overflow-hidden rounded-[16px] border bg-white/[0.03] transition hover:bg-white/[0.06]",
                      active ? "border-blue-400/35" : "border-white/[0.08]"
                    ].join(" ")}
                  >
                    <Link href={videoHref(video.id)} className="block relative">
                      <img src={thumb} alt={video.title} className="h-44 w-full object-cover" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <span className="absolute bottom-2 right-2 rounded-full border border-white/30 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white">
                        Play in app
                      </span>
                    </Link>

                    <div className="space-y-2 px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="info">{classTag}</Badge>
                        {video.holidayOnly ? <Badge tone="success">Holiday</Badge> : null}
                        {active ? <Badge tone="warning">Now playing</Badge> : null}
                      </div>
                      <p className="text-[13px] font-semibold text-white/90 line-clamp-2">{video.title}</p>
                      {video.description ? (
                        <p className="text-[12px] text-white/60 line-clamp-2">{video.description}</p>
                      ) : null}
                      <p className="text-[11px] text-white/40">
                        By {video.createdByUser.name} · {timeAgo(video.createdAt)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

async function CreateYouTubeLearningCard({
  classes,
  roleKey,
  selectedClassId
}: {
  classes: Array<{ id: string; name: string; section: string }>;
  roleKey: string;
  selectedClassId?: string;
}) {
  const { createYouTubeLearningVideoAction } = await import("./actions");
  const teacherScoped = roleKey === "TEACHER" || roleKey === "CLASS_TEACHER";

  if (teacherScoped && classes.length === 0) {
    return (
      <Card
        title="Add YouTube Learning Video"
        description="Publish class-specific learning videos"
        accent="indigo"
      >
        <p className="text-sm text-white/55">
          You do not have any class assignments yet. Ask an admin to assign a class before posting videos.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Add YouTube Learning Video"
      description="Map useful videos by class and highlight holiday resources"
      accent="indigo"
    >
      <form action={createYouTubeLearningVideoAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <div>
          <Label required={teacherScoped}>Class</Label>
          <select
            name="classId"
            defaultValue={selectedClassId && classes.some((cls) => cls.id === selectedClassId) ? selectedClassId : ""}
            required={teacherScoped}
            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
          >
            {!teacherScoped ? <option value="">All classes</option> : null}
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {classLabel(cls.name, cls.section)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label required>Video title</Label>
          <Input name="title" placeholder="Holiday Math Revision - Fractions" required />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={2} placeholder="What students should focus on in this video" />
        </div>

        <div>
          <Label required>YouTube URL</Label>
          <Input name="youtubeUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." required />
        </div>

        <label className="inline-flex items-center gap-2 text-[12px] text-white/80">
          <input type="checkbox" name="holidayOnly" value="1" className="h-4 w-4 rounded-[4px] accent-emerald-500" />
          Mark as holiday learning resource
        </label>

        <div className="flex justify-end">
          <Button type="submit">Publish video</Button>
        </div>
      </form>
    </Card>
  );
}
