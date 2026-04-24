import { requirePlatformUser } from "@/lib/platform-require";
import { PlatformNavLink } from "@/components/platform-nav-link";
import { PlatformUserMenu } from "@/components/platform-user-menu";
import { BrandIcon } from "@/components/brand";
import { PlatformMobileNav } from "@/components/platform-mobile-nav";
import { PlatformMobileProfileTrigger } from "@/components/platform-mobile-profile-trigger";

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformUser();
  const mobileItems =
    user.role === "SUPER_ADMIN"
      ? [
          { href: "/platform", label: "Home", icon: "◈" },
          { href: "/platform/schools", label: "Schools", icon: "🏫" },
          { href: "/platform/onboarding-requests", label: "Approvals", icon: "📋" },
          { href: "/platform/users", label: "Users", icon: "🛡" },
          { href: "/platform/subscriptions", label: "Plans", icon: "💎" },
          { href: "/platform/audit", label: "Audit", icon: "🧾" },
          { href: "/platform/settings", label: "Settings", icon: "⚙️" }
        ]
      : [{ href: "/platform", label: "Home", icon: "◈" }];
  return (
    <div className="min-h-dvh md:min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#060912]/88 backdrop-blur-xl pt-[max(0px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6">
          <div className="relative flex min-h-[60px] items-center justify-between py-2 md:hidden">
            <PlatformMobileProfileTrigger userName={user.name} />
            <div className="absolute left-1/2 -translate-x-1/2">
              <BrandIcon size={28} href="/platform" />
            </div>
            <div className="w-9" />
          </div>

          <div className="hidden min-h-[60px] items-center justify-between gap-3 py-2 md:flex">
            <div className="flex min-w-0 items-center gap-2">
              <BrandIcon size={28} href="/platform" />
              <div className="h-6 w-px bg-white/[0.10]" />
              <span
                className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1
                           text-[11px] font-semibold uppercase tracking-widest text-indigo-300/80"
              >
                Platform
              </span>
              {user.role === "SUPER_ADMIN" && (
                <nav className="ml-2 flex items-center gap-0.5">
                  <PlatformNavLink href="/platform" label="Dashboard" />
                  <PlatformNavLink href="/platform/schools" label="Schools" />
                  <PlatformNavLink href="/platform/users" label="Users" />
                  <PlatformNavLink href="/platform/onboarding-requests" label="Approvals" />
                  <PlatformNavLink href="/platform/subscriptions" label="Subscriptions" />
                  <PlatformNavLink href="/platform/audit" label="Audit" />
                  <PlatformNavLink href="/platform/settings" label="Settings" />
                </nav>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <PlatformUserMenu name={user.name} email={user.email} />
              <form action="/platform/logout" method="post">
                <button
                  className="inline-flex rounded-[11px] border border-white/[0.09] bg-white/[0.04]
                             px-3 py-1.5 text-sm text-white/55 transition-all hover:bg-white/[0.09] hover:text-white/85"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6 py-4 md:py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        {children}
      </div>
      <PlatformMobileNav items={mobileItems} userName={user.name} userEmail={user.email} />
    </div>
  );
}
