import Link from "next/link";
import { requirePlatformUser } from "@/lib/platform-require";
import { PlatformNavLink } from "@/components/platform-nav-link";
import { PlatformUserMenu } from "@/components/platform-user-menu";
import { BrandIcon } from "@/components/brand";

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#060912]/88 backdrop-blur-xl">
        <div className="mx-auto max-w-[1320px] px-4 md:px-6 h-[60px] flex items-center justify-between gap-4">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-3">
            <BrandIcon size={28} href="/platform" />
            <div className="h-6 w-px bg-white/[0.10]" />
            {/* Platform badge */}
            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300/80
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
          <div className="flex items-center gap-2">
            <PlatformUserMenu name={user.name} email={user.email} />
            <form action="/platform/logout" method="post">
              <button className="text-sm text-white/55 hover:text-white/85
                                  rounded-[11px] border border-white/[0.09] bg-white/[0.04]
                                  px-3 py-1.5 hover:bg-white/[0.09] transition-all">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1320px] px-4 md:px-6 py-6">{children}</div>
    </div>
  );
}
