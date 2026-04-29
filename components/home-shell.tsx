"use client";

import Link from "next/link";
import { useActionState, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type InvalidEvent } from "react";
import { Card } from "@/components/ui";
import { BrandWordmark } from "@/components/brand";
import { createDemoRequestAction, type DemoRequestState } from "@/app/demo-request/actions";

const STORAGE_KEY = "eduhub_onboarded_v1";
const STORAGE_SLUG_KEY = "eduhub_school_slug_v1";

const MOBILE_HERO_CHIPS = [
  "⚡ Setup in minutes",
  "📱 Mobile ready",
  "🔐 Role-based",
  "🌐 Works offline",
];

const PRIMARY_USER_GROUPS = [
  "Administration",
  "Teachers",
  "Parents & Students",
  "Platform Team",
] as const;

const MOBILE_STATS = [
  { icon: "🧩", value: "21", label: "Modules" },
  { icon: "🌐", value: "1", label: "Platform" },
  { icon: "👨‍👩‍👧", value: "24/7", label: "Parent access" },
  { icon: "👥", value: "∞", label: "Students" },
];

const MOBILE_FEATURES = [
  {
    icon: "🏠",
    label: "Dashboard",
    desc: "Live insights",
    className: "bg-[linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.08))] border-blue-300/25",
  },
  {
    icon: "👥",
    label: "Students",
    desc: "Admissions",
    className: "bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(167,139,250,0.08))] border-violet-300/25",
  },
  {
    icon: "💳",
    label: "Fees",
    desc: "Collections",
    className: "bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(20,184,166,0.08))] border-emerald-300/25",
  },
  {
    icon: "✅",
    label: "Attendance",
    desc: "Daily records",
    className: "bg-[linear-gradient(135deg,rgba(20,184,166,0.2),rgba(6,182,212,0.08))] border-teal-300/25",
  },
  {
    icon: "📢",
    label: "Feed",
    desc: "Announcements",
    className: "bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(249,115,22,0.08))] border-amber-300/25",
  },
  {
    icon: "📚",
    label: "Academics",
    desc: "Curriculum",
    className: "bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(59,130,246,0.08))] border-sky-300/25",
  },
  {
    icon: "📝",
    label: "Homework",
    desc: "Assignments",
    className: "bg-[linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.08))] border-indigo-300/25",
  },
  {
    icon: "🧠",
    label: "Learning",
    desc: "Class resources",
    className: "bg-[linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.08))] border-green-300/25",
  },
  {
    icon: "▶️",
    label: "YouTube",
    desc: "Holiday videos",
    className: "bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.08))] border-blue-300/25",
  },
  {
    icon: "🗓️",
    label: "Calendar",
    desc: "Events & exams",
    className: "bg-[linear-gradient(135deg,rgba(6,182,212,0.2),rgba(14,165,233,0.08))] border-cyan-300/25",
  },
  {
    icon: "📝",
    label: "Leave",
    desc: "Role approvals",
    className: "bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(251,191,36,0.08))] border-yellow-300/25",
  },
  {
    icon: "💼",
    label: "Salary",
    desc: "Teacher payouts",
    className: "bg-[linear-gradient(135deg,rgba(14,116,144,0.2),rgba(8,145,178,0.08))] border-sky-300/25",
  },
  {
    icon: "🖼️",
    label: "Gallery",
    desc: "Role folders",
    className: "bg-[linear-gradient(135deg,rgba(251,146,60,0.2),rgba(249,115,22,0.08))] border-orange-300/25",
  },
  {
    icon: "🚌",
    label: "Transport",
    desc: "Live tracking bus",
    className: "bg-[linear-gradient(135deg,rgba(244,63,94,0.2),rgba(236,72,153,0.08))] border-rose-300/25",
  },
] as const;

