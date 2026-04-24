import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { OnboardForm } from "@/components/onboard-form";
import { BrandIcon } from "@/components/brand";
import { getSession } from "@/lib/session";

export default async function OnboardPage() {
  const session = await getSession();

  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-5 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors self-start">
            ← Back to home
          </Link>
          {session && (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">Dashboard</Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card accent="teal" className="overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex justify-center lg:justify-start">
                  <BrandIcon size={78} />
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white/95 text-center lg:text-left">
                  Get Started
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed text-center lg:text-left">
                  Create your school and admin account in minutes with a secure onboarding workflow.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {["School profile setup", "Admin account ready", "Approval by email"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border border-blue-300/30 bg-blue-500/12 px-2.5 py-1 text-[11px] font-medium text-blue-100/95"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-5 text-xs text-white/40 text-center lg:text-left">
                  Free to start · No credit card required
                </p>
              </div>
            </div>
          </Card>

          <Card title="School Details" description="Fill in the info below to get started" accent="indigo">
            <OnboardForm />
          </Card>
        </div>
      </div>
    </main>
  );
}
