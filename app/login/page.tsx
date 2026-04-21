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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] space-y-5 animate-fade-up">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors"
        >
          ← Back to home
        </Link>

        {/* Brand */}
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        {/* Form card */}
        <Card title="Sign in to EduHub" description="Enter your credentials to continue" accent="indigo">
          <LoginForm defaultSchoolSlug={schoolSlug} />
        </Card>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 text-sm text-white/45">
          <Link href="/onboard" className="hover:text-white/80 transition-colors">
            Create a school
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/" className="hover:text-white/80 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
