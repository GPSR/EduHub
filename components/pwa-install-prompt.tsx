"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [prompt, setPrompt]   = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow]       = useState(false);
  const [isIOS, setIsIOS]     = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Show iOS prompt if not dismissed
    if (ios && !localStorage.getItem("pwa-ios-dismissed")) {
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem("pwa-install-dismissed")) {
        setTimeout(() => setShow(true), 2000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(isIOS ? "pwa-ios-dismissed" : "pwa-install-dismissed", "1");
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setPrompt(null);
  }

  if (!show || isStandalone) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-4 right-4 z-50 md:hidden">
        <div className="rounded-[20px] border border-white/[0.12] bg-[#111a2d]/95 backdrop-blur-2xl
                        p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] animate-slide-up">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="EduHub" className="w-12 h-12 rounded-[13px] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-white/95">Install EduHub</p>
              <p className="text-[12px] text-white/55 mt-0.5 leading-relaxed">
                Tap <span className="inline-block px-1.5 py-0.5 rounded bg-[#0f1728]/90 text-white/80 text-[11px] font-mono">Share</span> then{" "}
                <span className="text-white/80 font-medium">"Add to Home Screen"</span> for the best experience.
              </p>
            </div>
            <button onClick={dismiss} className="text-white/30 hover:text-white/60 shrink-0 p-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-4 right-4 z-50 md:hidden">
      <div className="rounded-[20px] border border-blue-400/35 bg-[#111a2d]/95 backdrop-blur-2xl
                      p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] animate-slide-up">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="EduHub" className="w-12 h-12 rounded-[13px] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white/95">Install EduHub</p>
            <p className="text-[12px] text-white/50 mt-0.5">Works offline · Faster · No browser bar</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={dismiss}
              className="text-[12px] text-white/40 hover:text-white/70 transition px-2 py-1.5">
              Later
            </button>
            <button onClick={install}
              className="text-[12px] font-semibold text-white bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] hover:from-[#7ac0ff] hover:to-[#5a95ff]
                         active:brightness-95 transition rounded-[10px] px-3.5 py-1.5">
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
