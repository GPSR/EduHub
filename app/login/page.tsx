import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";
import { BrandLogo } from "@/components/brand";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ schoolSlug?: string }>;
}) {
  const { schoolSlug } = await searchParams;
  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-5 animate-fade-up">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors"
        >
          ← Back to home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card accent="teal" className="overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex justify-center lg:justify-start">
                  <BrandLogo size="sm" className="max-w-full" />
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white/95 text-center lg:text-left">
                  Welcome Back
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed text-center lg:text-left">
                  Sign in to manage students, attendance, fees, communication, and more from one place.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {["Secure access", "Fast onboarding", "Mobile ready"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-500/12 px-2.5 py-1 text-[11px] font-medium text-cyan-100/95"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/onboard"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-[13px] border border-white/[0.14] bg-[#101a2d]/90 text-sm font-semibold text-white/90 hover:bg-[#17253d] transition-colors"
                  >
                    Onboard school
                  </Link>
                  <Link
                    href="/platform/login"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-[13px] border border-white/[0.14] bg-[#101a2d]/90 text-sm font-semibold text-white/90 hover:bg-[#17253d] transition-colors"
                  >
                    Platform login
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Sign in to EduHub" description="Enter your credentials to continue" accent="indigo">
            <LoginForm defaultSchoolSlug={schoolSlug} />
            <p className="mt-4 text-xs text-white/40 text-center sm:text-left">
              Use your school slug and account credentials.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
