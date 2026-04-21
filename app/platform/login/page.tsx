import Link from "next/link";
import { Card } from "@/components/ui";
import { PlatformLoginForm } from "@/components/platform-login-form";
import { BrandLogo } from "@/components/brand";
import { prisma } from "@/lib/db";

export default async function PlatformLoginPage() {
  const hasSuperAdmin = Boolean(await prisma.platformUser.findFirst({ select: { id: true } }));

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandLogo />
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
