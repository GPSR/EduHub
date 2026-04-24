import { Badge } from "@/components/ui";
import { PlatformProfileSettings } from "@/components/platform-profile-settings";
import { requirePlatformUser } from "@/lib/platform-require";
import { getPlatformUserProfileImageUrl } from "@/lib/uploads";
import { PlatformProfileAvatarUploader } from "@/components/platform-profile-avatar-uploader";

export default async function PlatformProfilePage() {
  const { user } = await requirePlatformUser();
  const profilePhotoUrl = await getPlatformUserProfileImageUrl(user.id);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-lg sm:text-xl font-semibold tracking-tight text-white/92">Profile</h1>
          <form action="/platform/logout" method="post" className="shrink-0">
            <button
              type="submit"
              className="rounded-[13px] border border-rose-500/25 bg-rose-500/[0.10]
                         px-4 py-2 text-sm font-medium text-rose-300
                         hover:bg-rose-500/[0.20] hover:border-rose-500/35 transition-all"
            >
              Sign out
            </button>
          </form>
        </div>
        <p className="text-xs sm:text-sm text-white/60">Manage your platform account details</p>
      </div>

      <div className="rounded-[22px] border border-white/[0.12] bg-[#121a2a]/88 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <PlatformProfileAvatarUploader userName={user.name} photoUrl={profilePhotoUrl} />
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
