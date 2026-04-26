import Link from "next/link";
import { BrandWordmark } from "@/components/brand";
import { ForgotPasswordForm } from "./ui";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ schoolSlug?: string }>;
}) {
  const { schoolSlug } = await searchParams;

  return (
    <main className="min-h-dvh md:min-h-screen overflow-y-auto keyboard-aware keyboard-aware-scroll flex items-start justify-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[520px] md:max-w-[860px] space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition-colors">
          ← Back to login
        </Link>
        <div className="flex justify-center">
          <BrandWordmark size="sm" />
        </div>
        <ForgotPasswordForm defaultSchoolSlug={schoolSlug} />
      </div>
    </main>
  );
}
