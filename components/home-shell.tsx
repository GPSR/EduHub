"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { BrandWordmark } from "@/components/brand";

const STORAGE_KEY = "eduhub_onboarded_v1";
const STORAGE_SLUG_KEY = "eduhub_school_slug_v1";

const MOBILE_HERO_CHIPS = [
  "⚡ Setup in minutes",
  "📱 Mobile ready",
  "🔐 Role-based",
  "🌐 Works offline",
];

const MOBILE_STATS = [
  { icon: "🧩", value: "14", label: "Modules" },
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
    icon: "🚌",
    label: "Transport",
    desc: "Live tracking bus",
    className: "bg-[linear-gradient(135deg,rgba(244,63,94,0.2),rgba(236,72,153,0.08))] border-rose-300/25",
  },
] as const;

const ALL_MODULES = [
  { icon: "🏠", label: "Dashboard", desc: "Real-time school KPIs" },
  { icon: "👥", label: "Students", desc: "Admissions and profiles" },
  { icon: "💳", label: "Fees", desc: "Invoices and collections" },
  { icon: "✅", label: "Attendance", desc: "Daily attendance logs" },
  { icon: "🗓️", label: "Timetable", desc: "Class schedules" },
  { icon: "📢", label: "Feed", desc: "Announcements and updates" },
  { icon: "📚", label: "Academics", desc: "Subjects and curriculum" },
  { icon: "📝", label: "Homework", desc: "Assignments tracking" },
  { icon: "🎓", label: "Progress Card", desc: "Exam results and reports" },
  { icon: "📊", label: "Reports", desc: "Analytics and exports" },
  { icon: "🔔", label: "Notifications", desc: "Alerts for users" },
  { icon: "🚌", label: "Transport", desc: "Live tracking bus" },
  { icon: "⚙️", label: "School Settings", desc: "School configuration" },
  { icon: "🧑‍💼", label: "Users", desc: "Roles and permissions" },
] as const;

