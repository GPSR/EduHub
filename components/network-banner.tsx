"use client";

import { useEffect, useState } from "react";

export function NetworkBanner() {
  const [online, setOnline] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 3000);
    }
    function handleOffline() {
      setOnline(false);
      setShowBack(false);
    }

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showBack) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2
                  py-2 text-[13px] font-semibold text-white transition-all duration-300
                  ${online ? "bg-emerald-600/90" : "bg-rose-600/90"}`}
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}
    >
      <span>{online ? "✓" : "✕"}</span>
      <span>{online ? "Back online" : "No internet connection"}</span>
    </div>
  );
}
