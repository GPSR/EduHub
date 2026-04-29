"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type InvalidEvent } from "react";
import { BrandWordmark } from "@/components/brand";
import { Badge, Card } from "@/components/ui";
import { createDemoRequestAction, type DemoRequestState } from "@/app/demo-request/actions";
import { isNative } from "@/lib/native";
import { HomeShell } from "@/components/home-shell";

const HERO_STATS = [
  { value: "24/7", label: "Parent support" },
  { value: "< 60 mins", label: "Guided go-live setup" },
  { value: "20+", label: "School modules" },
  { value: "8-10 hrs", label: "Weekly staff time reclaimed" },
  { value: "1", label: "Unified data platform" }
] as const;

const FEATURE_TRACKS = [
  {
    title: "Student Lifecycle Management",
    accent: "indigo" as const,
    points: [
      "Manage admissions, student profiles, portfolios, and progression from one system.",
      "Combine attendance, timetable, academics, assessments, and report cards without tool switching.",
      "Keep every student record connected so finance, academics, and operations stay aligned."
    ]
  },
  {
    title: "Communication Management",
    accent: "teal" as const,
    points: [
      "Run broadcast updates, notices, announcements, and chat from one communication layer.",
      "Support parent and staff help desk workflows with traceable response history.",
      "Deliver time-sensitive updates across in-app, SMS, email, and WhatsApp-ready flows."
    ]
  },
  {
    title: "Administration Management",
    accent: "emerald" as const,
    points: [
      "Centralize fee management, transport with GPS, library, reception, and event calendars.",
      "Use configurable reports, bulk uploads, and institution-level configuration controls.",
      "Reduce paper-heavy operations with automated workflows and integrated payment gateways."
    ]
  },
  {
    title: "Leadership and Management",
    accent: "amber" as const,
    points: [
      "Get one dashboard view across academics, finance, operations, and compliance activity.",
      "Replace fragmented systems with a single operational source of truth for decision making.",
      "Track institutional KPIs faster with connected data instead of manual reconciliation."
    ]
  },
  {
    title: "AI-Powered Operations",
    accent: "violet" as const,
    points: [
      "Leverage AI insights for fee trends, attendance patterns, and academic risk visibility.",
      "Automate repetitive tasks like reminders, alerts, and administrative follow-ups.",
      "Enable faster response cycles with intelligent summaries and operational recommendations."
    ]
  }
] as const;

const MODULE_CATALOG = [
  { icon: "🏠", label: "Dashboard", description: "Real-time school KPIs" },
  { icon: "👥", label: "Students", description: "Admissions, SIS, and portfolios" },
  { icon: "💳", label: "Fees", description: "Online collection and reconciliation" },
  { icon: "✅", label: "Attendance", description: "Real-time attendance with alerts" },
  { icon: "🗓️", label: "Timetable", description: "AI timetable and substitutions" },
  { icon: "📢", label: "Feed", description: "Broadcast, chat, and announcements" },
  { icon: "📚", label: "Academics", description: "Lesson plans, exams, and progress" },
  { icon: "🧠", label: "Learning Center", description: "Class resources and enrichment" },
  { icon: "▶️", label: "YouTube Learning", description: "Holiday learning videos" },
  { icon: "📅", label: "School Calendar", description: "Events, exams, and milestones" },
  { icon: "📝", label: "Leave Requests", description: "Approval workflows" },
  { icon: "💼", label: "Teacher Salary", description: "Monthly and yearly payout" },
  { icon: "📊", label: "Reports", description: "Analytics and exports" },
  { icon: "🔔", label: "Notifications", description: "SMS, email, and app alerts" },
  { icon: "🚌", label: "Transport", description: "Routes and GPS tracking" },
  { icon: "🖼️", label: "Gallery", description: "Photo gallery and school events" },
  { icon: "⚙️", label: "School Settings", description: "Campus configuration" },
  { icon: "🧑‍💼", label: "Users", description: "Role-based access and approvals" },
  { icon: "🛡️", label: "Platform Audit", description: "Audit trails and KPI visibility" },
  { icon: "💬", label: "Support", description: "Parent and staff help desk" }
] as const;

