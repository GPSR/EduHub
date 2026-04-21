import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { PlatformOnboardForm } from "@/components/platform-onboard-form";
import { BrandIcon } from "@/components/brand";
import { prisma } from "@/lib/db";

export default async function PlatformOnboardPage() {
  const existing = await prisma.platformUser.findFirst({ select: { id: true } });
  if (existing) redirect("/platform/login");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
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