const ALL_MODULES = [
  { icon: "🏠", label: "Dashboard", desc: "Real-time school KPIs" },
  { icon: "🖼️", label: "Gallery", desc: "Role-based image folders" },
  { icon: "👥", label: "Students", desc: "Admissions and profiles" },
  { icon: "💳", label: "Fees", desc: "Invoices and collections" },
  { icon: "✅", label: "Attendance", desc: "Daily attendance logs" },
  { icon: "🗓️", label: "Timetable", desc: "Class schedules" },
  { icon: "📢", label: "Feed", desc: "Announcements and updates" },
  { icon: "📚", label: "Academics", desc: "Subjects and curriculum" },
  { icon: "🧠", label: "Learning Center", desc: "Class-based resources" },
  { icon: "▶️", label: "YouTube Learning", desc: "Class-wise holiday video mapping" },
  { icon: "🗓️", label: "School Calendar", desc: "Holidays, functions, and exams" },
  { icon: "📝", label: "Leave Requests", desc: "Student and teacher leave approvals" },
  { icon: "💼", label: "Teacher Salary", desc: "Monthly/yearly salary with leave deduction" },
  { icon: "📝", label: "Homework", desc: "Assignments tracking" },
  { icon: "🎓", label: "Progress Card", desc: "Exam results and reports" },
  { icon: "📊", label: "Reports", desc: "Analytics and exports" },
  { icon: "🔔", label: "Notifications", desc: "Alerts for users" },
  { icon: "🚌", label: "Transport", desc: "Live tracking bus" },
  { icon: "⚙️", label: "School Settings", desc: "School configuration" },
  { icon: "🧑‍💼", label: "Users", desc: "Roles and permissions" },
] as const;

const LANDING_MOBILE_FEATURES = MOBILE_FEATURES.filter((module) => module.label !== "Gallery");
const LANDING_MODULES = ALL_MODULES.filter((module) => module.label !== "Gallery");

const DESKTOP_WIDGET_SKINS = [
  "border-cyan-300/25 bg-[linear-gradient(145deg,rgba(14,165,233,0.22),rgba(2,6,23,0.6))]",
  "border-indigo-300/25 bg-[linear-gradient(145deg,rgba(99,102,241,0.24),rgba(2,6,23,0.6))]",
  "border-violet-300/25 bg-[linear-gradient(145deg,rgba(139,92,246,0.22),rgba(2,6,23,0.6))]",
  "border-emerald-300/25 bg-[linear-gradient(145deg,rgba(16,185,129,0.22),rgba(2,6,23,0.6))]",
  "border-amber-300/25 bg-[linear-gradient(145deg,rgba(245,158,11,0.2),rgba(2,6,23,0.6))]",
  "border-rose-300/25 bg-[linear-gradient(145deg,rgba(244,63,94,0.2),rgba(2,6,23,0.6))]"
] as const;

const DESKTOP_MODULES_AUTOSCROLL_PX_PER_SEC = 72;

const COUNTRY_CODE_OPTIONS = [
  { value: "+1", country: "US / Canada" },
  { value: "+91", country: "India" },
  { value: "+44", country: "United Kingdom" },
  { value: "+61", country: "Australia" },
  { value: "+971", country: "UAE" },
  { value: "+65", country: "Singapore" },
  { value: "+966", country: "Saudi Arabia" },
  { value: "+974", country: "Qatar" },
  { value: "+27", country: "South Africa" },
  { value: "+880", country: "Bangladesh" }
] as const;

type DemoFieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function setDemoFieldValidationMessage(event: InvalidEvent<DemoFieldElement>) {
  const target = event.currentTarget;
  let message = "";

  if (target.validity.valueMissing) {
    message = target.dataset.msgRequired ?? "This field is required.";
  } else if (target.validity.typeMismatch) {
    message = target.dataset.msgType ?? "Please enter a valid value.";
  } else if (target.validity.patternMismatch) {
    message = target.dataset.msgPattern ?? "Please enter a valid value.";
  } else if (target.validity.tooShort) {
    message = target.dataset.msgMin ?? "Input is too short.";
  } else if (target.validity.tooLong) {
    message = target.dataset.msgMax ?? "Input is too long.";
  }

  target.setCustomValidity(message);
}

function clearDemoFieldValidationMessage(event: FormEvent<DemoFieldElement>) {
  event.currentTarget.setCustomValidity("");
}

const initialDemoRequestState: DemoRequestState = { ok: true, message: "", fieldErrors: {} };

