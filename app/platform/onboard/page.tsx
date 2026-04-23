import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { PlatformOnboardForm } from "@/components/platform-onboard-form";
import { BrandIcon } from "@/components/brand";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlatformOnboardPage() {
  const existing = await prisma.platformUser.findFirst({ select: { id: true } });
  if (existing) redirect("/platform/login");

  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md space-y-4 animate-fade-up">
        <Link href="/platform/login" className="text-sm text-white/70 hover:text-white">
          ← Back to platform login
        </Link>
        <div className="flex justify-center">
          <BrandIcon size={72} />
        </div>
        <Card title="Create First Super Admin">
          <PlatformOnboardForm />
        </Card>
      </div>
    </main>
  );
}
