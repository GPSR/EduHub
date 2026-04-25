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

      // Native app should always show latest hosted UI.
      // Clear SW/cache that may keep stale web assets in WebView.
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // ignore cache cleanup failures
      }

      // Hide splash screen after app is ready
      await hideSplash();

      // Light status bar text/icons for dark app backgrounds
      await setStatusBar("light");

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
