import { requireUser } from "@/lib/require";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { ProfileSettings } from "@/components/profile-settings";

export default async function ProfilePage() {
  const { user, session } = await requireUser();
  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, slug: true }
  });

  return (
    <div className="space-y-6">
      <Card title="Profile" description="Your account details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-white/60">Name</div>
            <div className="mt-1 font-semibold">{user.name}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">Email</div>
            <div className="mt-1 font-semibold">{user.email}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">Role</div>
            <div className="mt-1 font-semibold">{session.roleKey}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">School</div>
            <div className="mt-1 font-semibold">
              {school ? school.name : "—"} {school ? <span className="text-white/60">({school.slug})</span> : null}
            </div>
          </div>
        </div>
      </Card>

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

      <form action="/logout" method="post" className="flex justify-end">
        <button className="rounded-2xl border border-rose-500/30 bg-rose-500/15 px-4 py-2.5 text-sm text-rose-100 hover:bg-rose-500/20">
          Logout
        </button>
      </form>
    </div>
  );
}
