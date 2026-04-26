import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/require";
import { MobileNav } from "@/components/mobile-nav";
import { BrandIcon } from "@/components/brand";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { MobileProfileTrigger } from "@/components/mobile-profile-trigger";
import { UserMenu } from "@/components/user-menu";
import { NavLink } from "@/components/nav-link";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getUserProfileImageUrl } from "@/lib/uploads";
import { getUnreadFeedCount } from "@/lib/feed-unread";
import { getUnreadSupportConversationCount } from "@/lib/support-unread";
import { getUnreadYouTubeLearningCount } from "@/lib/youtube-learning-unread";
import { MOBILE_BOTTOM_PRIMARY_LIMIT } from "@/lib/mobile-nav-config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session } = await requireUser();
  const [perms, unreadCount, feedUnreadCount, supportUnreadCount, youtubeUnreadCount, school, userPhotoUrl] = await Promise.all([
    getEffectivePermissions({ schoolId: session.schoolId, userId: session.userId, roleId: session.roleId }),
    prisma.notification.count({ where: { schoolId: session.schoolId, userId: session.userId, readAt: null } }),
    getUnreadFeedCount({ schoolId: session.schoolId, userId: session.userId, roleKey: session.roleKey }),
    getUnreadSupportConversationCount({ schoolId: session.schoolId, userId: session.userId }),
    getUnreadYouTubeLearningCount({ schoolId: session.schoolId, userId: session.userId, roleKey: session.roleKey }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { brandingLogoUrl: true, name: true } }),
    getUserProfileImageUrl(session.schoolId, user.id)
  ]);

  const canView = (moduleKey: string) => {
    if (moduleKey === "DASHBOARD") return session.roleKey === "ADMIN";
    if (session.roleKey === "ADMIN" && ["DASHBOARD", "REPORTS", "SETTINGS", "USERS", "TEACHER_SALARY"].includes(moduleKey)) {
      return true;
    }
    const level = perms[moduleKey];
    return level ? atLeastLevel(level, "VIEW") : false;
  };

  const mobilePrimaryCandidates = [
    canView("DASHBOARD") ? { href: "/dashboard", label: "Home" } : null,
    canView("GALLERY") ? { href: "/gallery", label: "Gallery", activeStartsWith: true } : null,
    canView("STUDENTS") ? { href: "/students", label: "Students", activeStartsWith: true } : null,
    canView("FEES") ? { href: "/fees", label: "Fees", activeStartsWith: true } : null,
    canView("COMMUNICATION") ? { href: "/feed", label: "Feed" } : null,
    canView("REPORTS") ? { href: "/reports", label: "Reports", activeStartsWith: true } : null
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const mobileSecondaryCandidates = [
    { href: "/support", label: "Support", activeStartsWith: true },
    canView("TIMETABLE") ? { href: "/timetable", label: "Timetable", activeStartsWith: true } : null,
    canView("ATTENDANCE") ? { href: "/attendance", label: "Attendance", activeStartsWith: true } : null,
    canView("ACADEMICS") ? { href: "/academics", label: "Academics", activeStartsWith: true } : null,
    canView("LEARNING_CENTER") ? { href: "/learning-center", label: "Learning", activeStartsWith: true } : null,
    canView("YOUTUBE_LEARNING") ? { href: "/youtube-learning", label: "YouTube", activeStartsWith: true } : null,
    canView("SCHOOL_CALENDAR") ? { href: "/calendar", label: "Calendar", activeStartsWith: true } : null,
    canView("LEAVE_REQUESTS") ? { href: "/leave-requests", label: "Leave", activeStartsWith: true } : null,
    canView("GALLERY") ? { href: "/gallery", label: "Gallery", activeStartsWith: true } : null,
    canView("NOTIFICATIONS") ? { href: "/notifications", label: "Notifications", activeStartsWith: true } : null,
    canView("TRANSPORT") ? { href: "/transport", label: "Transport", activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/users", label: "Users", activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/teacher-salary", label: "Salary", activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/settings", label: "Settings", activeStartsWith: true } : null
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const desktopItems = [
    canView("DASHBOARD") ? { href: "/dashboard", label: "Dashboard" } : null,
    canView("STUDENTS") ? { href: "/students", label: "Students" } : null,
    canView("FEES") ? { href: "/fees", label: "Fees" } : null,
    canView("ATTENDANCE") ? { href: "/attendance", label: "Attendance" } : null,
    canView("TIMETABLE") ? { href: "/timetable", label: "Timetable" } : null,
    canView("COMMUNICATION") ? { href: "/feed", label: "Feed" } : null,
    canView("ACADEMICS") ? { href: "/academics", label: "Academics" } : null,
    canView("REPORTS") ? { href: "/reports", label: "Reports" } : null,
    canView("GALLERY") ? { href: "/gallery", label: "Gallery" } : null,
    canView("LEARNING_CENTER") ? { href: "/learning-center", label: "Learning Center" } : null,
    canView("YOUTUBE_LEARNING") ? { href: "/youtube-learning", label: "YouTube Learning" } : null,
    canView("SCHOOL_CALENDAR") ? { href: "/calendar", label: "School Calendar" } : null,
    canView("LEAVE_REQUESTS") ? { href: "/leave-requests", label: "Leave Requests" } : null,
    canView("TRANSPORT") ? { href: "/transport", label: "Transport" } : null,
    canView("NOTIFICATIONS") ? { href: "/notifications", label: "Notifications" } : null,
    { href: "/support", label: "Support" },
    session.roleKey === "ADMIN" ? { href: "/admin/users", label: "Users" } : null,
    session.roleKey === "ADMIN" && canView("TEACHER_SALARY") ? { href: "/admin/teacher-salary", label: "Teacher Salary" } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/settings", label: "Settings" } : null
  ].filter(Boolean) as { href: string; label: string }[];

  const mobileItems = mobilePrimaryCandidates.slice(0, MOBILE_BOTTOM_PRIMARY_LIMIT);
  const mobileMore = [...mobilePrimaryCandidates.slice(MOBILE_BOTTOM_PRIMARY_LIMIT), ...mobileSecondaryCandidates];

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PullToRefresh>
      <div className="min-h-dvh md:min-h-screen overflow-x-clip">
        <header className="header-safe sticky top-0 z-20 border-b border-white/[0.10] bg-[#0f1728]/80 backdrop-blur-2xl">
          <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-4 md:px-6">
            <div className="relative flex h-[62px] items-center justify-between gap-3 md:hidden">
              <MobileProfileTrigger userName={user.name} photoUrl={userPhotoUrl ?? undefined} />
              <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center">
                {school?.brandingLogoUrl ? (
                  <Image
                    src={school.brandingLogoUrl}
                    alt="School Logo"
                    width={30}
                    height={30}
                    className="h-[30px] w-[30px] rounded-full object-contain bg-white/[0.04] p-0.5 border border-white/[0.12]"
                  />
                ) : (
                  <BrandIcon size={30} />
                )}
              </Link>
              <span className="inline-flex min-w-[68px] justify-center rounded-full border border-blue-400/35 bg-blue-500/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-100/90">
                {session.roleKey}
              </span>
            </div>

            <div className="hidden min-h-[60px] items-center justify-between gap-3 py-2 md:flex">
              <div className="flex min-w-0 items-center gap-2.5">
                {school?.brandingLogoUrl ? (
                  <Image
                    src={school.brandingLogoUrl}
                    alt="School Logo"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-contain bg-white/[0.04] p-0.5 border border-white/[0.12]"
                  />
                ) : (
                  <BrandIcon size={28} href="/dashboard" />
                )}
                <div className="h-6 w-px bg-white/[0.10]" />
                <span className="inline-flex rounded-full border border-blue-400/35 bg-blue-500/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-100/90">
                  {session.roleKey}
                </span>
                <span className="truncate text-[12px] text-white/45">{school?.name ?? "School"}</span>
              </div>

              <UserMenu userName={user.name} userEmail={user.email} photoUrl={userPhotoUrl ?? undefined} />
            </div>
          </div>
        </header>

        <div
          className="mx-auto w-full max-w-[1320px] px-3 sm:px-4 md:px-6 py-4 md:py-7
                     grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5 md:gap-7
                     pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"
        >
          <aside className="hidden md:flex flex-col gap-1 h-fit sticky top-[80px]">
            <div className="mb-3 rounded-[16px] border border-white/[0.12] bg-[#121a2a]/88 px-3 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                {userPhotoUrl ? (
                  <Image
                    src={userPhotoUrl}
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
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  badgeCount={
                    item.href === "/notifications"
                      ? unreadCount
                      : item.href === "/feed"
                        ? feedUnreadCount
                        : item.href === "/support"
                          ? supportUnreadCount
                          : item.href === "/youtube-learning"
                            ? youtubeUnreadCount
                            : 0
                  }
                />
              ))}
            </nav>

            <div className="mx-3 my-2 h-px bg-white/[0.07]" />
            <nav className="space-y-0.5">
              <NavLink href="/profile" label="Profile" />
            </nav>
          </aside>

          <main className="min-w-0 space-y-5 md:space-y-6">{children}</main>
        </div>

        <div className="md:hidden">
          <MobileNav
            role={session.roleKey}
            userName={user.name}
            userEmail={user.email}
            items={mobileItems}
            moreItems={mobileMore}
            unreadCount={unreadCount}
            feedUnreadCount={feedUnreadCount}
            supportUnreadCount={supportUnreadCount}
            youtubeUnreadCount={youtubeUnreadCount}
          />
        </div>

        <PWAInstallPrompt />
      </div>
    </PullToRefresh>
  );
}
