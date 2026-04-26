import Link from "next/link";
import { BrandWordmark } from "@/components/brand";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ schoolSlug?: string }>;
}) {
  const { schoolSlug } = await searchParams;
  return (
    <main className="min-h-dvh md:min-h-screen overflow-y-auto keyboard-aware keyboard-aware-scroll flex items-start justify-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[520px] md:max-w-[860px] space-y-4 sm:space-y-5 animate-fade-up">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors"
        >
          ← Back to home
        </Link>

        <Card accent="indigo" className="overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2">
              <BrandWordmark size="sm" />
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-white/95">Sign in to EduHub</h1>
            <p className="mt-1 text-sm text-white/58">Enter your credentials to continue.</p>
          </div>
          <div className="mt-4">
            <LoginForm defaultSchoolSlug={schoolSlug} />
          </div>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              href="/onboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-[13px] border border-white/[0.14] bg-[#101a2d]/90 text-sm font-semibold text-white/90 hover:bg-[#17253d] transition-colors"
            >
              Need a school account? Onboard
            </Link>
            <p className="text-xs text-white/40 text-center">Use your school slug and account credentials.</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
