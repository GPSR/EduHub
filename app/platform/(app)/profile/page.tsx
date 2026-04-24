import { Badge, SectionHeader } from "@/components/ui";
import { PlatformProfileSettings } from "@/components/platform-profile-settings";
import { requirePlatformUser } from "@/lib/platform-require";

function userInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PlatformProfilePage() {
  const { user } = await requirePlatformUser();

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Profile" subtitle="Manage your platform account details" />

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-[14px]
                       bg-gradient-to-b from-indigo-400 to-indigo-600 text-base font-bold text-white shadow-sm"
          >
            {userInitials(user.name)}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-white/95 sm:text-lg">{user.name}</h2>
            <p className="mt-0.5 text-sm text-white/50">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="info">{user.role}</Badge>
              <Badge tone={user.status === "APPROVED" ? "success" : user.status === "PENDING" ? "warning" : "danger"} dot>
                {user.status}
              </Badge>
              <Badge tone={user.isActive ? "success" : "danger"} dot>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <PlatformProfileSettings name={user.name} email={user.email} />
    </div>
  );
}
