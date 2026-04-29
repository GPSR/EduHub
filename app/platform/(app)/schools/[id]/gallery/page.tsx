import Image from "next/image";
import Link from "next/link";
import { CheckboxBulkActions } from "@/components/checkbox-bulk-actions";
import { ConfirmableServerForm } from "@/components/confirmable-server-form";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePlatformSchoolAccess } from "@/lib/platform-require";

function roleListLabel(roleNames: string[]) {
  if (roleNames.length === 0) return "Visible to all roles";
  if (roleNames.length <= 3) return roleNames.join(", ");
  return `${roleNames.slice(0, 3).join(", ")} +${roleNames.length - 3} more`;
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

export default async function PlatformSchoolGalleryPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folderId?: string; uploadStatus?: "success" | "error"; uploadMessage?: string }>;
}) {
  const { id } = await params;
  const { folderId, uploadStatus, uploadMessage } = await searchParams;
  const { user } = await requirePlatformSchoolAccess(id);
  const canUpload = user.role === "SUPER_ADMIN";
  const canDelete = canUpload;

  const [school, roles, folders] = await Promise.all([
    db.school.findUnique({ where: { id }, select: { id: true, name: true, slug: true } }),
    db.schoolRole.findMany({
      where: { schoolId: id },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true }
    }),
    db.schoolGalleryFolder.findMany({
      where: { schoolId: id, isActive: true },
      include: {
        roleAccess: { include: { schoolRole: { select: { id: true, name: true } } } },
        _count: { select: { items: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  if (!school) {
    return (
      <Card>
        <p className="text-sm text-white/60">School not found.</p>
      </Card>
    );
  }

  const selectedFolder = folders.find((folder) => folder.id === folderId) ?? folders[0] ?? null;
  const items = selectedFolder
    ? await db.schoolGalleryItem.findMany({
        where: {
          schoolId: id,
          folderId: selectedFolder.id
        },
        include: {
          createdByUser: { select: { name: true } },
          createdByPlatformUser: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 140
      })
    : [];
  const { deletePlatformGalleryItemAction } = await import("./actions");

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeader
          title={`${school.name} · Gallery Control`}
          subtitle="Platform-managed folders and images visible in the school app"
        />
        <div className="flex items-center gap-2">
          <Link href="/platform/gallery" className="text-sm text-white/40 hover:text-white/75 transition">
            Platform gallery
          </Link>
          <span className="text-white/30">·</span>
          <Link href={`/platform/schools/${school.id}`} className="text-sm text-white/40 hover:text-white/75 transition">
            School manage
          </Link>
        </div>
      </div>

      {uploadStatus === "success" ? (
        <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/12 px-3.5 py-2.5 text-[12px] text-emerald-100">
          {uploadMessage ?? "Images uploaded successfully."}
        </div>
      ) : uploadStatus === "error" ? (
        <div className="rounded-[12px] border border-rose-500/25 bg-rose-500/12 px-3.5 py-2.5 text-[12px] text-rose-100">
          {uploadMessage ?? "Unable to upload images."}
        </div>
      ) : null}

      <Card
        title="Create Platform Folder"
        description="These folders sync to school admins and users based on assigned roles"
        accent="indigo"
      >
        <CreatePlatformFolderCard schoolId={school.id} roles={roles} />
      </Card>

      <Card title="Folders" description={`Current folders for ${school.slug}`} accent="teal">
        {folders.length === 0 ? (
          <EmptyState icon="📂" title="No folders yet" description="Create the first folder from platform." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {folders.map((folder) => {
              const isActive = selectedFolder?.id === folder.id;
              const roleNames = folder.roleAccess.map((access) => access.schoolRole.name);
              return (
                <Link
                  key={folder.id}
                  href={`/platform/schools/${encodeURIComponent(school.id)}/gallery?folderId=${encodeURIComponent(folder.id)}`}
                  className={[
                    "rounded-[14px] border px-3.5 py-3 transition",
                    isActive
                      ? "border-blue-400/35 bg-blue-500/[0.14]"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white/90">{folder.name}</p>
                      <p className="truncate text-[11px] text-white/45">{roleListLabel(roleNames)}</p>
                    </div>
                    <Badge tone={folder.source === "PLATFORM" ? "info" : "neutral"}>
                      {folder.source === "PLATFORM" ? "Platform" : "School"}
                    </Badge>
                  </div>
                  {folder.description ? (
                    <p className="mt-2 line-clamp-2 text-[12px] text-white/55">{folder.description}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-white/35">{folder._count.items} image(s)</p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {canUpload && folders.length > 0 ? (
        <Card title="Upload Platform Image" description="Upload images into any school folder" accent="indigo">
          <UploadPlatformImageCard schoolId={school.id} folders={folders} selectedFolderId={selectedFolder?.id} />
        </Card>
      ) : folders.length > 0 ? (
        <Card title="Upload Platform Image" description="Upload images into any school folder" accent="indigo">
          <p className="text-sm text-white/55">Only platform super admin can upload photos. Other users can view photos.</p>
        </Card>
      ) : null}

      <Card
        title={selectedFolder ? `Images · ${selectedFolder.name}` : "Images"}
        description={selectedFolder ? `${items.length} item(s) in this folder` : "Select a folder to view images"}
        accent="teal"
      >
        {!selectedFolder ? (
          <EmptyState icon="🖼️" title="Select a folder" description="Choose a folder to view platform-synced images." />
        ) : items.length === 0 ? (
          <EmptyState icon="🖼️" title="No images yet" description="Upload an image from the platform panel." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const by = item.createdByPlatformUser?.name ?? item.createdByUser?.name ?? "System";
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03]"
                >
                  <div className="relative aspect-[4/3] bg-[#0d1424]">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 94vw"
                      className="object-cover"
                    />
                    {canDelete ? (
                      <ConfirmableServerForm
                        action={deletePlatformGalleryItemAction}
                        className="absolute right-2 top-2 z-10"
                        confirmMessage="Are you sure you want to delete this photo?"
                      >
                        <input type="hidden" name="schoolId" value={school.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="folderId" value={item.folderId} />
                        <button
                          type="submit"
                          className="inline-flex h-7 items-center justify-center rounded-[9px] border border-rose-300/45 bg-[#250d17]/90 px-2.5 text-[11px] font-semibold text-rose-100 transition hover:bg-[#3a1222]"
                        >
                          Delete
                        </button>
                      </ConfirmableServerForm>
                    ) : null}
                  </div>
                  <div className="space-y-1 px-3 py-3">
                    <p className="text-[13px] font-semibold text-white/90">{item.title}</p>
                    {item.caption ? <p className="text-[12px] text-white/60 line-clamp-2">{item.caption}</p> : null}
                    <p className="text-[11px] text-white/35">
                      {by} · {timeAgo(item.createdAt)}
                    </p>
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

async function CreatePlatformFolderCard({
  schoolId,
  roles
}: {
  schoolId: string;
  roles: Array<{ id: string; name: string }>;
}) {
  const { createPlatformGalleryFolderAction } = await import("./actions");

  return (
    <form action={createPlatformGalleryFolderAction} className="grid grid-cols-1 gap-3 sm:gap-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div>
        <Label required>Folder name</Label>
        <Input name="name" placeholder="School Events" required />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea name="description" rows={2} placeholder="Photos and highlights shared from platform" />
      </div>
      <div>
        <Label>Visible roles</Label>
        <CheckboxBulkActions fieldName="roleIds" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-3">
          {roles.map((role) => (
            <label key={role.id} className="inline-flex items-center gap-2 text-[12px] text-white/80">
              <input
                type="checkbox"
                name="roleIds"
                value={role.id}
                className="h-4 w-4 rounded-[4px] accent-blue-500"
              />
              <span>{role.name}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-white/35">Unselected means visible to all school roles.</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Create platform folder</Button>
      </div>
    </form>
  );
}

async function UploadPlatformImageCard({
  schoolId,
  folders,
  selectedFolderId
}: {
  schoolId: string;
  folders: Array<{ id: string; name: string }>;
  selectedFolderId?: string;
}) {
  const { uploadPlatformGalleryItemAction } = await import("./actions");

  return (
    <form action={uploadPlatformGalleryItemAction} encType="multipart/form-data" className="grid grid-cols-1 gap-3 sm:gap-4">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div>
        <Label required>Folder</Label>
        <select
          name="folderId"
          defaultValue={selectedFolderId ?? folders[0]?.id}
          className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
          required
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Title (optional)</Label>
        <Input name="title" placeholder="Platform spotlight" />
        <p className="mt-1 text-[11px] text-white/35">If multiple images are selected, file names are used automatically.</p>
      </div>
      <div>
        <Label>Caption</Label>
        <Textarea name="caption" rows={2} placeholder="Short description shown in school gallery" />
      </div>
      <div>
        <Label required>Images</Label>
        <input
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="w-full rounded-[12px] border border-white/[0.12] bg-[#0f1728]/75 px-3 py-2.5 text-sm text-white/80 file:mr-3 file:rounded-[10px] file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100 hover:border-white/[0.24]"
          required
        />
        <p className="mt-1 text-[11px] text-white/35">Supported: JPG, PNG, WEBP (select and upload multiple images)</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Upload images</Button>
      </div>
    </form>
  );
}
