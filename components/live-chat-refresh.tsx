"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveChatRefresh({
  enabled = true,
  intervalMs = 6000
}: {
  enabled?: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    timer = setInterval(refresh, Math.max(2500, intervalMs));

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const onForeground = () => {
      router.refresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("app-foreground", onForeground);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("app-foreground", onForeground);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
