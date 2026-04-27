"use client";

import { useEffect } from "react";

/**
 * Runs once on app mount — hides the splash screen and
 * sets up native event listeners (back button, app state, etc.)
 */
export function CapacitorInit() {
  useEffect(() => {
    let nativeClassApplied = false;

    async function init() {
      const { isNative, hideSplash, setStatusBar } = await import("@/lib/native");
      if (!isNative()) return;
      const root = document.documentElement;
      const body = document.body;
      root.classList.add("native-shell");
      body.classList.add("native-shell");
      nativeClassApplied = true;

      const setKeyboardOffset = (height: number) => {
        root.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(height))}px`);
      };
      setKeyboardOffset(0);

      // Hide splash immediately so startup work never blocks first paint.
      await hideSplash();

      // Light status bar text/icons for dark app backgrounds
      await setStatusBar("light");

      // Cache cleanup is helpful for stale hosted bundles, but run it in background
      // with a timeout so iOS startup never gets stuck.
      void (async () => {
        try {
          await Promise.race([
            (async () => {
              if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
            })(),
            new Promise((resolve) => setTimeout(resolve, 1200)),
          ]);
        } catch {
          // ignore cache cleanup failures
        }
      })();

      // Keep focused inputs and submit buttons visible when software keyboard opens.
      try {
        const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
        try {
          await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        } catch {
          // Resize mode API may be unavailable on non-iOS platforms.
        }
        await Keyboard.addListener("keyboardWillShow", (info) => {
          setKeyboardOffset(info.keyboardHeight ?? 0);
          document.body.classList.add("keyboard-open");
        });
        await Keyboard.addListener("keyboardDidShow", (info) => {
          setKeyboardOffset(info.keyboardHeight ?? 0);
          document.body.classList.add("keyboard-open");
        });
        await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardOffset(0);
          document.body.classList.remove("keyboard-open");
        });
        await Keyboard.addListener("keyboardDidHide", () => {
          setKeyboardOffset(0);
          document.body.classList.remove("keyboard-open");
        });
      } catch {
        // keyboard plugin not available on web
      }

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

    return () => {
      if (!nativeClassApplied) return;
      const root = document.documentElement;
      const body = document.body;
      root.classList.remove("native-shell");
      body.classList.remove("native-shell");
    };
  }, []);

  return null;
}
