import Link from "next/link";
import { BrandWordmark } from "@/components/brand";
import { Button, Card } from "@/components/ui";
import { OnboardForm } from "@/components/onboard-form";
import { getSession } from "@/lib/session";
import { resolveActiveSchoolSession } from "@/lib/auth-session";

export default async function OnboardPage() {
  const session = await resolveActiveSchoolSession(await getSession());

  return (
    <main className="min-h-dvh md:min-h-screen flex items-start justify-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[520px] md:max-w-[860px] space-y-4 sm:space-y-5 animate-fade-up">
        <div className="flex flex-col gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors self-start">
            ← Back to home
          </Link>
          {session && (
            <Link href="/dashboard" className="w-full">
              <Button variant="secondary" size="sm" className="w-full">Dashboard</Button>
            </Link>
          )}
        </div>

        <Card accent="indigo" className="overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2">
              <BrandWordmark size="md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/95">School onboarding</h1>
            <p className="mt-1 text-sm sm:text-base text-white/60">Fill this form once. It takes about 2 minutes.</p>
          </div>

          <div className="mt-4 rounded-[12px] border border-white/[0.12] bg-[#101a2d]/72 px-3.5 py-3">
            <p className="text-xs sm:text-sm text-white/65">
              After submit, our team reviews your details and sends approval status by email within 24 hours.
            </p>
          </div>

          <div className="mt-5">
            <OnboardForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
