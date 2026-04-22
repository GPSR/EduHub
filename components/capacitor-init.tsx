"use client";

import { useEffect } from "react";

/**
 * Runs once on app mount — hides the splash screen and
 * sets up native event listeners (back button, app state, etc.)
 */
export function CapacitorInit() {
  useEffect(() => {
    async function init() {
      const { isNative, hideSplash, setStatusBar } = await import("@/lib/native");
      if (!isNative()) return;

      // Hide splash screen after app is ready
      await hideSplash();

      // Dark status bar to match our theme
      await setStatusBar("dark");

      // Android back button — go back in history or close app
      try {
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });

        // App comes back to foreground — refresh data
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            // Dispatch a custom event that pages can listen to
            window.dispatchEvent(new Event("app-foreground"));
          }
        });
      } catch { /* web fallback */ }
    }

    init();
  }, []);

  return null;
}
