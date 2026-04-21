"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, Button } from "@/components/ui";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-4">
            <Card title="Unexpected error">
              <div className="text-sm text-white/70">
                An unexpected error occurred. Please try again.
              </div>
              <div className="mt-4 flex gap-3">
                <Button type="button" onClick={reset}>
                  Try again
                </Button>
                <Link href="/">
                  <Button type="button" variant="secondary">
                    Back to home
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </main>
      </body>
    </html>
  );
}

