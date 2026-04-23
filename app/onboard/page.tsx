import Link from "next/link";
import { Card } from "@/components/ui";
import { OnboardForm } from "@/components/onboard-form";
import { BrandIcon } from "@/components/brand";

export default function OnboardPage() {
  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-2xl space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandIcon size={72} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Set up your school</h1>
          <p className="mt-2 text-sm text-white/50">Create your school account and first admin user in minutes.</p>
        </div>
        <Card title="School Details" description="Fill in the info below to get started" accent="indigo">
          <OnboardForm />
        </Card>
        <p className="text-center text-xs text-white/25">
          Already have an account?{" "}
          <Link href="/login" className="text-white/45 hover:text-white/70 transition">Sign in →</Link>
        </p>
      </div>
    </main>
  );
}
