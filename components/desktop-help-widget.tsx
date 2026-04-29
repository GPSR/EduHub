"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createQuickChatLeadAction, type QuickChatLeadState } from "@/app/demo-request/actions";

type DesktopHelpWidgetProps = {
  callNumberLabel?: string;
  callHref?: string;
  whatsappHref?: string;
  emailLabel?: string;
  emailHref?: string;
  isSignedIn?: boolean;
};

const initialQuickChatState: QuickChatLeadState = { ok: true, message: "", fieldErrors: {} };

export function DesktopHelpWidget({
  callNumberLabel = "+1 609 608 6379",
  callHref = "tel:+16096086379",
  whatsappHref = "https://wa.me/16096086379?text=Hi%20EduHub",
  emailLabel = "info@softlanetech.com",
  emailHref = "mailto:info@softlanetech.com",
  isSignedIn = false
}: DesktopHelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [blinkCta, setBlinkCta] = useState(false);
  const [state, action, pending] = useActionState(createQuickChatLeadAction, initialQuickChatState);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const pathname = usePathname();

  const shouldShowOnRoute = pathname === "/";
  const shouldHideWidget = isSignedIn || !shouldShowOnRoute;

  useEffect(() => {
    if (!state.ok || !state.message) return;
    formRef.current?.reset();
  }, [state.ok, state.message]);

  useEffect(() => {
    if (shouldHideWidget) return;
    if (typeof window === "undefined") return;
    const seenKey = "eduhub_ai_chat_intro_seen_v1";
    const alreadySeen = window.sessionStorage.getItem(seenKey) === "1";
    if (alreadySeen) {
      setBlinkCta(true);
      const blinkTimer = window.setTimeout(() => setBlinkCta(false), 5000);
      return () => window.clearTimeout(blinkTimer);
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      window.sessionStorage.setItem(seenKey, "1");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [shouldHideWidget]);

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

  if (shouldHideWidget) return null;

  return (
    <div
      ref={rootRef}
      className="fixed right-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:bottom-5 md:right-6 z-[140]"
    >
      {open ? (
        <div className="absolute bottom-[calc(100%+0.55rem)] right-0 w-[min(92vw,360px)] overflow-hidden rounded-[18px] border border-cyan-300/26 bg-[linear-gradient(145deg,rgba(9,18,36,0.97),rgba(6,11,22,0.98))] shadow-[0_30px_64px_-30px_rgba(0,0,0,0.92)] backdrop-blur-xl animate-fade-up">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-2.5">
            <div>
              <p className="text-[12px] font-semibold text-cyan-100/92">EduHub AI Assistant</p>
              <p className="text-[10px] text-white/50">Instant onboarding help</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.12] bg-white/[0.03] text-[14px] text-white/75 transition hover:bg-white/[0.09]"
              aria-label="Close AI chat"
            >
              ×
            </button>
          </div>

          <div className="space-y-2.5 px-3.5 py-3">
            <div className="max-w-[92%] rounded-[12px] border border-cyan-300/22 bg-cyan-500/12 px-2.5 py-2 text-[11px] leading-relaxed text-cyan-50/92">
              Welcome to EduHub. Share basic details and our team will get back to you within 2 hours.
            </div>

            <form ref={formRef} action={action} className="space-y-2">
              <div>
                <input
                  name="name"
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={pending}
                  className="h-9 w-full rounded-[10px] border border-white/[0.14] bg-[#0c1730]/90 px-2.5 text-[12px] text-white outline-none transition placeholder:text-white/40 focus:border-cyan-300/65"
                  required
                />
                {state.fieldErrors?.name ? <p className="mt-1 text-[10px] text-rose-300">{state.fieldErrors.name}</p> : null}
              </div>

              <div>
                <input
                  name="schoolName"
                  placeholder="School name"
                  autoComplete="organization"
                  disabled={pending}
                  className="h-9 w-full rounded-[10px] border border-white/[0.14] bg-[#0c1730]/90 px-2.5 text-[12px] text-white outline-none transition placeholder:text-white/40 focus:border-cyan-300/65"
                  required
                />
                {state.fieldErrors?.schoolName ? (
                  <p className="mt-1 text-[10px] text-rose-300">{state.fieldErrors.schoolName}</p>
                ) : null}
              </div>

              <div>
                <input
                  name="email"
                  type="email"
                  placeholder="Work email"
                  autoComplete="email"
                  disabled={pending}
                  className="h-9 w-full rounded-[10px] border border-white/[0.14] bg-[#0c1730]/90 px-2.5 text-[12px] text-white outline-none transition placeholder:text-white/40 focus:border-cyan-300/65"
                  required
                />
                {state.fieldErrors?.email ? <p className="mt-1 text-[10px] text-rose-300">{state.fieldErrors.email}</p> : null}
              </div>

              <div>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Mobile number (with country code)"
                  autoComplete="tel"
                  disabled={pending}
                  className="h-9 w-full rounded-[10px] border border-white/[0.14] bg-[#0c1730]/90 px-2.5 text-[12px] text-white outline-none transition placeholder:text-white/40 focus:border-cyan-300/65"
                  required
                />
                {state.fieldErrors?.phone ? <p className="mt-1 text-[10px] text-rose-300">{state.fieldErrors.phone}</p> : null}
              </div>

              {state.message ? (
                <p
                  className={[
                    "rounded-[10px] border px-2.5 py-2 text-[10.5px] leading-relaxed",
                    state.ok
                      ? "border-emerald-300/30 bg-emerald-500/12 text-emerald-100"
                      : "border-rose-300/30 bg-rose-500/12 text-rose-100"
                  ].join(" ")}
                >
                  {state.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 w-full items-center justify-center rounded-[10px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[12px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(79,141,253,0.9)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff] disabled:opacity-70"
              >
                {pending ? "Submitting..." : "Start AI chat"}
              </button>
            </form>

            <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.03] px-2 py-1 text-white/72 transition hover:bg-white/[0.08]"
              >
                WhatsApp
              </a>
              <a
                href={callHref}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.03] px-2 py-1 text-white/72 transition hover:bg-white/[0.08]"
                title={callNumberLabel}
              >
                Call
              </a>
              <a
                href={emailHref}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.03] px-2 py-1 text-white/72 transition hover:bg-white/[0.08]"
                title={emailLabel}
              >
                Email
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setBlinkCta(false);
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className={[
          "inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-[#0e1931]/95 px-3.5 py-1.5 md:px-4 md:py-2 text-[11px] md:text-[12px] font-semibold text-cyan-100 shadow-[0_20px_35px_-25px_rgba(0,0,0,0.95)] transition hover:bg-[#142446]",
          blinkCta && !open ? "animate-pulse border-cyan-200/80 shadow-[0_0_0_3px_rgba(103,180,255,0.35),0_20px_35px_-25px_rgba(0,0,0,0.95)]" : ""
        ].join(" ")}
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        AI Chat
      </button>
    </div>
  );
}
