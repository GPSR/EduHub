import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { Card } from "@/components/ui";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandLogo size="sm" className="max-w-full" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Accept your invite</h1>
          <p className="mt-2 text-sm text-white/50">Set your name and password to activate your account.</p>
        </div>
        <Card title="Complete registration" accent="indigo">
          <InviteAcceptForm token={token ?? ""} />
        </Card>
      </div>
    </main>
  );
}

async function InviteAcceptForm({ token }: { token: string }) {
  const { AcceptInviteForm } = await import("./ui");
  return <AcceptInviteForm token={token} />;
}
