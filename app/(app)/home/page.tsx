import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";
import { atLeastLevel, getEffectivePermissions, type ModuleKey } from "@/lib/permissions";
import { requireSession } from "@/lib/require";

const HOME_SHORTCUTS: Array<{
  moduleKey: ModuleKey;
  href: string;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    moduleKey: "GALLERY",
    href: "/gallery",
    icon: "🖼️",
    title: "School Gallery",
    description: "Photos, albums, and school highlights shared by your institution."
  },
  {
    moduleKey: "SCHOOL_CALENDAR",
    href: "/calendar",
    icon: "🗓️",
    title: "School Calendar",
    description: "Monthly events, holidays, exams, and important school dates."
  }
];

export default async function HomePage() {
  const session = await requireSession();
  if (session.roleKey === "ADMIN") redirect("/dashboard");

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const shortcuts = HOME_SHORTCUTS.map((item) => {
    const level = perms[item.moduleKey];
    const canView = level ? atLeastLevel(level, "VIEW") : false;
    return { ...item, canView };
  });
  const hasAccess = shortcuts.some((item) => item.canView);

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="Home"
        subtitle="Quick access to School Gallery and School Calendar"
      />

      {!hasAccess ? (
        <Card>
          <EmptyState
            icon="🏠"
            title="No home modules available"
            description="Your role does not have access to Gallery or School Calendar."
          />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shortcuts.map((item) => (
          <Card
            key={item.moduleKey}
            accent={item.moduleKey === "GALLERY" ? "teal" : "indigo"}
            className={item.canView ? "" : "opacity-70"}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="space-y-1.5">
                <p className="text-2xl leading-none">{item.icon}</p>
                <h2 className="text-[16px] font-semibold text-white/95">{item.title}</h2>
                <p className="text-[12px] text-white/58">{item.description}</p>
              </div>

              {item.canView ? (
                <Link href={item.href} className="mt-auto">
                  <Button className="w-full justify-center">Open {item.title}</Button>
                </Link>
              ) : (
                <Button className="mt-auto w-full justify-center" variant="secondary" disabled>
                  Not available for your role
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
