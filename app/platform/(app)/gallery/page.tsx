import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/platform-require";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "hidden";
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function PlatformGalleryPage() {
  const { user } = await requirePlatformUser();

  const assignedSchoolIds =
    user.role === "SUPER_ADMIN"
      ? null
      : (
          await prisma.platformUserSchoolAssignment.findMany({
            where: { platformUserId: user.id },
            select: { schoolId: true }
          })
        ).map((row) => row.schoolId);

  const where = assignedSchoolIds ? { id: { in: assignedSchoolIds } } : undefined;

  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      users: {
        where: { schoolRole: { key: "ADMIN" } },
        select: { name: true, email: true },
        orderBy: { createdAt: "asc" },
        take: 1
      },
      _count: {
        select: {
          galleryFolders: true,
          galleryItems: true
        }
      }
    },
    orderBy: { name: "asc" },
    take: 300
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Platform Gallery"
        subtitle="Manage gallery folders and images for schools from a central panel"
      />

      <Card>
        {schools.length === 0 ? (
          <EmptyState icon="🖼️" title="No schools available" description="Assign schools to this platform user or onboard a new school." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {schools.map((school, index) => {
              const admin = school.users[0] ?? null;
              return (
                <Link
                  key={school.id}
                  href={`/platform/schools/${encodeURIComponent(school.id)}/gallery`}
                  className={[
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3.5 hover:bg-white/[0.04] transition",
                    index === 0 ? "rounded-t-[14px]" : "",
                    index === schools.length - 1 ? "rounded-b-[14px]" : ""
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-white/90">{school.name}</span>
                      <span className="text-[12px] text-white/40">({school.slug})</span>
                    </div>
                    <p className="mt-1 text-[12px] text-white/45">
                      Admin: {admin ? `${admin.name} (${maskEmail(admin.email)})` : "Not assigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{school._count.galleryFolders} folders</Badge>
                    <Badge tone="info">{school._count.galleryItems} images</Badge>
                    <Badge tone={school.isActive ? "success" : "danger"} dot>
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
