"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isNative } from "@/lib/native";

type DesktopHelpWidgetProps = {
  callNumberLabel?: string;
  callHref?: string;
  whatsappHref?: string;
  emailLabel?: string;
  emailHref?: string;
  isSignedIn?: boolean;
};

export function DesktopHelpWidget({
  callNumberLabel = "+1 609 608 6379",
  callHref = "tel:+16096086379",
  whatsappHref = "https://wa.me/16096086379?text=Hi%20EduHub",
  emailLabel = "info@softlanetech.com",
  emailHref = "mailto:info@softlanetech.com",
  isSignedIn = false
}: DesktopHelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const byRuntime = isNative();
    const byClass =
      document.documentElement.classList.contains("native-shell") ||
      document.body.classList.contains("native-shell");
    const byUserAgent = /capacitor/i.test(window.navigator.userAgent);
    return byRuntime || byClass || byUserAgent;
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const hideOnRoutePrefixes = ["/login", "/onboard", "/platform/login", "/platform/onboard"];
  const routeHidden = pathname
    ? hideOnRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    : false;
  const shouldHideWidget = isSignedIn || routeHidden;

  useEffect(() => {
    const syncNative = () => {
      const byRuntime = isNative();
      const byClass =
        typeof document !== "undefined" &&
        (document.documentElement.classList.contains("native-shell") ||
          document.body.classList.contains("native-shell"));
      const byUserAgent = typeof navigator !== "undefined" && /capacitor/i.test(navigator.userAgent);
      setNative(byRuntime || byClass || byUserAgent);
    };

    syncNative();

    const observer = new MutationObserver(syncNative);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("focus", syncNative);
    window.addEventListener("app-foreground", syncNative);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", syncNative);
      window.removeEventListener("app-foreground", syncNative);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!open) return;
      if (!rootRef.current) return;
      const target = event.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (native || shouldHideWidget) return null;

  return (
    <div
      ref={rootRef}
      className="fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] md:bottom-5 md:right-6 z-[140]"
    >
      {open ? (
        <div className="absolute bottom-[calc(100%+0.55rem)] right-0 flex flex-col items-end gap-2.5 animate-fade-up">
          <a
            href={emailHref}
            onClick={() => setOpen(false)}
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.16] bg-[#231535]/95 px-3 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-[12px] font-semibold text-white shadow-[0_18px_32px_-24px_rgba(0,0,0,0.92)] backdrop-blur-xl transition hover:bg-[#2b1b44]"
            title={emailLabel}
          >
            <span className="grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8] text-[10px] md:text-[11px] text-[#06263a]">
              ✉
            </span>
            <span>Email</span>
          </a>

          <a
            href={callHref}
            onClick={() => setOpen(false)}
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.16] bg-[#231535]/95 px-3 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-[12px] font-semibold text-white shadow-[0_18px_32px_-24px_rgba(0,0,0,0.92)] backdrop-blur-xl transition hover:bg-[#2b1b44]"
            title={callNumberLabel}
          >
            <span className="grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[10px] md:text-[11px]">
              📞
            </span>
            <span>Call</span>
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.16] bg-[#231535]/95 px-3 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-[12px] font-semibold text-white shadow-[0_18px_32px_-24px_rgba(0,0,0,0.92)] backdrop-blur-xl transition hover:bg-[#2b1b44]"
          >
            <span className="grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-[#25d366] text-[10px] md:text-[11px] text-[#063b1f]">
              ✆
            </span>
            <span>WhatsApp</span>
          </a>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close contact options" : "Open contact options"}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.2] bg-[#231535] px-3.5 py-1.5 md:px-4 md:py-2 text-[11px] md:text-[12px] font-semibold text-white shadow-[0_20px_35px_-25px_rgba(0,0,0,0.95)] transition hover:bg-[#2b1b44]"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        Contact Us
      </button>
    </div>
  );
}
