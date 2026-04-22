import Link from "next/link";
import { Button } from "@/components/ui";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-[20px] border border-white/[0.10] bg-white/[0.04] p-6 text-center space-y-3">
        <h1 className="text-xl font-semibold text-white/95">You are offline</h1>
        <p className="text-sm text-white/55">
          Internet connection is unavailable right now. Reconnect and try again.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
