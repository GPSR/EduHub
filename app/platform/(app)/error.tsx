"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, Button } from "@/components/ui";

export default function PlatformAreaError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <Card title="Platform error">
          <div className="text-sm text-white/70">We couldn’t load the platform dashboard. Please try again.</div>
          <div className="mt-4 flex gap-3">
            <Button type="button" onClick={reset}>
              Retry
            </Button>
            <Link href="/platform/login">
              <Button type="button" variant="secondary">
                Platform login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