const MODULE_TILE_SKINS = [
  "border-cyan-300/25 bg-[linear-gradient(145deg,rgba(14,165,233,0.22),rgba(2,6,23,0.6))]",
  "border-indigo-300/25 bg-[linear-gradient(145deg,rgba(99,102,241,0.24),rgba(2,6,23,0.6))]",
  "border-violet-300/25 bg-[linear-gradient(145deg,rgba(139,92,246,0.22),rgba(2,6,23,0.6))]",
  "border-emerald-300/25 bg-[linear-gradient(145deg,rgba(16,185,129,0.22),rgba(2,6,23,0.6))]",
  "border-amber-300/25 bg-[linear-gradient(145deg,rgba(245,158,11,0.2),rgba(2,6,23,0.6))]",
  "border-rose-300/25 bg-[linear-gradient(145deg,rgba(244,63,94,0.2),rgba(2,6,23,0.6))]"
] as const;

const DESKTOP_MODULES_AUTOSCROLL_PX_PER_SEC = 72;

const TRUST_PILLARS = [
  {
    title: "Enterprise-grade security",
    description: "Encrypted records, secure session controls, and resilient cloud safeguards."
  },
  {
    title: "Role-based access control",
    description: "Admins, teachers, parents, and staff each see only the actions relevant to their role."
  },
  {
    title: "Audit trails and accountability",
    description: "Critical operational events are logged so teams can review who changed what and when."
  },
  {
    title: "Continuity by design",
    description: "A shared data layer protects institutional memory across academic years and staff changes."
  }
] as const;

const DEMO_STEPS = [
  {
    title: "Setup and configuration",
    description: "Configure your institution structure, roles, and workflows with guided onboarding support."
  },
  {
    title: "Data migration and validation",
    description: "Move student, fee, and operational records with assisted import and accuracy checks."
  },
  {
    title: "Training and go-live support",
    description: "Role-wise enablement for admins, teachers, finance, and operations teams before launch."
  }
] as const;

const SERVICE_LINES = [
  {
    title: "Fast implementation",
    description: "Move from onboarding to a usable unified ERP environment in hours, not months."
  },
  {
    title: "Operational automation",
    description: "Automate report cards, attendance alerts, reminders, and communication workflows."
  },
  {
    title: "Unified module orchestration",
    description: "Link admissions, academics, finance, transport, and communication on one connected platform."
  },
  {
    title: "AI visibility and prediction",
    description: "Track fee, attendance, and performance trends with actionable insight for leadership teams."
  },
  {
    title: "Dedicated success support",
    description: "Get account-level support and implementation guidance during rollout and post go-live."
  }
] as const;

const AI_VALUE_CHIPS = [
  "Unified data layer",
  "Automation-first workflows",
  "Built-in communication",
  "Role-based control"
] as const;

const INSIDE_EDUHUB_SHOTS = [
  { src: "/inside-eduhub/dashboard-overview.png", title: "Dashboard overview" },
  { src: "/inside-eduhub/students-module.png", title: "Students module" },
  { src: "/inside-eduhub/calendar-module.png", title: "School calendar module" },
  { src: "/inside-eduhub/fees-module.png", title: "Fees module" }
] as const;

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

const ABOUT_POINTS = [
  "SoftLane Technology builds practical software for real school operations.",
  "EduHub is designed for transparency across academics, finance, and communication.",
  "The platform is built to scale from single-school operations to multi-school networks.",
  "Our focus is product reliability, usability, and secure access control."
] as const;

