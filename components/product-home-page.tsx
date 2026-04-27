"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent, type InvalidEvent } from "react";
import { BrandWordmark } from "@/components/brand";
import { Badge, Card } from "@/components/ui";
import { createDemoRequestAction, type DemoRequestState } from "@/app/demo-request/actions";

const HERO_STATS = [
  { value: "20+", label: "School modules" },
  { value: "4", label: "Primary user groups" },
  { value: "24/7", label: "Parent visibility" },
  { value: "1", label: "Unified platform" }
] as const;

const FEATURE_TRACKS = [
  {
    title: "Administration",
    accent: "indigo" as const,
    points: [
      "Central dashboard for revenue, attendance, and operational KPIs.",
      "Role and permission controls with module-level access.",
      "Approval workflows for onboarding, requests, and policy changes."
    ]
  },
  {
    title: "Teachers",
    accent: "teal" as const,
    points: [
      "Timetable, attendance, homework, and leave workflows in one place.",
      "Class-specific learning resources and communication tools.",
      "Salary and payout visibility with leave-based calculations."
    ]
  },
  {
    title: "Parents and Students",
    accent: "emerald" as const,
    points: [
      "Transparent fee status, reminders, and payment records.",
      "Announcements, calendar events, and progress communication.",
      "Student profile requests and transport visibility when enabled."
    ]
  },
  {
    title: "Platform Team",
    accent: "amber" as const,
    points: [
      "Multi-school administration from a single platform console.",
      "Subscription, onboarding approvals, and audit oversight.",
      "Cross-school support and standardized operating controls."
    ]
  },
  {
    title: "AI-powered operations",
    accent: "violet" as const,
    points: [
      "Automate repetitive workflows with AI-assisted actions and recommendations.",
      "Get early alerts on attendance, fee collection, and engagement risks.",
      "Generate communication drafts and summaries to respond faster."
    ]
  }
] as const;

const MODULE_CATALOG = [
  { icon: "🏠", label: "Dashboard", description: "Real-time school KPIs" },
  { icon: "👥", label: "Students", description: "Admissions and profiles" },
  { icon: "💳", label: "Fees", description: "Invoices and collections" },
  { icon: "✅", label: "Attendance", description: "Daily attendance tracking" },
  { icon: "🗓️", label: "Timetable", description: "Class schedule planning" },
  { icon: "📢", label: "Feed", description: "Announcements and updates" },
  { icon: "📚", label: "Academics", description: "Subjects and curriculum" },
  { icon: "🧠", label: "Learning Center", description: "Class-wise resources" },
  { icon: "▶️", label: "YouTube Learning", description: "Holiday learning videos" },
  { icon: "📅", label: "School Calendar", description: "Events and exam dates" },
  { icon: "📝", label: "Leave Requests", description: "Approval workflows" },
  { icon: "💼", label: "Teacher Salary", description: "Monthly and yearly payout" },
  { icon: "📊", label: "Reports", description: "Analytics and exports" },
  { icon: "🔔", label: "Notifications", description: "Actionable alerts" },
  { icon: "🚌", label: "Transport", description: "Bus visibility and tracking" },
  { icon: "🖼️", label: "Gallery", description: "School media and folders" },
  { icon: "⚙️", label: "School Settings", description: "Campus configuration" },
  { icon: "🧑‍💼", label: "Users", description: "Roles and permissions" },
  { icon: "🛡️", label: "Platform Audit", description: "Audit visibility controls" },
  { icon: "💬", label: "Support", description: "Integrated support workflows" }
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
    title: "Role-based authorization",
    description: "Access is restricted by school role and module-level permissions."
  },
  {
    title: "Token-based sessions",
    description: "Scoped auth tokens with issuer and audience checks protect both school and platform routes."
  },
  {
    title: "Biometric ready mobile flow",
    description: "Face ID and fingerprint-based unlock can be enabled from user profile on mobile apps."
  },
  {
    title: "Audit visibility",
    description: "Critical admin and account operations are tracked for review."
  }
] as const;

const DEMO_STEPS = [
  {
    title: "Share your school details",
    description: "Tell us your school size, modules needed, and rollout timeline."
  },
  {
    title: "Get a guided walkthrough",
    description: "We show your team the complete flow from onboarding to daily operations."
  },
  {
    title: "Launch with confidence",
    description: "Move from demo to onboarding with role setup and go-live support."
  }
] as const;

const SERVICE_LINES = [
  {
    title: "Implementation and onboarding",
    description: "School setup, role mapping, and launch support for administrators and staff."
  },
  {
    title: "Training and adoption",
    description: "Guided onboarding sessions for admins, teachers, and support teams."
  },
  {
    title: "Customization and rollout",
    description: "Module planning aligned to your school process, policy, and growth stage."
  },
  {
    title: "AI enablement for schools",
    description: "Adopt AI-powered insights, alerts, and communication workflows tailored to each role."
  },
  {
    title: "Ongoing support",
    description: "Post-launch assistance for platform usage, operations, and issue resolution."
  }
] as const;

