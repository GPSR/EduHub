import { requireUser } from "@/lib/require";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui";
import { ProfileSettings } from "@/components/profile-settings";
import { getUserProfileImageUrl } from "@/lib/uploads";
import { ProfileAvatarUploader } from "@/components/profile-avatar-uploader";

export default async function ProfilePage() {
  const { user, session } = await requireUser();
  const [school, profilePhotoUrl] = await Promise.all([
    db.school.findUnique({
      where: { id: user.schoolId },
      select: {
        name: true,
        slug: true,
        isActive: true,
        subscription: { select: { plan: true } }
      },
    }),
    getUserProfileImageUrl(user.schoolId, user.id)
  ]);
  const schoolPlan = school?.subscription?.plan ?? "TRIAL";
  const schoolStatus = school?.isActive ? "Active" : "Inactive";

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-lg sm:text-xl font-semibold tracking-tight text-white/92">Profile</h1>
          <form action="/logout" method="post" className="shrink-0">
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
        <p className="text-xs sm:text-sm text-white/60">Manage your account details</p>
      </div>

      {/* Profile hero */}
      <div className="rounded-[22px] border border-white/[0.12] bg-[#121a2a]/88 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-4 sm:gap-5">
          <ProfileAvatarUploader userName={user.name} photoUrl={profilePhotoUrl ?? undefined} />
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base sm:text-lg font-bold text-white/95 tracking-tight">{user.name}</h2>
            <p className="text-sm text-white/50 mt-0.5">{user.email}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge tone="info">{session.roleKey}</Badge>
              {school && (
                <Badge tone="neutral">{school.name} <span className="opacity-50">({school.slug})</span></Badge>
              )}
              <Badge tone={schoolPlan === "TRIAL" ? "warning" : "success"}>{schoolPlan}</Badge>
              <Badge tone={schoolStatus === "Active" ? "success" : "danger"} dot>{schoolStatus}</Badge>
            </div>
          </div>
        </div>
      </div>

      <ProfileSettings
        roleKey={session.roleKey}
        schoolLabel={school ? `${school.name} (${school.slug})` : "—"}
        email={user.email}
        firstName={user.firstName}
        lastName={user.lastName}
        gender={user.gender}
        phoneNumber={user.phoneNumber}
        alternatePhoneNumber={user.alternatePhoneNumber}
        address={user.address}
        city={user.city}
        state={user.state}
        country={user.country}
        postalCode={user.postalCode}
        dateOfBirth={user.dateOfBirth}
        emergencyContactName={user.emergencyContactName}
        emergencyContactPhone={user.emergencyContactPhone}
        notes={user.notes}
      />

    </div>
  );
}
