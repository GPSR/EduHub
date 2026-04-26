import Link from "next/link";
import { Card } from "@/components/ui";
import { PlatformLoginForm } from "@/components/platform-login-form";
import { BrandWordmark } from "@/components/brand";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage() {
  const hasSuperAdmin = Boolean(await prisma.platformUser.findFirst({ select: { id: true } }));

  return (
    <main className="min-h-dvh md:min-h-screen overflow-y-auto keyboard-aware keyboard-aware-scroll flex items-start justify-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[520px] md:max-w-[860px] space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to home
        </Link>
        <Card accent="indigo">
          <div className="flex flex-col items-center text-center">
            <BrandWordmark size="md" href="/platform/login" priority className="mb-2" />
            <h1 className="text-[24px] font-extrabold tracking-tight text-white/95">Platform Sign In</h1>
            <p className="mt-1 text-sm text-white/58">Enter platform admin credentials.</p>
          </div>
          <div className="mt-4">
            <PlatformLoginForm />
          </div>
          {!hasSuperAdmin && (
            <div className="mt-4 flex justify-center">
              <Link
                href="/platform/onboard"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-[13px] border border-white/[0.14] bg-[#101a2d]/90 text-sm font-semibold text-white/90 hover:bg-[#17253d] transition-colors"
              >
                Create Super Admin
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
