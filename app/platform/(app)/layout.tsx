import Link from "next/link";
import { requirePlatformUser } from "@/lib/platform-require";
import { PlatformNavLink } from "@/components/platform-nav-link";
import { PlatformUserMenu } from "@/components/platform-user-menu";
import { BrandIcon } from "@/components/brand";
import { PlatformMobileNav } from "@/components/platform-mobile-nav";

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformUser();
  const mobileItems =
    user.role === "SUPER_ADMIN"
      ? [
          { href: "/platform", label: "Home", icon: "◈" },
          { href: "/platform/schools", label: "Schools", icon: "🏫" },
          { href: "/platform/onboarding-requests", label: "Approvals", icon: "📋" },
          { href: "/platform/users", label: "Users", icon: "🛡" },
          { href: "/platform/settings", label: "Settings", icon: "⚙️" }
        ]
      : [{ href: "/platform", label: "Home", icon: "◈" }];
  return (
    <div className="min-h-dvh md:min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#060912]/88 backdrop-blur-xl pt-[max(0px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6 min-h-[60px] py-2 flex items-center justify-between gap-3">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-2 min-w-0">
            <BrandIcon size={28} href="/platform" />
            <div className="hidden sm:block h-6 w-px bg-white/[0.10]" />
            {/* Platform badge */}
            <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-widest text-indigo-300/80
                             bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              Platform
            </span>
            {user.role === "SUPER_ADMIN" && (
              <nav className="hidden md:flex items-center gap-0.5 ml-2">
                <PlatformNavLink href="/platform"                        label="Dashboard"   />
                <PlatformNavLink href="/platform/users"                  label="Users"       />
                <PlatformNavLink href="/platform/onboarding-requests"    label="Approvals"   />
                <PlatformNavLink href="/platform/subscriptions"          label="Subscriptions"/>
                <PlatformNavLink href="/platform/audit"                  label="Audit"       />
                <PlatformNavLink href="/platform/settings"               label="Settings"    />
              </nav>
            )}
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            <PlatformUserMenu name={user.name} email={user.email} />
            <form action="/platform/logout" method="post">
              <button className="hidden sm:inline-flex text-sm text-white/55 hover:text-white/85
                                  rounded-[11px] border border-white/[0.09] bg-white/[0.04]
                                  px-3 py-1.5 hover:bg-white/[0.09] transition-all">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6 py-4 md:py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        {children}
      </div>
      <PlatformMobileNav items={mobileItems} />
    </div>
  );
}
