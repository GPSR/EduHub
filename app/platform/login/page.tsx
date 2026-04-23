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
      <div className="w-full max-w-[400px] space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandLogo size="sm" className="max-w-full" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-white/95">Platform Admin</h1>
          <p className="mt-1.5 text-sm text-white/45">Super admin access for managing all schools.</p>
        </div>
        <Card title="Platform Sign In" accent="indigo">
          <PlatformLoginForm />
        </Card>
        {!hasSuperAdmin && (
          <p className="text-center text-sm text-white/40">
            First time?{" "}
            <Link href="/platform/onboard" className="text-indigo-300 hover:text-indigo-200 transition">
              Create Super Admin →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
