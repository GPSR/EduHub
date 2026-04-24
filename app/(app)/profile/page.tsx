import { requireUser } from "@/lib/require";
import { prisma } from "@/lib/db";
import { Card, Badge, SectionHeader } from "@/components/ui";
import { ProfileSettings } from "@/components/profile-settings";
import { getUserProfileImageUrl } from "@/lib/uploads";
import { ProfileAvatarUploader } from "@/components/profile-avatar-uploader";

export default async function ProfilePage() {
  const { user, session } = await requireUser();
  const [school, profilePhotoUrl] = await Promise.all([
    prisma.school.findUnique({
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
      <SectionHeader title="Profile" subtitle="Manage your account details" />

      {/* Profile hero */}
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <ProfileAvatarUploader userName={user.name} photoUrl={profilePhotoUrl ?? undefined} />
          <div className="min-w-0">
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

      {/* Details */}
      <Card title="Account Details" accent="indigo">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Full Name"  value={user.name}  />
          <Field label="Email"      value={user.email} />
          <Field label="Role"       value={session.roleKey} />
          <Field label="School"     value={school ? `${school.name} (${school.slug})` : "—"} />
          <Field label="School Plan" value={schoolPlan} />
          <Field label="School Status" value={schoolStatus} />
        </div>
      </Card>

      {/* Extended settings */}
      <ProfileSettings
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

      <div className="flex justify-end">
        <form action="/logout" method="post">
          <button
            type="submit"
            className="rounded-[13px] border border-rose-500/25 bg-rose-500/[0.10]
                       px-5 py-2.5 text-sm font-medium text-rose-300
                       hover:bg-rose-500/[0.20] hover:border-rose-500/35 transition-all"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-[14px] text-white/80">{value || "—"}</p>
    </div>
  );
}
