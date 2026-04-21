"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function PlatformAreaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-up">
      <div className="text-center max-w-md w-full px-6">
        <div className="text-5xl mb-5">⚠️</div>
        <h2 className="text-xl font-bold text-white/90 tracking-tight">Platform error</h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          Couldn't load the platform dashboard. Please try again.
        </p>
        {error.digest && <p className="mt-2 text-[11px] font-mono text-white/25">Ref: {error.digest}</p>}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Link href="/platform/login"><Button variant="secondary">Platform login</Button></Link>
        </div>
      </div>
    </div>
  );
}
