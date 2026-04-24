import { requirePlatformUser } from "@/lib/platform-require";
import { PlatformNavLink } from "@/components/platform-nav-link";
import { PlatformUserMenu } from "@/components/platform-user-menu";
import { BrandIcon } from "@/components/brand";
import { PlatformMobileNav } from "@/components/platform-mobile-nav";
import { PlatformMobileProfileTrigger } from "@/components/platform-mobile-profile-trigger";
import { Badge } from "@/components/ui";
import { getPlatformUserProfileImageUrl } from "@/lib/uploads";
import Image from "next/image";

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformUser();
  const profilePhotoUrl = await getPlatformUserProfileImageUrl(user.id);
  const desktopItems =
    user.role === "SUPER_ADMIN"
      ? [
          { href: "/platform", label: "Dashboard", icon: "◈" },
          { href: "/platform/schools", label: "Schools", icon: "🏫" },
          { href: "/platform/onboarding-requests", label: "Approvals", icon: "📋" },
          { href: "/platform/users", label: "Users", icon: "🛡" },
          { href: "/platform/subscriptions", label: "Subscriptions", icon: "💎" },
          { href: "/platform/audit", label: "Audit", icon: "🧾" },
          { href: "/platform/settings", label: "Settings", icon: "⚙️" }
        ]
      : [{ href: "/platform", label: "Dashboard", icon: "◈" }];

  const mobileNavCandidates =
    user.role === "SUPER_ADMIN"
      ? [
          { href: "/platform", label: "Home", icon: "◈" },
          { href: "/platform/schools", label: "Schools", icon: "🏫" },
          { href: "/platform/onboarding-requests", label: "Approvals", icon: "📋" },
          { href: "/platform/users", label: "Users", icon: "🛡" },
          { href: "/platform/settings", label: "Settings", icon: "⚙️" },
          { href: "/platform/subscriptions", label: "Plans", icon: "💎" },
          { href: "/platform/audit", label: "Audit", icon: "🧾" }
        ]
      : [{ href: "/platform", label: "Home", icon: "◈" }];
  const mobileItems = mobileNavCandidates;

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh md:min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-white/[0.10] bg-[#0f1728]/80 backdrop-blur-2xl pt-[max(0px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6">
          <div className="relative flex min-h-[60px] items-center justify-between py-2 md:hidden">
            <PlatformMobileProfileTrigger userName={user.name} photoUrl={profilePhotoUrl} />
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
                className="inline-flex rounded-full border border-blue-400/35 bg-blue-500/18 px-2.5 py-1
                           text-[11px] font-semibold uppercase tracking-widest text-blue-100/90"
              >
                Platform
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Badge tone="info">{user.role}</Badge>
              <PlatformUserMenu name={user.name} email={user.email} photoUrl={profilePhotoUrl} />
            </div>
          </div>
        </div>
      </header>

      <div
        className="mx-auto max-w-[1320px] px-3 sm:px-4 md:px-6 py-4 md:py-7
                   grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 md:gap-7
                   pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"
      >
        <aside className="hidden md:flex flex-col gap-1 h-fit sticky top-[78px]">
          <div className="mb-3 rounded-[16px] border border-white/[0.12] bg-[#121a2a]/88 px-3 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              {profilePhotoUrl ? (
                <Image
                  src={profilePhotoUrl}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-[10px] object-cover border border-white/[0.12]"
                />
              ) : (
                <div
                  className="grid h-8 w-8 place-items-center rounded-[10px]
                             bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-xs font-bold text-white shadow-sm shrink-0"
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white/90">{user.name}</div>
                <div className="truncate text-[11px] text-white/45">{user.email}</div>
              </div>
            </div>
          </div>

          <nav className="space-y-0.5">
            {desktopItems.map((item) => (
              <PlatformNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </nav>

          <div className="mx-3 my-2 h-px bg-white/[0.07]" />
          <nav className="space-y-0.5">
            <PlatformNavLink href="/platform/profile" label="Profile" icon="👤" />
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          {children}
        </main>
      </div>

      <PlatformMobileNav items={mobileItems} userName={user.name} userEmail={user.email} photoUrl={profilePhotoUrl} />
    </div>
  );
}