const AI_VALUE_CHIPS = [
  "AI-powered analytics",
  "Predictive alerts",
  "Smart communication",
  "Automation-ready workflows"
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

function marketingPrimaryLabel(isSignedIn: boolean) {
  return isSignedIn ? "Open dashboard" : "Request demo";
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
};

const initialDemoRequestState: DemoRequestState = { ok: true, message: "", fieldErrors: {} };

export function ProductHomePage({ isSignedIn, userName }: ProductHomePageProps) {
  const [demoRequestOpen, setDemoRequestOpen] = useState(false);
  const [demoState, demoAction, demoPending] = useActionState(createDemoRequestAction, initialDemoRequestState);
  const [pauseModuleCatalogAutoscroll, setPauseModuleCatalogAutoscroll] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [showCountryNameInDropdown, setShowCountryNameInDropdown] = useState(false);
  const demoFormRef = useRef<HTMLFormElement | null>(null);
  const moduleCatalogScrollerRef = useRef<HTMLDivElement | null>(null);
  const name = userName?.trim();
  const welcomeLine = name
    ? `Welcome back, ${name}. You can continue where you left off or explore the full product overview.`
    : "EduHub helps schools run academics, operations, communication, and administration with AI-powered intelligence from one secure platform.";

  useEffect(() => {
    if (demoState.ok && demoState.message) {
      demoFormRef.current?.reset();
      setSelectedCountryCode("+1");
      setShowCountryNameInDropdown(false);
    }
  }, [demoState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
  }, [pauseModuleCatalogAutoscroll]);

  return (
    <main className="relative min-h-dvh md:min-h-screen overflow-x-clip pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(103,180,255,0.2),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(79,141,253,0.14),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] space-y-5 md:space-y-6">
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
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_-16px_rgba(79,141,253,0.85)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    Open dashboard
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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Badge tone="info" dot>School Management Product</Badge>
              <h1 className="text-[30px] leading-[1.04] font-extrabold tracking-[-0.02em] text-white sm:text-[42px] md:text-[52px]">
                A complete digital operating system for schools with AI.
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
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.88)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    {marketingPrimaryLabel(isSignedIn)}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDemoRequestOpen(true)}
                    className="inline-flex items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.88)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                  >
                    {marketingPrimaryLabel(isSignedIn)}
                  </button>
                )}
                <Link
                  href={isSignedIn ? "/dashboard" : "#features"}
                  className="inline-flex items-center justify-center rounded-[13px] border border-white/[0.14] bg-white/[0.03] px-5 py-2.5 text-[14px] font-semibold text-white/88 transition hover:bg-white/[0.08]"
                >
                  {isSignedIn ? "Continue where you left off" : "Explore all features"}
                </Link>
              </div>

              <p className="text-xs text-white/48 sm:text-sm">
                Ideal for school admins, teachers, parents, and platform teams.
              </p>
            </div>

            <Card
              title="What visitors can review"
              description="A clear product overview before onboarding."
              accent="violet"
              className="h-full"
            >
              <div className="space-y-2.5">
                <MarketingBullet label="Module walkthroughs" detail="Understand each school workflow and user role." />
                <MarketingBullet label="Operational transparency" detail="See how attendance, fees, and communication connect." />
                <MarketingBullet label="Security-first design" detail="Review authorization and access controls before rollout." />
                <MarketingBullet label="AI-powered value" detail="Show stakeholders how automation and predictive insights improve decisions." />
                <MarketingBullet label="Demo readiness" detail="Request a guided product demo in one click." />
              </div>
            </Card>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-3 py-3 text-center">
                <p className="text-lg font-bold text-white/95 sm:text-xl">{stat.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/48 sm:text-[12px]">{stat.label}</p>
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
              onClick={() => setShowAllModules(true)}
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
        <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5">
          <button
            type="button"
            aria-label="Close all modules view"
            onClick={() => setShowAllModules(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-[1220px] h-[min(92vh,980px)] rounded-[20px] border border-white/[0.14] bg-[#0b1426]/96 shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
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

            <div className="h-[calc(92vh-74px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULE_CATALOG.map((moduleItem, index) => (
                  <article
                    key={`all-${moduleItem.label}`}
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
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <button
            type="button"
            aria-label="Close demo request form"
            onClick={() => setDemoRequestOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-[560px] rounded-[20px] border border-white/[0.14] bg-[#0e172a]/95 p-4 sm:p-5 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)]">
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

              <label className="space-y-1 block">
                <span className="text-[12px] font-medium text-white/75">School Name</span>
                <input
                  name="schoolName"
                  required
                  minLength={2}
                  maxLength={120}
                  pattern="^[A-Za-z0-9][A-Za-z0-9 '&().,-]{1,119}$"
                  title="Use letters, numbers, spaces, and basic punctuation only."
                  autoComplete="organization"
                  placeholder="Enter school name"
                  data-msg-required="Please enter your school name."
                  data-msg-pattern="Use letters, numbers, spaces, and basic punctuation only."
                  data-msg-min="School name should be at least 2 characters."
                  data-msg-max="School name cannot exceed 120 characters."
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
