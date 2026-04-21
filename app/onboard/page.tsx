import Link from "next/link";
import { Card } from "@/components/ui";
import { OnboardForm } from "@/components/onboard-form";
import { BrandIcon } from "@/components/brand";

export default function OnboardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandIcon size={80} />
        </div>
        <Card title="Request School Onboarding">
          <OnboardForm />
        </Card>
      </div>
    </main>
  );
}
