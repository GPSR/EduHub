"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, Button } from "@/components/ui";

export default function SchoolAreaError({
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
    <div className="space-y-6">
      <Card title="Couldn’t load this page">
        <div className="text-sm text-white/70">
          Please try again. If the problem continues, contact your school admin.
        </div>
        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={reset}>
            Retry
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="secondary">
              Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

