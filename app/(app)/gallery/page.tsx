import Image from "next/image";
import Link from "next/link";
import { CheckboxBulkActions } from "@/components/checkbox-bulk-actions";
import { ConfirmableServerForm } from "@/components/confirmable-server-form";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import { FolderSlideshow } from "./folder-slideshow";

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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function GalleryPage({
  searchParams
}: {
  searchParams: Promise<{ folderId?: string; uploadStatus?: "success" | "error"; uploadMessage?: string }>;
}) {
  await requirePermission("GALLERY", "VIEW");
  const session = await requireSession();
  const { folderId, uploadStatus, uploadMessage } = await searchParams;

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });
  const galleryLevel = perms.GALLERY;
  const canUpload = session.roleKey === "ADMIN" && (galleryLevel ? atLeastLevel(galleryLevel, "EDIT") : false);
  const canDelete = canUpload;
  const canManageFolders =
    session.roleKey === "ADMIN" || (galleryLevel ? atLeastLevel(galleryLevel, "APPROVE") : false);
  const roleVisibilityWhere =
    session.roleKey === "ADMIN"
      ? {}
      : {
          OR: [{ roleAccess: { none: {} } }, { roleAccess: { some: { schoolRoleId: session.roleId } } }]
        };

  const [roles, folders, latestVisibleItem] = await Promise.all([
    canManageFolders
      ? db.schoolRole.findMany({
          where: { schoolId: session.schoolId },
          orderBy: [{ isSystem: "desc" }, { name: "asc" }],
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    db.schoolGalleryFolder.findMany({
      where: {
        schoolId: session.schoolId,
        isActive: true,
        ...roleVisibilityWhere
      },
      include: {
        roleAccess: { include: { schoolRole: { select: { id: true, name: true } } } },
        _count: { select: { items: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    }),
    db.schoolGalleryItem.findFirst({
      where: {
        schoolId: session.schoolId,
        folder: {
          schoolId: session.schoolId,
          isActive: true,
          ...roleVisibilityWhere
        }
      },
      orderBy: { createdAt: "desc" },
      select: { folderId: true }
    })
  ]);

  const selectedFolder =
    folders.find((folder) => folder.id === folderId) ??
    folders.find((folder) => folder.id === latestVisibleItem?.folderId) ??
    folders[0] ??
    null;
  const items = selectedFolder
    ? await db.schoolGalleryItem.findMany({
        where: {
          schoolId: session.schoolId,
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
  const { deleteGalleryItemAction } = await import("./actions");

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="School Gallery"
        subtitle="Role-based folders for school memories, events, and visual updates"
      />

      {uploadStatus === "success" ? (
        <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/12 px-3.5 py-2.5 text-[12px] text-emerald-100">
          {uploadMessage ?? "Images uploaded successfully."}
        </div>
      ) : uploadStatus === "error" ? (
        <div className="rounded-[12px] border border-rose-500/25 bg-rose-500/12 px-3.5 py-2.5 text-[12px] text-rose-100">
          {uploadMessage ?? "Unable to upload images."}
        </div>
      ) : null}

      {canManageFolders ? <CreateFolderCard roles={roles} /> : null}

      <Card title="Folders" description="Choose a folder to view or upload images" accent="indigo">
        {folders.length === 0 ? (
          <EmptyState
            icon="🖼️"
            title="No gallery folders yet"
            description="Create a folder and assign roles to control visibility."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {folders.map((folder) => {
              const isActive = selectedFolder?.id === folder.id;
              const roleNames = folder.roleAccess.map((access) => access.schoolRole.name);
              return (
                <Link
                  key={folder.id}
                  href={`/gallery?folderId=${encodeURIComponent(folder.id)}`}
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

      {selectedFolder && items.length > 0 ? (
        <Card
          title={`Slideshow · ${selectedFolder.name}`}
          description="Swipe-enabled slideshow with full-screen view, share, and download actions"
          accent="teal"
        >
          <FolderSlideshow
            folderId={selectedFolder.id}
            folderName={selectedFolder.name}
            items={items.map((item) => ({
              id: item.id,
              title: item.title,
              caption: item.caption,
              imageUrl: item.imageUrl,
              by: item.createdByUser?.name ?? item.createdByPlatformUser?.name ?? "System"
            }))}
          />
        </Card>
      ) : null}

      {canUpload && folders.length > 0 ? (
        <UploadImageCard folders={folders} selectedFolderId={selectedFolder?.id} />
      ) : folders.length > 0 ? (
        <Card title="Upload Image" description="Add school gallery images to a selected folder" accent="teal">
          <p className="text-sm text-white/55">Only school admin can upload photos. Other users can view photos.</p>
        </Card>
      ) : null}

      <Card
        title={selectedFolder ? `Images · ${selectedFolder.name}` : "Images"}
        description={selectedFolder ? `${items.length} item(s) in this folder` : "Select a folder to view images"}
        accent="teal"
      >
        {!selectedFolder ? (
          <EmptyState icon="📂" title="Pick a folder" description="Choose a folder above to view gallery images." />
        ) : items.length === 0 ? (
          <EmptyState icon="🖼️" title="No images yet" description="Upload the first image to this folder." />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
            {items.map((item) => {
              const by = item.createdByUser?.name ?? item.createdByPlatformUser?.name ?? "System";
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.03]"
                >
                  <div className="relative aspect-square bg-[#0d1424]">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 640px) 22vw, 31vw"
                      className="object-cover"
                    />
                    {canDelete ? (
                      <ConfirmableServerForm
                        action={deleteGalleryItemAction}
                        className="absolute right-1.5 top-1.5 z-10"
                        confirmMessage="Are you sure you want to delete this photo?"
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="folderId" value={item.folderId} />
                        <button
                          type="submit"
                          className="inline-flex h-6 items-center justify-center rounded-[8px] border border-rose-300/45 bg-[#250d17]/90 px-2 text-[10px] font-semibold text-rose-100 transition hover:bg-[#3a1222]"
                        >
                          Delete
                        </button>
                      </ConfirmableServerForm>
                    ) : null}
                  </div>
                  <div className="space-y-0.5 px-2 py-1.5">
                    <p className="line-clamp-1 text-[11px] font-semibold text-white/90">{item.title}</p>
                    {item.caption ? <p className="text-[10px] text-white/60 line-clamp-1">{item.caption}</p> : null}
                    <p className="text-[9px] text-white/35">
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

async function CreateFolderCard({
  roles
}: {
  roles: Array<{ id: string; name: string }>;
}) {
  const { createGalleryFolderAction } = await import("./actions");

  return (
    <Card
      title="Create Folder"
      description="Assign role-based visibility per folder. Leave roles empty to make folder visible to all users."
      accent="indigo"
    >
      <form action={createGalleryFolderAction} className="grid grid-cols-1 gap-3 sm:gap-4">
        <div>
          <Label required>Folder name</Label>
          <Input name="name" placeholder="Annual Day 2026" required />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={2} placeholder="Photos from school annual day celebrations" />
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
          <Button type="submit">Create folder</Button>
        </div>
      </form>
    </Card>
  );
}

async function UploadImageCard({
  folders,
  selectedFolderId
}: {
  folders: Array<{ id: string; name: string }>;
  selectedFolderId?: string;
}) {
  const { uploadGalleryItemAction } = await import("./actions");

  return (
    <Card title="Upload Image" description="Add school gallery images to a selected folder" accent="teal">
      <form action={uploadGalleryItemAction} encType="multipart/form-data" className="grid grid-cols-1 gap-3 sm:gap-4">
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
          <Input name="title" placeholder="Book fair day" />
          <p className="mt-1 text-[11px] text-white/35">If multiple images are selected, file names are used automatically.</p>
        </div>
        <div>
          <Label>Caption</Label>
          <Textarea name="caption" rows={2} placeholder="Students explored reading corners and story sessions." />
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
    </Card>
  );
}
