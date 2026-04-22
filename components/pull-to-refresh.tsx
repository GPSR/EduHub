"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router      = useRouter();
  const startY      = useRef(0);
  const [pull, setPull]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 80;

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) startY.current = e.touches[0].clientY;
      else startY.current = 0;
    }
    function onTouchMove(e: TouchEvent) {
      if (!startY.current) return;
      const dist = Math.max(0, e.touches[0].clientY - startY.current);
      if (dist > 10 && window.scrollY === 0) setPull(Math.min(dist * 0.4, THRESHOLD + 20));
    }
    function onTouchEnd() {
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        setTimeout(() => {
          router.refresh();
          setRefreshing(false);
          setPull(0);
          startY.current = 0;
        }, 800);
      } else {
        setPull(0);
        startY.current = 0;
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: true });
    document.addEventListener("touchend",   onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
    };
  }, [pull, router]);

  if (pull === 0 && !refreshing) return <>{children}</>;

  return (
    <>
      {/* Pull indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all pointer-events-none"
        style={{
          height: refreshing ? "52px" : `${pull}px`,
          paddingTop: "env(safe-area-inset-top, 0px)",
          opacity: Math.min(1, pull / THRESHOLD),
        }}
      >
        <div className={`flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30
                         rounded-full px-4 py-1.5 backdrop-blur-xl shadow-lg`}>
          {refreshing ? (
            <span className="h-4 w-4 rounded-full border-2 border-indigo-300/40 border-t-indigo-300 animate-spin" />
          ) : (
            <span
              className="text-indigo-300 transition-transform"
              style={{ transform: `rotate(${(pull / THRESHOLD) * 180}deg)` }}
            >↓</span>
          )}
          <span className="text-[12px] font-medium text-indigo-200">
            {refreshing ? "Refreshing…" : pull >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>
      {children}
    </>
  );
}
