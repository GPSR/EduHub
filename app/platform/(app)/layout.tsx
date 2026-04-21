import Link from "next/link";
import { requirePlatformUser } from "@/lib/platform-require";
import { PlatformNavLink } from "@/components/platform-nav-link";
import { PlatformUserMenu } from "@/components/platform-user-menu";
import { BrandIcon } from "@/components/brand";

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformUser();
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_20%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_420px_at_90%_-20%,rgba(59,130,246,0.12),transparent_55%),linear-gradient(180deg,#070b16_0%,#0b1020_50%,#0a1020_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1020]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandIcon size={28} href="/platform" />
            <div className="h-7 w-px bg-white/10" />
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-1">
              <PlatformNavLink href="/platform" label="Platform" />
            {user.role === "SUPER_ADMIN" ? (
              <>
                <PlatformNavLink href="/platform/users" label="Users" />
                <PlatformNavLink href="/platform/settings" label="Settings" />
                <PlatformNavLink href="/platform/onboarding-requests" label="Approvals" />
                <PlatformNavLink href="/platform/subscriptions" label="Subscriptions" />
                <PlatformNavLink href="/platform/audit" label="Audit" />
              </>
            ) : (
                <span className="text-sm text-white/70 px-2">Support User</span>
            )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <PlatformUserMenu name={user.name} email={user.email} />
            <form action="/platform/logout" method="post">
              <button className="text-sm text-white/75 hover:text-white rounded-xl border border-white/10 px-3 py-2 hover:bg-white/[0.06] transition">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
    </div>
  );
}
