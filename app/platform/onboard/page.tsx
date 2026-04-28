import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { PlatformOnboardForm } from "@/components/platform-onboard-form";
import { BrandIcon } from "@/components/brand";
import { db } from "@/lib/db";
import { platformOnboardNeedsSetupKey, platformOnboardReady } from "@/lib/platform-onboard-guard";

export const dynamic = "force-dynamic";

export default async function PlatformOnboardPage() {
  const existing = await db.platformUser.findFirst({ select: { id: true } });
  if (existing) redirect("/platform/login");
  const ready = platformOnboardReady();
  const requireSetupKey = platformOnboardNeedsSetupKey();

  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-5xl space-y-4 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Link href="/platform/login" className="text-sm text-white/70 hover:text-white self-start">
            ← Back to platform login
          </Link>
          <Link href="/platform/login" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">Platform Login</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card accent="teal" className="overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex justify-center lg:justify-start">
                  <BrandIcon size={90} />
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white/95 text-center lg:text-left">
                  Platform Setup
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed text-center lg:text-left">
                  Create the first Super Admin account to activate centralized platform controls.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {["First-time setup", "Secure credentials", "Immediate platform access"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border border-blue-300/30 bg-blue-500/12 px-2.5 py-1 text-[11px] font-medium text-blue-100/95"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Create First Super Admin" description="This is required only once" accent="indigo">
            {ready ? (
              <PlatformOnboardForm requireSetupKey={requireSetupKey} />
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Platform onboarding is locked. Configure <code>PLATFORM_ONBOARD_SECRET</code> with at least 16 characters and restart the app.
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
