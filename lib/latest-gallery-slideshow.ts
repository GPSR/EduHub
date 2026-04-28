import { db } from "@/lib/db";

type LatestGallerySlideshowArgs = {
  schoolId: string;
  roleKey: string;
  roleId: string;
  take?: number;
};

export type LatestGallerySlideshow = {
  folderId: string;
  folderName: string;
  items: Array<{
    id: string;
    title: string;
    caption: string | null;
    imageUrl: string;
    by: string;
  }>;
} | null;

export async function getLatestGallerySlideshow(args: LatestGallerySlideshowArgs): Promise<LatestGallerySlideshow> {
  const take = Math.min(Math.max(args.take ?? 20, 1), 80);
  const roleVisibilityWhere =
    args.roleKey === "ADMIN"
      ? { isActive: true }
      : {
          isActive: true,
          OR: [{ roleAccess: { none: {} } }, { roleAccess: { some: { schoolRoleId: args.roleId } } }]
        };

  const latestItem = await db.schoolGalleryItem.findFirst({
    where: {
      schoolId: args.schoolId,
      folder: {
        schoolId: args.schoolId,
        ...(roleVisibilityWhere as any)
      }
    },
    orderBy: { createdAt: "desc" },
    select: {
      folderId: true,
      folder: { select: { name: true } }
    }
  });

  if (!latestItem?.folderId) return null;

  const items = await db.schoolGalleryItem.findMany({
    where: {
      schoolId: args.schoolId,
      folderId: latestItem.folderId
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      caption: true,
      imageUrl: true,
      createdByUser: { select: { name: true } },
      createdByPlatformUser: { select: { name: true } }
    }
  });

  if (items.length === 0) return null;

  return {
    folderId: latestItem.folderId,
    folderName: latestItem.folder.name,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      imageUrl: item.imageUrl,
      by: item.createdByUser?.name ?? item.createdByPlatformUser?.name ?? "System"
    }))
  };
}
