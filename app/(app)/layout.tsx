import Link from "next/link";
import { requireUser } from "@/lib/require";
import { Badge } from "@/components/ui";
import { NavLink } from "@/components/nav-link";
import { MobileNav } from "@/components/mobile-nav";
import { UserMenu } from "@/components/user-menu";
import { BrandIcon } from "@/components/brand";
import { getEffectivePermissions, atLeastLevel } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session } = await requireUser();
  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const canView = (moduleKey: string) => {
    const level = perms[moduleKey];
    return level ? atLeastLevel(level, "VIEW") : false;
  };

  const mobileItems = [
    canView("DASHBOARD") ? { href: "/dashboard", label: "Dashboard" } : null,
    canView("STUDENTS") ? { href: "/students", label: "Students", activeStartsWith: true } : null,
    canView("FEES") ? { href: "/fees", label: "Fees", activeStartsWith: true } : null,
    canView("COMMUNICATION") ? { href: "/feed", label: "Feed" } : null,
    canView("ATTENDANCE") ? { href: "/attendance", label: "Attendance" } : null
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const mobileMore = [
    canView("ACADEMICS") ? { href: "/academics", label: "Academics", activeStartsWith: true } : null,
    canView("NOTIFICATIONS") ? { href: "/notifications", label: "Notifications", activeStartsWith: true } : null,
    canView("REPORTS") ? { href: "/reports", label: "Reports", activeStartsWith: true } : null
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1020]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold flex items-center gap-2">
              <BrandIcon size={34} />
              <span>EduHub</span>
            </Link>
            <div className="hidden sm:block">
              <Badge tone="info">Role: {session.roleKey}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MobileNav
              role={session.roleKey}
              userName={user.name}
              userEmail={user.email}
              items={mobileItems}
              moreItems={mobileMore}
            />
            <UserMenu userName={user.name} userEmail={user.email} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6 pb-24 md:pb-6">
        <nav className="hidden md:block rounded-2xl bg-white/[0.06] border border-white/10 p-4 h-fit backdrop-blur shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]">
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-xs text-white/60">{user.email}</div>
          <div className="mt-4 space-y-2 text-sm">
            {canView("DASHBOARD") ? <NavLink href="/dashboard" label="Dashboard" /> : null}
            {canView("STUDENTS") ? <NavLink href="/students" label="Students" /> : null}
            {canView("FEES") ? <NavLink href="/fees" label="Fees" /> : null}
            {canView("COMMUNICATION") ? <NavLink href="/feed" label="Feed" /> : null}
            {canView("ATTENDANCE") ? <NavLink href="/attendance" label="Attendance" /> : null}
            {canView("ACADEMICS") ? <NavLink href="/academics" label="Academics" /> : null}
            {canView("REPORTS") ? <NavLink href="/reports" label="Reports" /> : null}
            {canView("NOTIFICATIONS") ? <NavLink href="/notifications" label="Notifications" /> : null}
            {session.roleKey === "ADMIN" ? <NavLink href="/admin/users" label="Users (Admin)" /> : null}
            {canView("SETTINGS") && session.roleKey === "ADMIN" ? <NavLink href="/admin/settings" label="Settings" /> : null}
            {session.roleKey === "ADMIN" || session.roleKey === "PRINCIPAL" ? <NavLink href="/admin/approvals" label="Approvals" /> : null}
            {session.roleKey === "ADMIN" || session.roleKey === "PRINCIPAL" ? <NavLink href="/admin/audit" label="Audit Logs" /> : null}
          </div>
        </nav>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

// NavLink moved to client component for active-state highlighting.
