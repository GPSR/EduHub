import Link from "next/link";
import { Card } from "@/components/ui";
import { PlatformLoginForm } from "@/components/platform-login-form";
import { BrandLogo } from "@/components/brand";
import { prisma } from "@/lib/db";

export default async function PlatformLoginPage() {
  const hasSuperAdmin = Boolean(await prisma.platformUser.findFirst({ select: { id: true } }));

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <Card title="Platform Login (Super Admin)">
          <PlatformLoginForm />
        </Card>
        {!hasSuperAdmin ? (
          <div className="text-sm text-white/70">
            First time?{" "}
            <Link href="/platform/onboard" className="text-indigo-300 hover:text-indigo-200">
              Create Super Admin
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
