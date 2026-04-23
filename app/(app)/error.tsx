"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, Button } from "@/components/ui";

export default function SchoolAreaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="animate-fade-up">
      <div className="rounded-[22px] border border-rose-500/20 bg-rose-500/[0.05] p-5 sm:p-8 text-center max-w-lg mx-auto">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-[16px] font-bold text-white/90">Couldn't load this page</h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          Please try again. If the issue persists, contact your school administrator.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-white/25">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} size="sm">Retry</Button>
          <Link href="/dashboard"><Button variant="secondary" size="sm">Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
