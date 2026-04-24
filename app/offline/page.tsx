"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);

  function retry() {
    setRetrying(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }

  useEffect(() => {
    // Auto-retry when connection is restored
    function onOnline() { window.location.href = "/dashboard"; }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <main className="min-h-dvh md:min-h-screen flex items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#18191a]">
      <div className="max-w-sm w-full text-center space-y-6 animate-fade-up">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-[24px] bg-[#242526] border border-white/[0.10]
                          flex items-center justify-center text-4xl">
            📡
          </div>
        </div>

        {/* Text */}
        <div>
          <h1 className="text-xl font-bold text-white/95 tracking-tight">No connection</h1>
          <p className="mt-2 text-sm text-white/50 leading-relaxed">
            You're offline. Check your internet connection and try again.
            <br />The app will reconnect automatically.
          </p>
        </div>

        {/* Retry */}
        <button
          onClick={retry}
          disabled={retrying}
          className="w-full py-3.5 rounded-[14px] bg-[#1877f2]
                     text-white font-semibold text-sm
                     disabled:opacity-60 active:scale-[0.98] transition-colors hover:bg-[#2d88ff]"
        >
          {retrying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Connecting…
            </span>
          ) : "Try again"}
        </button>

        <p className="text-[11px] text-white/25">
          EduHub · Saved data available offline
        </p>
      </div>
    </main>
  );
}
