import Link from "next/link";
import { Card } from "@/components/ui";

export default async function AcceptInvitePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          ← Back to home
        </Link>
        <Card title="Accept School Invite">
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

