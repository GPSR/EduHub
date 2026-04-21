"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="text-5xl mb-5">⚠️</div>
        <h1 className="text-xl font-bold text-white/90 tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          We couldn't complete your request. This has been noted.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-white/25">Error ID: {error.digest}</p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/"><Button variant="secondary">Back to home</Button></Link>
        </div>
      </div>
    </main>
  );
}
