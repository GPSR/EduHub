import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";

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

const RESOURCE_BADGE_TONE = {
  NOTE: "info",
  VIDEO: "success",
  LINK: "warning",
  DOCUMENT: "neutral"
} as const;

const RESOURCE_ICONS = {
  NOTE: "📝",
  VIDEO: "🎬",
  LINK: "🔗",
  DOCUMENT: "📄"
} as const;

export default async function LearningCenterPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  await requirePermission("LEARNING_CENTER", "VIEW");
  const session = await requireSession();
  const { classId: filterClassId } = await searchParams;

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const learningLevel = perms.LEARNING_CENTER;
  const canCreate = learningLevel ? atLeastLevel(learningLevel, "EDIT") : false;

  const classes = await db.class.findMany({
    where: { schoolId: session.schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: "asc" }, { section: "asc" }]
  });

  const classLabelById = new Map(classes.map((c) => [c.id, classLabel(c.name, c.section)]));

  let allowedClassIds: string[] | null = null;

  if (session.roleKey === "PARENT") {
    const rows = await db.student.findMany({
      where: { schoolId: session.schoolId, parents: { some: { userId: session.userId } } },
      select: { classId: true }
    });
    allowedClassIds = [...new Set(rows.map((row) => row.classId).filter(Boolean) as string[])];
  } else if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
    const rows = await db.teacherClassAssignment.findMany({
      where: { schoolId: session.schoolId, userId: session.userId },
      select: { classId: true }
    });
    allowedClassIds = [...new Set(rows.map((row) => row.classId))];
  }

  const hasClassFilter = Boolean(filterClassId && classLabelById.has(filterClassId));

  const visibilityWhere = (() => {
    if (allowedClassIds) {
      return {
        OR: [{ classId: null }, { classId: { in: allowedClassIds } }]
      };
    }
    if (hasClassFilter && filterClassId) {
      return {
        OR: [{ classId: null }, { classId: filterClassId }]
      };
    }
    return {};
  })();

  const resources = await db.learningCenterResource.findMany({
    where: {
      schoolId: session.schoolId,
      ...visibilityWhere
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
      createdByUser: { select: { name: true } }
    },
    orderBy: [{ createdAt: "desc" }],
    take: 150
  });

  const visibleClasses =
    allowedClassIds === null
      ? classes
      : classes.filter((cls) => allowedClassIds?.includes(cls.id));

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Learning Center"
        subtitle="Class-based resources, notes, videos, and documents"
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/learning-center">
          <span
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
              !hasClassFilter
                ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
                : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
            ].join(" ")}
          >
            📚 All classes
          </span>
        </Link>
        {visibleClasses.map((cls) => {
          const label = classLabel(cls.name, cls.section);
          const active = filterClassId === cls.id;
          return (
            <Link key={cls.id} href={`/learning-center?classId=${encodeURIComponent(cls.id)}`}>
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
      </div>

      {canCreate ? (
        <CreateLearningResourceCard
          classes={visibleClasses}
          roleKey={session.roleKey}
          selectedClassId={filterClassId}
        />
      ) : null}

      <Card
        title="Resources"
        description={`${resources.length} item(s) available${hasClassFilter && filterClassId ? ` · ${classLabelById.get(filterClassId)}` : ""}`}
        accent="teal"
      >
        {resources.length === 0 ? (
          <EmptyState
            icon="📘"
            title="No learning resources yet"
            description="Create the first class resource to start building your learning center."
          />
        ) : (
          <div className="space-y-3">
            {resources.map((resource, idx) => {
              const typeTone = RESOURCE_BADGE_TONE[resource.resourceType];
              const typeIcon = RESOURCE_ICONS[resource.resourceType];
              return (
                <article
                  key={resource.id}
                  className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4 transition hover:bg-white/[0.06] animate-fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{typeIcon}</span>
                        <p className="text-[14px] font-semibold text-white/90">{resource.title}</p>
                        <Badge tone={typeTone}>{resource.resourceType}</Badge>
                        <Badge tone="neutral">
                          {resource.class ? classLabel(resource.class.name, resource.class.section) : "All classes"}
                        </Badge>
                      </div>
                      {resource.summary ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-white/65">{resource.summary}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-[11px] text-white/35">{timeAgo(resource.createdAt)}</p>
                  </div>

                  {resource.content ? (
                    <p className="mt-3 whitespace-pre-wrap rounded-[12px] border border-white/[0.07] bg-black/20 px-3 py-2.5 text-[13px] text-white/70">
                      {resource.content}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {resource.linkUrl ? (
                      <a
                        href={resource.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-[10px] border border-blue-400/25 bg-blue-500/10 px-2.5 py-1.5 text-[12px] font-medium text-blue-200 hover:bg-blue-500/20"
                      >
                        Open link ↗
                      </a>
                    ) : null}
                    {resource.attachmentUrl ? (
                      <a
                        href={resource.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-[10px] border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Attachment ↗
                      </a>
                    ) : null}
                    <span className="text-[11px] text-white/40">By {resource.createdByUser.name}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

async function CreateLearningResourceCard({
  classes,
  roleKey,
  selectedClassId
}: {
  classes: Array<{ id: string; name: string; section: string }>;
  roleKey: string;
  selectedClassId?: string;
}) {
  const { createLearningResourceAction } = await import("./actions");
  const teacherScoped = roleKey === "TEACHER" || roleKey === "CLASS_TEACHER";

  if (teacherScoped && classes.length === 0) {
    return (
      <Card
        title="Add Learning Resource"
        description="Post notes, links, videos, and documents for specific classes"
        accent="indigo"
      >
        <p className="text-sm text-white/55">
          You do not have any class assignments yet. Ask an admin to assign one class before posting resources.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Add Learning Resource"
      description="Post notes, links, videos, and documents for specific classes"
      accent="indigo"
    >
      <form action={createLearningResourceAction} className="grid grid-cols-1 gap-3 sm:gap-4">
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
          {teacherScoped ? (
            <p className="mt-1 text-[11px] text-white/35">Teachers can post only to their assigned classes.</p>
          ) : null}
        </div>

        <div>
          <Label required>Title</Label>
          <Input name="title" placeholder="Week 3 Science Notes" required />
        </div>

        <div>
          <Label>Summary</Label>
          <Textarea name="summary" rows={2} placeholder="Quick summary for students and parents" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>Resource type</Label>
            <select
              name="resourceType"
              defaultValue="NOTE"
              className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
              required
            >
              <option value="NOTE">Note</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Link</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>
          <div>
            <Label>External link</Label>
            <Input name="linkUrl" type="url" placeholder="https://..." />
          </div>
        </div>

        <div>
          <Label>Detailed content</Label>
          <Textarea name="content" rows={4} placeholder="Add lesson notes, explanation, or instructions" />
        </div>

        <div>
          <Label>Attachment (optional image/document screenshot)</Label>
          <input
            type="file"
            name="attachment"
            accept="image/jpeg,image/png,image/webp"
            className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3 py-2.5 text-sm text-white/80 file:mr-3 file:rounded-[10px] file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100 hover:border-white/[0.24]"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">Publish resource</Button>
        </div>
      </form>
    </Card>
  );
}