export function HomeShell({ isSignedIn }: { isSignedIn: boolean }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [showAllModules, setShowAllModules] = useState(false);

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(STORAGE_KEY) === "1");
      setSlug(localStorage.getItem(STORAGE_SLUG_KEY) || undefined);
    } catch {
      setOnboarded(false);
      setSlug(undefined);
    }
  }, []);

  const loginHref = slug ? `/login?schoolSlug=${encodeURIComponent(slug)}` : "/login";
  const primaryHref = onboarded ? loginHref : "/onboard";
  const primaryLabel = onboarded ? "Login →" : "Onboard School →";
  const secondaryHref = onboarded ? "/onboard" : loginHref;
  const secondaryLabel = onboarded ? "Onboard School" : "Login";

  /* Skeleton while checking localStorage */
  if (onboarded === null && !isSignedIn) {
    return (
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
    );
  }

  const mobileLanding = (
    <div className="space-y-3 md:space-y-4">
      <section className="rounded-[24px] border border-white/[0.12] bg-[#070e1c] px-4 pt-5 pb-4 md:px-6 md:pt-6 md:pb-5 text-center">
        <div className="flex flex-col items-center">
          <div className="mx-auto mb-2">
            <BrandWordmark size="md" className="pointer-events-none" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/35 bg-cyan-500/12 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-100/90">
              School Management Platform
            </span>
          </div>
        </div>
        <h2 className="mt-2 text-[22px] md:text-[30px] font-extrabold leading-[1.05] text-white/95">Run your school</h2>
        <p className="text-[22px] md:text-[30px] font-extrabold leading-[1.05] text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-violet-300">
          from one platform
        </p>
        <p className="mx-auto mt-2 max-w-[290px] md:max-w-[580px] text-[11.5px] md:text-[13px] leading-relaxed text-white/52">
          EduHub unifies admissions, fees, attendance, communication and transport.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          {MOBILE_HERO_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/62"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[20px] border border-white/[0.10] bg-[linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.10),#0b1323)] px-4 py-4 md:px-6 md:py-5">
        <div className="pointer-events-none absolute -top-6 -right-4 h-20 w-20 rounded-full border border-white/[0.05]" />
        <div className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full border border-white/[0.04]" />

        <h3 className="text-[15px] font-extrabold leading-tight text-white/95">
          Get your school online{" "}
          <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">in minutes</span>
        </h3>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
          One platform for admissions, daily ops, parent communication, fees, and more.
        </p>

        <div className="mt-3 space-y-2">
          <Link
            href={primaryHref}
            className="flex h-10 items-center justify-center rounded-[13px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[12px] font-bold text-white shadow-[0_10px_24px_-14px_rgba(79,141,253,0.75)]"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="flex h-9 items-center justify-center rounded-[13px] border border-white/[0.12] bg-white/[0.06] text-[12px] font-semibold text-white/82"
          >
            {secondaryLabel}
          </Link>
          <p className="pt-0.5 text-center text-[9.5px] text-white/34">Free to start · No credit card required</p>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-2 md:overflow-visible md:px-0">
        {MOBILE_STATS.map((item) => (
          <article
            key={item.label}
            className="min-w-[72px] md:min-w-0 flex-1 rounded-[13px] border border-white/[0.09] bg-white/[0.04] px-2 py-2 md:py-3 text-center"
          >
            <div className="text-[13px]">{item.icon}</div>
            <div className="text-[14px] font-extrabold text-white/92">{item.value}</div>
            <div className="mt-0.5 text-[8.5px] leading-tight text-white/45">{item.label}</div>
          </article>
        ))}
      </section>

      <section className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-3 md:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-bold text-white/78">Everything included</p>
            <p className="text-[9px] text-white/38">14 modules · one platform</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllModules((prev) => !prev)}
            aria-expanded={showAllModules}
            className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-1 text-[9px] font-bold text-emerald-100/95 transition hover:bg-emerald-500/20"
          >
            {showAllModules ? "Hide modules" : "All modules"}
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-2">
          {MOBILE_FEATURES.map((item) => (
            <article key={item.label} className={`rounded-[12px] border px-1.5 py-1.5 md:px-2 md:py-2 ${item.className}`}>
              <div className="text-[15px] md:text-[16px]">{item.icon}</div>
              <div className="mt-1 text-[9px] md:text-[10px] font-bold leading-tight text-white/88">{item.label}</div>
              <div className="mt-0.5 text-[8.5px] md:text-[9px] leading-tight text-white/50">{item.desc}</div>
            </article>
          ))}
        </div>

        {showAllModules && (
          <div className="mt-3 rounded-[14px] border border-white/[0.10] bg-[#0f1728]/70 p-2.5 md:p-3 animate-fade-up">
            <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-white/45">All 14 modules</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_MODULES.map((module) => (
                <article
                  key={module.label}
                  className="rounded-[11px] border border-white/[0.10] bg-white/[0.03] px-2 py-2"
                >
                  <div className="text-[14px]">{module.icon}</div>
                  <div className="mt-1 text-[10px] font-semibold text-white/88 leading-tight">{module.label}</div>
                  <div className="mt-0.5 text-[9px] text-white/50 leading-tight">{module.desc}</div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[16px] border border-white/[0.08] bg-[#060912]/95 px-2 py-2 md:hidden">
        <div className="flex items-end justify-around">
          {[
            { icon: "◈", label: "Home", active: true },
            { icon: "👥", label: "Students" },
            { icon: "💳", label: "Fees" },
            { icon: "📢", label: "Feed" },
            { icon: "⋯", label: "More" },
          ].map((tab) => (
            <div key={tab.label} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <span className={`h-0.5 w-5 rounded-full ${tab.active ? "bg-indigo-400" : "bg-transparent"}`} />
              <span className="text-[18px] leading-none">{tab.icon}</span>
              <span className={`text-[9px] font-semibold ${tab.active ? "text-white/92" : "text-white/38"}`}>
                {tab.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  /* Signed-in state */
  if (isSignedIn) {
    return (
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <Card title="Welcome back" accent="indigo">
          <p className="text-sm text-white/60 mb-4">Continue where you left off.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[13px]
                       bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white text-sm font-medium
                       shadow-[0_10px_28px_-12px_rgba(79,141,253,0.72)]
                       hover:from-[#7ac0ff] hover:to-[#5a95ff] transition-colors"
          >
            Open dashboard →
          </Link>
        </Card>
        <Card title="Quick links" accent="teal">
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/students",   icon: "👥", label: "Students"   },
              { href: "/fees",       icon: "💳", label: "Fees"       },
              { href: "/attendance", icon: "✅", label: "Attendance" },
              { href: "/feed",       icon: "📢", label: "Feed"       },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-[13px] border border-white/[0.12] bg-[#101a2d]/90
                           px-3.5 py-3 hover:bg-[#17253d] hover:border-white/[0.20] transition-all text-sm font-medium text-white/85"
              >
                <span className="text-base">{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return mobileLanding;
}
