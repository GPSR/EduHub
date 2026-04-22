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
    if (
      session.roleKey === "ADMIN" &&
      (moduleKey === "DASHBOARD" || moduleKey === "REPORTS" || moduleKey === "SETTINGS" || moduleKey === "USERS")
    ) {
      return true;
    }
    const level = perms[moduleKey];
    return level ? atLeastLevel(level, "VIEW") : false;
  };

  const mobileItems = [
    canView("DASHBOARD")     ? { href: "/dashboard",  label: "Dashboard" }                    : null,
    canView("STUDENTS")      ? { href: "/students",   label: "Students",   activeStartsWith: true } : null,
    canView("FEES")          ? { href: "/fees",        label: "Fees",       activeStartsWith: true } : null,
    canView("COMMUNICATION") ? { href: "/feed",        label: "Feed" }                         : null,
    canView("ATTENDANCE")    ? { href: "/attendance",  label: "Attendance" }                   : null,
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  const mobileMore = [
    canView("ACADEMICS")      ? { href: "/academics",        label: "Academics",     activeStartsWith: true } : null,
    canView("NOTIFICATIONS")  ? { href: "/notifications",    label: "Notifications", activeStartsWith: true } : null,
    canView("REPORTS")        ? { href: "/reports",          label: "Reports",       activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/users",    label: "Users",         activeStartsWith: true } : null,
    session.roleKey === "ADMIN" ? { href: "/admin/settings", label: "Settings",      activeStartsWith: true } : null,
  ].filter(Boolean) as { href: string; label: string; activeStartsWith?: boolean }[];

  return (
    <div className="min-h-screen">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#060912]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1320px] px-4 md:px-6 h-[62px] flex items-center justify-between gap-4">
          {/* Logo + name */}
          <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
            <BrandIcon size={30} />
            <span className="hidden sm:block text-[15px] font-semibold text-white/90 group-hover:text-white transition">
              EduHub
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge tone="info">{session.roleKey}</Badge>
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

      {/* ── Page body ── */}
      <div className="mx-auto max-w-[1320px] px-4 md:px-6 py-5 md:py-7
                      grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 md:gap-7
                      pb-28 md:pb-8">
        {/* ── Sidebar ── */}
        <aside className="hidden md:flex flex-col gap-1 h-fit sticky top-[78px]">
          {/* User card at top of sidebar */}
          <div className="mb-3 px-3 py-3 rounded-[16px] border border-white/[0.08] bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-b from-indigo-400 to-indigo-600 text-xs font-bold text-white shadow-sm shrink-0">
                {user.name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white/90 truncate">{user.name}</div>
                <div className="text-[11px] text-white/45 truncate">{user.email}</div>
              </div>
            </div>
          </div>

          <nav className="space-y-0.5">
            {canView("DASHBOARD")     && <NavLink href="/dashboard"       label="Dashboard"    />}
            {canView("STUDENTS")      && <NavLink href="/students"        label="Students"     />}
            {canView("FEES")          && <NavLink href="/fees"            label="Fees"         />}
            {canView("COMMUNICATION") && <NavLink href="/feed"            label="Feed"         />}
            {canView("ATTENDANCE")    && <NavLink href="/attendance"      label="Attendance"   />}
            {canView("ACADEMICS")     && <NavLink href="/academics"       label="Academics"    />}
            {canView("REPORTS")       && <NavLink href="/reports"         label="Reports"      />}
            {canView("NOTIFICATIONS") && <NavLink href="/notifications"   label="Notifications"/>}
          </nav>

          {(session.roleKey === "ADMIN" || session.roleKey === "PRINCIPAL") && (
            <>
              <div className="mx-3 my-2 h-px bg-white/[0.07]" />
              <nav className="space-y-0.5">
                {session.roleKey === "ADMIN" && <NavLink href="/admin/users"     label="Users"       />}
                {canView("SETTINGS") && session.roleKey === "ADMIN" &&
                  <NavLink href="/admin/settings" label="Settings" />}
                <NavLink href="/admin/approvals" label="Approvals" />
                <NavLink href="/admin/audit"     label="Audit Logs" />
              </nav>
            </>
          )}
        </aside>

        {/* ── Main content ── */}
        <main className="min-w-0 space-y-5">{children}</main>
      </div>
    </div>
  );
}