export function HomeShell({
  isSignedIn,
  userName,
  defaultHomeHref = "/dashboard"
}: {
  isSignedIn: boolean;
  userName?: string | null;
  defaultHomeHref?: string;
}) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [showDesktopAllModulesPage, setShowDesktopAllModulesPage] = useState(false);
  const [showMobileAllModules, setShowMobileAllModules] = useState(false);
  const [mobileAllModulesOpenToken, setMobileAllModulesOpenToken] = useState(0);
  const [pauseDesktopModulesAutoscroll, setPauseDesktopModulesAutoscroll] = useState(false);
  const [demoRequestOpen, setDemoRequestOpen] = useState(false);
  const [demoState, demoAction, demoPending] = useActionState(createDemoRequestAction, initialDemoRequestState);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [showCountryNameInDropdown, setShowCountryNameInDropdown] = useState(false);
  const desktopModulesScrollerRef = useRef<HTMLDivElement | null>(null);
  const mobileAllModulesScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileAllModulesPanelRef = useRef<HTMLDivElement | null>(null);
  const demoFormRef = useRef<HTMLFormElement | null>(null);

  const openMobileAllModules = () => {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    setMobileAllModulesOpenToken((value) => value + 1);
    setShowMobileAllModules(true);
  };

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(STORAGE_KEY) === "1");
      setSlug(localStorage.getItem(STORAGE_SLUG_KEY) || undefined);
    } catch {
      setOnboarded(false);
      setSlug(undefined);
    }
  }, []);

  useEffect(() => {
    if (demoState.ok && demoState.message) {
      demoFormRef.current?.reset();
      setSelectedCountryCode("+1");
      setShowCountryNameInDropdown(false);
    }
  }, [demoState]);

  useEffect(() => {
    if (onboarded === null) return;
    if (isSignedIn) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scroller = desktopModulesScrollerRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    if (maxScrollLeft > 0) {
      scroller.scrollLeft = Math.min(40, maxScrollLeft);
    }

    let rafId = 0;
    let previous = performance.now();

    const animate = (now: number) => {
      const elapsedSeconds = (now - previous) / 1000;
      previous = now;

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      if (!pauseDesktopModulesAutoscroll && maxScrollLeft > 0) {
        const next = scroller.scrollLeft + DESKTOP_MODULES_AUTOSCROLL_PX_PER_SEC * elapsedSeconds;
        scroller.scrollLeft = next >= maxScrollLeft ? 0 : next;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isSignedIn, onboarded, pauseDesktopModulesAutoscroll]);

  useLayoutEffect(() => {
    if (!showMobileAllModules) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      mobileAllModulesPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const node = mobileAllModulesScrollRef.current;
      if (!node) return;
      node.scrollTop = 0;
      node.scrollLeft = 0;
      node.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const firstTile = node.querySelector<HTMLElement>('[data-module-index="0"]');
      if (firstTile) firstTile.scrollIntoView({ block: "start", inline: "nearest" });
    };

    // iOS/Capacitor can restore previous scroll; reset across a few ticks.
    resetToTop();
    const rafId1 = window.requestAnimationFrame(() => resetToTop());
    const rafId2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resetToTop());
    });
    const timeoutId = window.setTimeout(() => resetToTop(), 120);
    const timeoutId2 = window.setTimeout(() => resetToTop(), 260);

    return () => {
      window.cancelAnimationFrame(rafId1);
      window.cancelAnimationFrame(rafId2);
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showMobileAllModules, mobileAllModulesOpenToken]);

  const loginHref = slug ? `/login?schoolSlug=${encodeURIComponent(slug)}` : "/login";
  const primaryHref = onboarded ? loginHref : "/onboard";
  const primaryLabel = onboarded ? "Login →" : "Onboard School →";
  const secondaryHref = onboarded ? "/onboard" : loginHref;
  const secondaryLabel = onboarded ? "Onboard School" : "Login";
  const liveChatHref = isSignedIn ? "/support" : loginHref;
  const preferredName = (userName ?? "").trim();
  const welcomeTitle = preferredName ? `Welcome back, ${preferredName}` : "Welcome back";
  const homeButtonLabel = defaultHomeHref === "/home" ? "Open home →" : "Open dashboard →";

  /* Skeleton while checking localStorage */
  if (onboarded === null && !isSignedIn) {
    return (
      <>
        <div className="space-y-3">
          <div className="rounded-[22px] border border-white/[0.10] bg-[#070e1c] p-4 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.05] animate-pulse mx-auto" />
            <div className="h-3 w-48 rounded-full bg-white/[0.06] animate-pulse mx-auto" />
            <div className="h-5 w-64 rounded-full bg-white/[0.06] animate-pulse mx-auto" />
            <div className="h-5 w-52 rounded-full bg-white/[0.06] animate-pulse mx-auto" />
          </div>
          <div className="rounded-[20px] border border-white/[0.10] bg-white/[0.03] p-4 space-y-2.5">
            <div className="h-10 w-full rounded-[13px] bg-white/[0.05] animate-pulse" />
            <div className="h-9 w-full rounded-[13px] bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  const mobileLanding = (
    <div className="space-y-3 md:space-y-4">
      <section className="rounded-[24px] border border-white/[0.12] bg-[#070e1c] px-4 py-5 text-center">
        <div className="mx-auto mb-2 flex justify-center">
          <BrandWordmark size="md" className="pointer-events-none" />
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/35 bg-cyan-500/12 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-100/90">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          School Management Platform
        </p>
        <h2 className="mt-2 text-[22px] font-extrabold leading-[1.05] text-white/95">
          Run your school from one platform with AI.
        </h2>
        <p className="mx-auto mt-2 max-w-[320px] text-[11.5px] leading-relaxed text-white/58">
          Short overview for app and mobile web. Admissions, fees, attendance, communication, and operations from one platform.
        </p>

        <div className="mt-3 space-y-2">
          <Link
            href="/onboard"
            className="flex h-10 items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[12px] font-bold text-white shadow-[0_10px_24px_-14px_rgba(79,141,253,0.75)]"
          >
            Onboard School
          </Link>
          <Link
            href={loginHref}
            className="flex h-9 items-center justify-center rounded-[13px] border border-white/[0.12] bg-white/[0.06] text-[12px] font-semibold text-white/82"
          >
            Login
          </Link>
          <button
            type="button"
            onClick={() => setDemoRequestOpen(true)}
            className="flex h-9 w-full items-center justify-center rounded-[13px] border border-cyan-300/35 bg-cyan-500/16 text-[12px] font-semibold text-cyan-100/95 transition hover:bg-cyan-500/24"
          >
            Request Demo
          </button>
          <p className="px-2 text-[10px] leading-relaxed text-white/55">
            Need a guided walkthrough? Share a few details and our team will reach you within 24 hours.
          </p>
        </div>
      </section>

      <section className="rounded-[20px] border border-white/[0.10] bg-white/[0.03] px-3 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100/78">Primary user groups</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PRIMARY_USER_GROUPS.map((group) => (
            <div key={group} className="rounded-[11px] border border-white/[0.12] bg-white/[0.03] px-2.5 py-2 text-[11px] font-medium text-white/82">
              {group}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-bold text-white/78">Key modules</p>
            <p className="text-[9px] text-white/38">Mobile-first tiles for quick product overview</p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {LANDING_MOBILE_FEATURES.slice(0, 10).map((module) => (
            <article
              key={module.label}
              className={`rounded-[13px] border px-2.5 py-2.5 ${module.className}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[15px]">{module.icon}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-100/90" />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white/92">{module.label}</p>
              <p className="mt-0.5 text-[9.5px] text-white/62">{module.desc}</p>
            </article>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={openMobileAllModules}
            className="inline-flex items-center justify-center rounded-[12px] border border-cyan-300/35 bg-cyan-500/15 px-4 py-2 text-[12px] font-semibold text-cyan-100/95 transition hover:bg-cyan-500/24"
          >
            View all modules
          </button>
        </div>
      </section>
    </div>
  );

  const desktopLanding = (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-[linear-gradient(140deg,#091229,#060d1f_52%,#081733)] p-7 lg:p-9">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative space-y-7">
          <div className="mx-auto max-w-[760px] text-center space-y-5">
            <div className="flex justify-center">
              <BrandWordmark size="lg" className="pointer-events-none" />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100/75">
                New School Starter Experience
              </p>
              <h1 className="mt-2 text-[42px] leading-[0.95] font-extrabold text-white/95">
                All Modules
              </h1>
              <p className="text-[42px] leading-[0.95] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-blue-300 to-indigo-300">
                visible on day one
              </p>
              <p className="mx-auto mt-3 max-w-[620px] text-[14px] leading-relaxed text-white/60">
                Every module is highlighted with floating widgets so first-time visitors immediately see
                the complete school platform value.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {MOBILE_HERO_CHIPS.map((chip) => (
                <span key={chip} className="rounded-full border border-white/[0.14] bg-white/[0.05] px-3 py-1 text-[11px] text-white/72">
                  {chip}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2.5">
              <Link
                href={primaryHref}
                className="inline-flex h-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-5 text-[13px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(79,141,253,0.75)] hover:from-[#7ac0ff] hover:to-[#5a95ff]"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex h-11 items-center justify-center rounded-[14px] border border-white/[0.14] bg-white/[0.06] px-5 text-[13px] font-semibold text-white/84 hover:bg-white/[0.12]"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/[0.10] bg-[#0c162c]/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Feature Modules
              </p>
              <button
                type="button"
                onClick={() => setShowDesktopAllModulesPage(true)}
                className="rounded-full border border-cyan-300/35 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold text-cyan-100/90 transition hover:bg-cyan-500/25"
              >
                All Modules
              </button>
            </div>

            <div
              ref={desktopModulesScrollerRef}
              className="overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onMouseEnter={() => setPauseDesktopModulesAutoscroll(true)}
              onMouseLeave={() => setPauseDesktopModulesAutoscroll(false)}
              onFocusCapture={() => setPauseDesktopModulesAutoscroll(true)}
              onBlurCapture={() => setPauseDesktopModulesAutoscroll(false)}
            >
              <div className="flex min-w-max gap-2.5 pr-1">
                {LANDING_MODULES.map((module, idx) => (
                  <article
                    key={module.label}
                    className={`module-float-card w-[250px] min-h-[136px] shrink-0 rounded-[15px] border px-4 py-3.5 transition-all duration-250 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-cyan-200/80 hover:shadow-[0_18px_38px_-18px_rgba(125,211,252,0.95)] hover:saturate-125 hover:brightness-110 ${DESKTOP_WIDGET_SKINS[idx % DESKTOP_WIDGET_SKINS.length]}`}
                    style={{ animationDelay: `${idx * 85}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[20px]">{module.icon}</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-100/85" />
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-white/96">{module.label}</p>
                    <p className="mt-1 text-[12px] leading-snug text-white/75">{module.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-cyan-300/25 bg-[linear-gradient(140deg,rgba(14,165,233,0.2),rgba(6,182,212,0.08),#0b1224)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white/92">Live Chat Widget</p>
                <p className="mt-0.5 text-[12px] text-white/58">
                  Support moved out of module tiles. Open live chat directly from home.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Live
              </span>
            </div>
            <div className="mt-3">
              <Link
                href={liveChatHref}
                className="inline-flex h-10 items-center justify-center rounded-[12px] border border-cyan-300/35 bg-cyan-500/20 px-4 text-[12px] font-semibold text-cyan-100 transition hover:bg-cyan-500/28"
              >
                Open Live Chat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const desktopAllModulesCenterPage = (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-[linear-gradient(140deg,#091229,#060d1f_52%,#081733)] p-7 lg:p-9">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-[980px] space-y-6">
          <div className="flex justify-center">
            <BrandWordmark size="lg" className="pointer-events-none" />
          </div>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/75">All Modules</p>
            <p className="mt-1 text-[13px] text-white/60">All Modules in EduHub</p>
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowDesktopAllModulesPage(false)}
                className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.18] bg-white/[0.06] px-4 py-2 text-[12px] font-semibold text-white/88 transition hover:bg-white/[0.12]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LANDING_MODULES.map((module, idx) => (
              <article
                key={module.label}
                className={`rounded-[15px] border px-4 py-3.5 ${DESKTOP_WIDGET_SKINS[idx % DESKTOP_WIDGET_SKINS.length]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[20px]">{module.icon}</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-100/85" />
                </div>
                <p className="mt-2 text-[14px] font-semibold text-white/96">{module.label}</p>
                <p className="mt-1 text-[12px] leading-snug text-white/75">{module.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  /* Signed-in state */
  if (isSignedIn) {
    return (
      <div className="space-y-3">
        <Card title={welcomeTitle} accent="indigo">
          <div className="mb-4 flex flex-col items-center text-center">
            <BrandWordmark size="sm" className="pointer-events-none w-[118px] opacity-95" />
            <p className="mt-3 text-sm text-white/65">Continue where you left off.</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href={defaultHomeHref}
              className="inline-flex w-full justify-center items-center gap-2 px-5 py-2.5 rounded-[13px] sm:w-auto
                         bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white text-sm font-medium
                         shadow-[0_10px_28px_-12px_rgba(79,141,253,0.72)]
                         hover:from-[#7ac0ff] hover:to-[#5a95ff] transition-colors"
            >
              {homeButtonLabel}
            </Link>
            <Link
              href="/support"
              className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-[13px]
                         border border-cyan-300/35 bg-cyan-500/18 text-cyan-100 text-sm font-semibold
                         hover:bg-cyan-500/26 transition-colors"
            >
              Live Chat Widget
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">{mobileLanding}</div>
      <div className="hidden md:block">{showDesktopAllModulesPage ? desktopAllModulesCenterPage : desktopLanding}</div>
      {showMobileAllModules ? (
        <div className="fixed inset-0 z-[220] md:hidden flex items-start justify-center bg-[#030815]/92 backdrop-blur-md p-0">
          <button
            type="button"
            aria-label="Close all modules view"
            onClick={() => setShowMobileAllModules(false)}
            className="absolute inset-0"
          />
          <div
            ref={mobileAllModulesPanelRef}
            className="relative w-full h-[100vh] [height:100dvh] rounded-none border border-white/[0.14] bg-[#0b1426]/98 shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-[max(0.75rem,env(safe-area-inset-top))]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">All Modules</p>
                <p className="mt-0.5 text-[12px] text-white/65">Explore complete module details.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileAllModules(false)}
                className="inline-flex h-9 items-center justify-center rounded-[11px] border border-blue-300/40 bg-blue-500/24 px-3 text-[12px] font-semibold text-blue-100 shadow-[0_14px_28px_-18px_rgba(79,141,253,0.9)] transition hover:bg-blue-500/32"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div
              key={`mobile-all-modules-${mobileAllModulesOpenToken}`}
              ref={mobileAllModulesScrollRef}
              className="h-[calc(100vh-72px)] [height:calc(100dvh-72px)] overflow-y-auto px-3 py-3.5 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] [overflow-anchor:none]"
            >
              <div className="grid grid-cols-1 gap-2.5">
                {ALL_MODULES.map((module, idx) => (
                  <article
                    key={`mobile-all-${module.label}`}
                    data-module-index={idx}
                    className={`rounded-[14px] border px-3.5 py-3 ${DESKTOP_WIDGET_SKINS[idx % DESKTOP_WIDGET_SKINS.length]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[19px]">{module.icon}</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-100/85" />
                    </div>
                    <p className="mt-2 text-[13px] font-semibold text-white/96">{module.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/74">{module.desc}</p>
                  </article>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileAllModules(false)}
              className="absolute bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-3 z-30 inline-flex h-11 items-center justify-center rounded-[13px] border border-blue-300/40 bg-blue-500/24 px-4 text-[12px] font-semibold text-blue-100 shadow-[0_14px_28px_-16px_rgba(79,141,253,0.9)] transition hover:bg-blue-500/32"
              aria-label="Close all modules"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {demoRequestOpen ? (
        <div className="fixed inset-0 z-[180] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm px-2 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
          <button
            type="button"
            aria-label="Close demo request form"
            onClick={() => setDemoRequestOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-[560px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[20px] border border-white/[0.14] bg-[#0e172a]/95 p-4 sm:p-5 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cyan-200/75">Demo Request</p>
                <h3 className="mt-1 text-[22px] font-bold text-white/95 leading-tight">Request a live demo</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-white/58">
                  Share a few details so our product team can plan the right walkthrough for your school.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDemoRequestOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.03] text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form ref={demoFormRef} action={demoAction} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[12px] font-medium text-white/75">First Name</span>
                  <input
                    name="firstName"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="given-name"
                    placeholder="First name"
                    pattern="^[A-Za-z][A-Za-z '.-]{1,59}$"
                    data-msg-required="Please enter your first name."
                    data-msg-pattern="Use letters only. You may include space, apostrophe, dot, or hyphen."
                    data-msg-min="First name should be at least 2 characters."
                    data-msg-max="First name cannot exceed 60 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.firstName ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.firstName ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.firstName}</p>
                  ) : null}
                </label>
                <label className="space-y-1">
                  <span className="text-[12px] font-medium text-white/75">Last Name</span>
                  <input
                    name="lastName"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="family-name"
                    placeholder="Last name"
                    pattern="^[A-Za-z][A-Za-z '.-]{1,59}$"
                    data-msg-required="Please enter your last name."
                    data-msg-pattern="Use letters only. You may include space, apostrophe, dot, or hyphen."
                    data-msg-min="Last name should be at least 2 characters."
                    data-msg-max="Last name cannot exceed 60 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.lastName ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.lastName ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.lastName}</p>
                  ) : null}
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[12px] font-medium text-white/75">Job Title</span>
                  <input
                    name="jobTitle"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="organization-title"
                    placeholder="Principal"
                    pattern="^[A-Za-z][A-Za-z0-9 '&().,/+-]{1,79}$"
                    data-msg-required="Please enter your job title."
                    data-msg-pattern="Use letters, numbers, spaces, and basic punctuation."
                    data-msg-min="Job title should be at least 2 characters."
                    data-msg-max="Job title cannot exceed 80 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.jobTitle ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.jobTitle ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.jobTitle}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-[12px] font-medium text-white/75">Name of Institution</span>
                  <input
                    name="schoolName"
                    required
                    minLength={2}
                    maxLength={120}
                    pattern="^[A-Za-z0-9][A-Za-z0-9 '&().,-]{1,119}$"
                    title="Use letters, numbers, spaces, and basic punctuation only."
                    autoComplete="organization"
                    placeholder="Enter institution name"
                    data-msg-required="Please enter your institution name."
                    data-msg-pattern="Use letters, numbers, spaces, and basic punctuation only."
                    data-msg-min="Institution name should be at least 2 characters."
                    data-msg-max="Institution name cannot exceed 120 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.schoolName ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.schoolName ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.schoolName}</p>
                  ) : null}
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 block">
                  <span className="text-[12px] font-medium text-white/75">Are you using EduHub?</span>
                  <select
                    name="usingEdumerge"
                    required
                    defaultValue=""
                    data-msg-required="Please tell us whether you are using EduHub."
                    onInvalid={setDemoFieldValidationMessage}
                    onChange={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.usingEdumerge ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {demoState.fieldErrors?.usingEdumerge ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.usingEdumerge}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-[12px] font-medium text-white/75">How did you hear about us?</span>
                  <input
                    name="hearAboutUs"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="off"
                    placeholder="Google search, referral, social media..."
                    data-msg-required="Please tell us how you heard about us."
                    data-msg-min="Please share at least 2 characters."
                    data-msg-max="This response cannot exceed 120 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.hearAboutUs ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.hearAboutUs ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.hearAboutUs}</p>
                  ) : null}
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[12px] font-medium text-white/75">Address</span>
                <textarea
                  name="address"
                  required
                  minLength={10}
                  maxLength={280}
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Enter complete school address"
                  data-msg-required="Please enter your school address."
                  data-msg-min="Address should be at least 10 characters."
                  data-msg-max="Address cannot exceed 280 characters."
                  onInvalid={setDemoFieldValidationMessage}
                  onInput={clearDemoFieldValidationMessage}
                  aria-invalid={demoState.fieldErrors?.address ? true : undefined}
                  disabled={demoPending}
                  className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition resize-none focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                />
                {demoState.fieldErrors?.address ? (
                  <p className="text-[11px] text-rose-300">{demoState.fieldErrors.address}</p>
                ) : null}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 block">
                  <span className="text-[12px] font-medium text-white/75">Email ID</span>
                  <input
                    type="email"
                    name="email"
                    required
                    maxLength={120}
                    autoComplete="email"
                    placeholder="name@school.com"
                    data-msg-required="Please enter your email ID."
                    data-msg-type="Please enter a valid email address, like name@school.com."
                    data-msg-max="Email address cannot exceed 120 characters."
                    onInvalid={setDemoFieldValidationMessage}
                    onInput={clearDemoFieldValidationMessage}
                    aria-invalid={demoState.fieldErrors?.email ? true : undefined}
                    disabled={demoPending}
                    className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                  />
                  {demoState.fieldErrors?.email ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.email}</p>
                  ) : null}
                </label>

                <div className="space-y-1 block">
                  <span className="text-[12px] font-medium text-white/75">Mobile Number</span>
                  <div className="grid grid-cols-[88px_1fr] gap-2">
                    <select
                      name="countryCode"
                      required
                      value={selectedCountryCode}
                      data-msg-required="Please select your country code."
                      onInvalid={setDemoFieldValidationMessage}
                      onFocus={() => setShowCountryNameInDropdown(true)}
                      onMouseDown={() => setShowCountryNameInDropdown(true)}
                      onBlur={() => setShowCountryNameInDropdown(false)}
                      onChange={(event) => {
                        setSelectedCountryCode(event.currentTarget.value);
                        event.currentTarget.setCustomValidity("");
                      }}
                      aria-invalid={demoState.fieldErrors?.countryCode ? true : undefined}
                      disabled={demoPending}
                      className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-2.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                    >
                      {COUNTRY_CODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {showCountryNameInDropdown ? `${option.value} (${option.country})` : option.value}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      minLength={6}
                      maxLength={19}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="609 608 6379"
                      pattern="^[0-9][0-9()\\-\\s]{5,18}$"
                      data-msg-required="Please enter your mobile number."
                      data-msg-pattern="Use numbers only. You can include spaces, hyphen, or parentheses."
                      data-msg-min="Mobile number should have at least 6 digits."
                      data-msg-max="Mobile number is too long."
                      onInvalid={setDemoFieldValidationMessage}
                      onInput={clearDemoFieldValidationMessage}
                      aria-invalid={demoState.fieldErrors?.mobileNumber ? true : undefined}
                      disabled={demoPending}
                      className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                    />
                  </div>
                  {demoState.fieldErrors?.countryCode ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.countryCode}</p>
                  ) : null}
                  {demoState.fieldErrors?.mobileNumber ? (
                    <p className="text-[11px] text-rose-300">{demoState.fieldErrors.mobileNumber}</p>
                  ) : null}
                </div>
              </div>

              <label className="space-y-1 block">
                <span className="text-[12px] font-medium text-white/75">Best time to reach you</span>
                <select
                  name="bestTime"
                  required
                  defaultValue=""
                  data-msg-required="Please select the best time for our team to contact you."
                  onInvalid={setDemoFieldValidationMessage}
                  onChange={clearDemoFieldValidationMessage}
                  aria-invalid={demoState.fieldErrors?.bestTime ? true : undefined}
                  disabled={demoPending}
                  className="w-full rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/65 focus:ring-4 focus:ring-cyan-500/22"
                >
                  <option value="" disabled>
                    Select preferred time
                  </option>
                  <option value="Morning (9:00 AM - 12:00 PM EST)">Morning (9:00 AM - 12:00 PM EST)</option>
                  <option value="Afternoon (12:00 PM - 4:00 PM EST)">Afternoon (12:00 PM - 4:00 PM EST)</option>
                  <option value="Evening (4:00 PM - 7:00 PM EST)">Evening (4:00 PM - 7:00 PM EST)</option>
                  <option value="Anytime during business hours (EST)">Anytime during business hours (EST)</option>
                </select>
                {demoState.fieldErrors?.bestTime ? (
                  <p className="text-[11px] text-rose-300">{demoState.fieldErrors.bestTime}</p>
                ) : null}
              </label>

              {demoState.message ? (
                <div
                  className={
                    "rounded-[12px] border p-3 text-sm " +
                    (demoState.ok
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/25 bg-rose-500/10 text-rose-200")
                  }
                >
                  {demoState.message}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDemoRequestOpen(false)}
                  disabled={demoPending}
                  className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-[#17253d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={demoPending}
                  className="inline-flex items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-4 py-2 text-sm font-semibold text-white transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                >
                  {demoPending ? "Submitting..." : "Submit Demo Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