const MENU_ITEMS = [
  { href: "#features", label: "Features" },
  { href: "#services", label: "Services" },
  { href: "#modules", label: "Modules" },
  { href: "#security", label: "Security" },
  { href: "#demo", label: "Demo" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact Us" }
] as const;

function marketingPrimaryLabel(isSignedIn: boolean, defaultHomeHref: string) {
  if (!isSignedIn) return "Request demo";
  return defaultHomeHref === "/home" ? "Open home" : "Open dashboard";
}

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

type ProductHomePageProps = {
  isSignedIn: boolean;
  userName?: string | null;
  forceMobileAppLayout?: boolean;
  defaultHomeHref?: string;
};

const initialDemoRequestState: DemoRequestState = { ok: true, message: "", fieldErrors: {} };

export function ProductHomePage({
  isSignedIn,
  userName,
  forceMobileAppLayout = false,
  defaultHomeHref = "/dashboard"
}: ProductHomePageProps) {
  const [demoRequestOpen, setDemoRequestOpen] = useState(false);
  const [demoState, demoAction, demoPending] = useActionState(createDemoRequestAction, initialDemoRequestState);
  const [pauseModuleCatalogAutoscroll, setPauseModuleCatalogAutoscroll] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false);
  const [allModulesOpenToken, setAllModulesOpenToken] = useState(0);
  const [insideShotIndex, setInsideShotIndex] = useState(0);
  const [useMobileAppLayout, setUseMobileAppLayout] = useState(forceMobileAppLayout);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [showCountryNameInDropdown, setShowCountryNameInDropdown] = useState(false);
  const demoFormRef = useRef<HTMLFormElement | null>(null);
  const moduleCatalogScrollerRef = useRef<HTMLDivElement | null>(null);
  const allModulesScrollRef = useRef<HTMLDivElement | null>(null);
  const allModulesPanelRef = useRef<HTMLDivElement | null>(null);
  const name = userName?.trim();
  const welcomeLine = name
    ? `Welcome back, ${name}. Continue with one connected school platform across academics, communication, and operations.`
    : "Replace disconnected school tools with one platform for admissions, academics, fees, communication, transport, and reporting.";

  const openAllModules = () => {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    setAllModulesOpenToken((value) => value + 1);
    setShowAllModules(true);
  };

  useEffect(() => {
    if (demoState.ok && demoState.message) {
      demoFormRef.current?.reset();
      setSelectedCountryCode("+1");
      setShowCountryNameInDropdown(false);
    }
  }, [demoState]);

  useEffect(() => {
    const syncNativeLayout = () => {
      if (typeof window === "undefined") return;
      const byRuntime = isNative();
      const byClass =
        document.documentElement.classList.contains("native-shell") ||
        document.body.classList.contains("native-shell");
      const byUserAgent = /capacitor/i.test(window.navigator.userAgent);
      const byViewport = window.matchMedia("(max-width: 767px)").matches;
      setUseMobileAppLayout(forceMobileAppLayout || byRuntime || byClass || byUserAgent || byViewport);
    };

    syncNativeLayout();

    const observer = new MutationObserver(syncNativeLayout);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", syncNativeLayout);
    window.addEventListener("orientationchange", syncNativeLayout);
    window.addEventListener("focus", syncNativeLayout);
    window.addEventListener("app-foreground", syncNativeLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncNativeLayout);
      window.removeEventListener("orientationchange", syncNativeLayout);
      window.removeEventListener("focus", syncNativeLayout);
      window.removeEventListener("app-foreground", syncNativeLayout);
    };
  }, [forceMobileAppLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (useMobileAppLayout) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scroller = moduleCatalogScrollerRef.current;
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

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (!pauseModuleCatalogAutoscroll && maxScroll > 0) {
        const next = scroller.scrollLeft + DESKTOP_MODULES_AUTOSCROLL_PX_PER_SEC * elapsedSeconds;
        scroller.scrollLeft = next >= maxScroll ? 0 : next;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pauseModuleCatalogAutoscroll, useMobileAppLayout]);

  useLayoutEffect(() => {
    if (!showAllModules) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      allModulesPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const node = allModulesScrollRef.current;
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
  }, [showAllModules, allModulesOpenToken]);

  useEffect(() => {
    if (INSIDE_EDUHUB_SHOTS.length <= 1) return;
    const timer = window.setInterval(() => {
      setInsideShotIndex((current) => (current + 1) % INSIDE_EDUHUB_SHOTS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  if (useMobileAppLayout) {
    return <HomeShell isSignedIn={isSignedIn} userName={userName} defaultHomeHref={defaultHomeHref} />;
  }

  return (
    <main className="relative min-h-dvh md:min-h-screen overflow-x-clip pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(103,180,255,0.2),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(79,141,253,0.14),transparent_55%)]" />

      <div
        className="relative mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] space-y-5 md:space-y-6"
      >
        <header className="rounded-[22px] border border-white/[0.12] bg-[#0c1527]/82 px-4 py-3 sm:px-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandWordmark size="sm" className="mx-auto sm:mx-0" />

            <nav className="hidden md:flex items-center gap-2 text-sm text-white/65">
              {MENU_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-full px-3 py-1.5 transition hover:bg-white/[0.07] hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <Link
                    href={defaultHomeHref}
                    className="inline-flex items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_-16px_rgba(79,141,253,0.85)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    {marketingPrimaryLabel(isSignedIn, defaultHomeHref)}
                  </Link>
                  <Link
                    href="/support"
                    className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/[0.26] hover:bg-[#17253d]"
                  >
                    Contact support
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_-16px_rgba(79,141,253,0.85)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    Explore product
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.14] bg-[#101a2d]/90 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/[0.26] hover:bg-[#17253d]"
                  >
                    School login
                  </Link>
                </>
              )}
            </div>
          </div>

          <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 md:hidden">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/78 transition hover:bg-white/[0.08] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="rounded-[30px] border border-white/[0.12] bg-[linear-gradient(150deg,rgba(16,28,48,0.95),rgba(9,14,25,0.96))] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Badge tone="info" dot>School Management Platform</Badge>
              <h1 className="text-[26px] leading-[1.08] font-extrabold tracking-[-0.02em] text-white sm:text-[36px] md:text-[44px]">
                Manage your school with one AI-powered platform.
              </h1>
              <p className="max-w-[760px] text-[15px] leading-relaxed text-white/68 sm:text-[16px]">
                {welcomeLine}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {AI_VALUE_CHIPS.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-500/12 px-2.5 py-1 text-[11px] font-medium text-cyan-100/92"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {isSignedIn ? (
                  <Link
                    href={defaultHomeHref}
                    className="inline-flex items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.88)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    {marketingPrimaryLabel(isSignedIn, defaultHomeHref)}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDemoRequestOpen(true)}
                    className="inline-flex items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.88)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    {marketingPrimaryLabel(isSignedIn, defaultHomeHref)}
                  </button>
                )}
                <Link
                  href={isSignedIn ? defaultHomeHref : "#features"}
                  className="inline-flex items-center justify-center rounded-[13px] border border-white/[0.14] bg-white/[0.03] px-5 py-2.5 text-[14px] font-semibold text-white/88 transition hover:bg-white/[0.08]"
                >
                  {isSignedIn ? "Continue where you left off" : "Explore all features"}
                </Link>
              </div>

              <p className="text-xs text-white/48 sm:text-sm">
                Built for principals, trustees, admins, teachers, finance, and operations teams.
              </p>

              <div className="rounded-[18px] border border-cyan-300/22 bg-[linear-gradient(150deg,rgba(10,21,40,0.92),rgba(6,12,24,0.96))] p-2 sm:p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/86">Inside EduHub</p>
                <div className="mt-2 overflow-hidden rounded-[14px] border border-white/[0.12] bg-[#050b17]">
                  <div className="relative aspect-[16/9] lg:aspect-[22/7] w-full">
                    <Image
                      src={INSIDE_EDUHUB_SHOTS[insideShotIndex].src}
                      alt={INSIDE_EDUHUB_SHOTS[insideShotIndex].title}
                      fill
                      sizes="(min-width: 1024px) 42vw, 100vw"
                      className="object-cover"
                      priority
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050b17]/90 via-[#050b17]/20 to-transparent px-3 py-1">
                      <p className="text-[12px] font-medium text-white/88">{INSIDE_EDUHUB_SHOTS[insideShotIndex].title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.08] bg-[#060d1b]/85 px-3 py-1">
                    {INSIDE_EDUHUB_SHOTS.map((shot, index) => (
                      <button
                        key={shot.src}
                        type="button"
                        onClick={() => setInsideShotIndex(index)}
                        aria-label={`View ${shot.title}`}
                        className={[
                          "h-1.5 rounded-full transition-all",
                          index === insideShotIndex ? "w-6 bg-cyan-300" : "w-2 bg-white/35 hover:bg-white/55"
                        ].join(" ")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Card
              title="Why schools switch"
              description="From fragmented apps to one data-connected operating model."
              accent="violet"
              className="h-full lg:-ml-4"
            >
              <div className="space-y-2.5">
                <MarketingBullet label="Unified records" detail="One student profile, one fee ledger, and one attendance history across modules." />
                <MarketingBullet label="Automation-first execution" detail="Cut manual report card and follow-up work with connected workflows." />
                <MarketingBullet label="Built-in parent communication" detail="Keep families informed through integrated notification channels." />
                <MarketingBullet label="Leadership confidence" detail="Use dashboards and reports for faster data-backed institutional decisions." />
                <MarketingBullet label="Faster implementation" detail="Go live quickly with guided setup, migration, and training support." />
                <MarketingBullet label="Flexible module rollout" detail="Start fast with 20+ modules and enable only what each school team needs." />
              </div>
            </Card>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-3.5 py-3.5">
                <p className="truncate text-[15px] font-semibold text-white/88 sm:text-[16px]">
                  <span className="mr-1 text-[19px] font-bold text-white sm:text-[20px]">{stat.value}</span>
                  <span>{stat.label}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="space-y-3">
          <div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-200/72">Features</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-white/95 sm:text-[30px]">Built for every school stakeholder</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {FEATURE_TRACKS.map((track) => (
              <Card key={track.title} title={track.title} accent={track.accent}>
                <div className="space-y-2.5">
                  {track.points.map((point) => (
                    <p key={point} className="text-sm leading-relaxed text-white/70">
                      {point}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="modules" className="rounded-[22px] border border-white/[0.1] bg-[#0b1222]/88 px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-white/94">Module catalog</h3>
            <p className="text-sm text-white/52">Choose only what your school needs.</p>
          </div>

          <div className="relative mt-4 hidden md:block">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[#0b1222] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#0b1222] to-transparent" />
            <div
              ref={moduleCatalogScrollerRef}
              className="overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onMouseEnter={() => setPauseModuleCatalogAutoscroll(true)}
              onMouseLeave={() => setPauseModuleCatalogAutoscroll(false)}
              onFocusCapture={() => setPauseModuleCatalogAutoscroll(true)}
              onBlurCapture={() => setPauseModuleCatalogAutoscroll(false)}
            >
              <div className="flex min-w-max gap-2.5 pr-2">
                {MODULE_CATALOG.map((moduleItem, index) => (
                  <article
                    key={moduleItem.label}
                    className={`module-float-card w-[252px] min-h-[138px] shrink-0 rounded-[15px] border px-4 py-3.5 transition-all duration-250 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-cyan-200/80 hover:shadow-[0_18px_38px_-18px_rgba(125,211,252,0.95)] hover:saturate-125 hover:brightness-110 ${MODULE_TILE_SKINS[index % MODULE_TILE_SKINS.length]}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[20px]">{moduleItem.icon}</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-100/85" />
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-white/96">{moduleItem.label}</p>
                    <p className="mt-1 text-[12px] leading-snug text-white/75">{moduleItem.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {MODULE_CATALOG.map((moduleItem) => (
              <span
                key={moduleItem.label}
                className="inline-flex rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/78"
              >
                {moduleItem.label}
              </span>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={openAllModules}
              aria-expanded={showAllModules}
              className="inline-flex items-center justify-center rounded-[12px] border border-cyan-300/35 bg-cyan-500/15 px-4 py-2 text-[12px] font-semibold text-cyan-100/95 transition hover:bg-cyan-500/24"
            >
              View all modules
            </button>
          </div>
        </section>

        <section id="services" className="space-y-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-200/72">Services</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-white/95 sm:text-[30px]">Services for onboarding and growth</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {SERVICE_LINES.map((service, index) => (
              <Card
                key={service.title}
                title={service.title}
                accent={index % 2 === 0 ? "indigo" : "emerald"}
              >
                <p className="text-sm leading-relaxed text-white/68">{service.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="about" className="space-y-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-200/72">About Us</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-white/95 sm:text-[30px]">SoftLane Technology</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card title="Who we are" accent="teal">
              <p className="text-sm leading-relaxed text-white/68">
                SoftLane Technology is the product team behind EduHub. We focus on building software that helps schools
                simplify daily operations while improving visibility and accountability across departments.
              </p>
            </Card>

            <Card title="What we focus on" accent="amber">
              <div className="space-y-2.5">
                {ABOUT_POINTS.map((point) => (
                  <p key={point} className="text-sm leading-relaxed text-white/68">{point}</p>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="security" className="space-y-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-200/72">Security</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-white/95 sm:text-[30px]">Operational trust at every level</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {TRUST_PILLARS.map((pillar) => (
              <Card key={pillar.title} title={pillar.title} accent="teal">
                <p className="text-sm leading-relaxed text-white/68">{pillar.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="demo" className="rounded-[24px] border border-cyan-300/25 bg-[linear-gradient(145deg,rgba(14,165,233,0.16),rgba(6,10,18,0.96))] px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-100/86">Demo</p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-[30px]">How the demo journey works</h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {DEMO_STEPS.map((step, index) => (
              <Card
                key={step.title}
                title={`0${index + 1}. ${step.title}`}
                accent="indigo"
                className="bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))]"
              >
                <p className="text-sm leading-relaxed text-white/70">{step.description}</p>
              </Card>
            ))}
          </div>

        </section>

        <section id="contact" className="rounded-[22px] border border-white/[0.1] bg-[#0b1222]/88 px-4 py-5 sm:px-5 sm:py-6">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan-200/72">Contact Us</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-white/95 sm:text-[30px]">Single Contact Us widget</h3>
          </div>

          <div className="mt-4">
            <Card title="Reach our team quickly" accent="indigo">
              <p className="text-sm leading-relaxed text-white/68">
                Use the floating <span className="font-semibold text-cyan-100">Contact Us</span> widget to access
                quick actions for <span className="font-semibold text-cyan-100">Email</span>, <span className="font-semibold text-cyan-100">Call</span>, and <span className="font-semibold text-cyan-100">WhatsApp</span>.
              </p>
            </Card>
          </div>
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-white/45">
          Copyright © {new Date().getFullYear()} SoftLane Technology. All rights reserved.
        </footer>
      </div>
      {showAllModules ? (
        <div className="fixed inset-0 z-[220] flex items-start sm:items-center justify-center bg-[#030815]/92 backdrop-blur-md p-0 sm:p-5">
          <button
            type="button"
            aria-label="Close all modules view"
            onClick={() => setShowAllModules(false)}
            className="absolute inset-0"
          />
          <div
            ref={allModulesPanelRef}
            className="relative w-full h-dvh sm:h-[min(92vh,980px)] sm:max-w-[1220px] rounded-none sm:rounded-[20px] border border-white/[0.14] bg-[#0b1426]/98 shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">All Modules</p>
                <p className="mt-0.5 text-[13px] text-white/65">Explore the complete EduHub module catalog.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModules(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-white/[0.03] text-white/75 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div
              key={`all-modules-${allModulesOpenToken}`}
              ref={allModulesScrollRef}
              className="h-[calc(100dvh-76px)] sm:h-[calc(92vh-74px)] overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5 [overflow-anchor:none]"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULE_CATALOG.map((moduleItem, index) => (
                  <article
                    key={`all-${moduleItem.label}`}
                    data-module-index={index}
                    className={`rounded-[15px] border px-4 py-3.5 ${MODULE_TILE_SKINS[index % MODULE_TILE_SKINS.length]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[20px]">{moduleItem.icon}</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-100/85" />
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-white/95">{moduleItem.label}</p>
                    <p className="mt-1 text-[12px] leading-snug text-white/72">{moduleItem.description}</p>
                  </article>
                ))}
              </div>
            </div>
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
              </div>
              <button
                type="button"
                onClick={() => setDemoRequestOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-white/[0.03] text-white/70 transition hover:bg-white/[0.09] hover:text-white"
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
    </main>
  );
}

function MarketingBullet({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[13px] font-semibold text-white/88">{label}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-white/58">{detail}</p>
    </div>
  );
}
