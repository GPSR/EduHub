import Link from "next/link";
import { Card } from "@/components/ui";
import { PlatformLoginForm } from "@/components/platform-login-form";
import { BrandLogo } from "@/components/brand";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage() {
  const hasSuperAdmin = Boolean(await prisma.platformUser.findFirst({ select: { id: true } }));

  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to home
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card accent="teal" className="overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex justify-center lg:justify-start">
                  <BrandLogo size="sm" className="max-w-full" />
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white/95 text-center lg:text-left">
                  Platform Admin
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed text-center lg:text-left">
                  Super admin access to manage schools, onboarding approvals, users, modules, and subscriptions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {["Manage all schools", "Approve onboarding", "Secure super admin access"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-500/12 px-2.5 py-1 text-[11px] font-medium text-cyan-100/95"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                {!hasSuperAdmin && (
                  <Link
                    href="/platform/onboard"
                    className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-[13px] border border-white/[0.14] bg-[#101a2d]/90 text-sm font-semibold text-white/90 hover:bg-[#17253d] transition-colors"
                  >
                    Create Super Admin
                  </Link>
                )}
              </div>
            </div>
          </Card>

          <Card title="Platform Sign In" description="Enter platform admin credentials" accent="indigo">
            <PlatformLoginForm />
          </Card>
        </div>
      </div>
    </main>
  );
}
