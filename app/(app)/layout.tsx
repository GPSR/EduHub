import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/require";
import { MobileNav } from "@/components/mobile-nav";
import { BrandIcon } from "@/components/brand";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { MobileProfileTrigger } from "@/components/mobile-profile-trigger";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getUserProfileImageUrl } from "@/lib/uploads";
import { getUnreadFeedCount } from "@/lib/feed-unread";
import { MOBILE_BOTTOM_PRIMARY_LIMIT } from "@/lib/mobile-nav-config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session } = await requireUser();
  const [perms, unreadCount, feedUnreadCount, school, userPhotoUrl] = await Promise.all([
    getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId }),
    prisma.notification.count({ where: { schoolId: session.schoolId, userId: session.userId, readAt: null } }),
    getUnreadFeedCount({ schoolId: session.schoolId, userId: session.userId, roleKey: session.roleKey }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { brandingLogoUrl: true, name: true } }),
    getUserProfileImageUrl(session.schoolId, user.id)
  ]);

  const canView = (moduleKey: string) => {
    if (moduleKey === "DASHBOARD") return session.roleKey === "ADMIN";
    if (session.roleKey === "ADMIN" &&
      ["DASHBOARD","REPORTS","SETTINGS","USERS"].includes(moduleKey)) return true;
    const level = perms[moduleKey];
    return level ? atLeastLevel(level, "VIEW") : false;
  };

  const mobilePrimaryCandidates = [
    canView("DASHBOARD")     ? { href: "/dashboard",  label: "Home"       }                          : null,
    canView("STUDENTS")      ? { href: "/students",   label: "Students",  activeStartsWith: true }   : null,
    canView("FEES")          ? { href: "/fees",        label: "Fees",      activeStartsWith: true }   : null,
    canView("COMMUNICATION") ? { href: "/feed",        label: "Feed"       }                          : null,
    canView("REPORTS")       ? { href: "/reports",     label: "Reports",   activeStartsWith: true }   : null,
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const mobileSecondaryCandidates = [
    canView("ATTENDANCE")    ? { href: "/attendance",   label: "Attendance",   activeStartsWith: true } : null,
    canView("ACADEMICS")     ? { href: "/academics",     label: "Academics",     activeStartsWith: true } : null,
    canView("NOTIFICATIONS") ? { href: "/notifications", label: "Notifications", activeStartsWith: true } : null,
    canView("TRANSPORT")     ? { href: "/transport",     label: "Transport",     activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/users",    label: "Users",    activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/settings", label: "Settings", activeStartsWith: true } : null,
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const mobileItems = mobilePrimaryCandidates.slice(0, MOBILE_BOTTOM_PRIMARY_LIMIT);
  const mobileMore = [
    ...mobilePrimaryCandidates.slice(MOBILE_BOTTOM_PRIMARY_LIMIT),
    ...mobileSecondaryCandidates
  ];

  return (
    <PullToRefresh>
      <div className="min-h-dvh md:min-h-screen overflow-x-clip">
        <header className="header-safe sticky top-0 z-20 border-b border-white/[0.10] bg-[#0f1728]/80 backdrop-blur-2xl">
          <div className="relative mx-auto w-full max-w-[520px] md:max-w-[1180px] px-3 sm:px-4 md:px-6 h-[62px] flex items-center justify-between gap-3">
            <MobileProfileTrigger userName={user.name} photoUrl={userPhotoUrl ?? undefined} />
            <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center">
              {school?.brandingLogoUrl ? (
                <Image
                  src={school.brandingLogoUrl}
                  alt="School Logo"
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] rounded-[8px] object-cover border border-white/[0.12]"
                />
              ) : (
                <BrandIcon size={30} />
              )}
            </Link>
            <span className="inline-flex min-w-[68px] justify-center rounded-full border border-blue-400/35 bg-blue-500/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-100/90">
              {session.roleKey}
            </span>
          </div>
        </header>

        <div
          className="mx-auto w-full max-w-[520px] md:max-w-[1180px] px-3 sm:px-4 md:px-6 py-4 md:py-6
                     pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
        >
          <main className="min-w-0 space-y-5 md:space-y-6">{children}</main>
        </div>

        <MobileNav
          role={session.roleKey}
          userName={user.name}
          userEmail={user.email}
          items={mobileItems}
          moreItems={mobileMore}
          unreadCount={unreadCount}
          feedUnreadCount={feedUnreadCount}
        />

        {/* PWA install prompt (mobile only) */}
        <PWAInstallPrompt />
      </div>
    </PullToRefresh>
  );
}
