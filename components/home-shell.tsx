"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { SchoolSlugCheck } from "@/components/school-slug-check";
import { HomeCTA } from "@/components/home-cta";

const STORAGE_KEY = "eduhub_onboarded_v1";

const FEATURES = [
  { icon: "🏠", label: "Dashboard", desc: "School-wide overview at a glance" },
  { icon: "👥", label: "Students", desc: "Admissions, profiles & guardians" },
  { icon: "💳", label: "Fees", desc: "Invoices, dues & payment tracking" },
  { icon: "✅", label: "Attendance", desc: "Daily marking with trends" },
  { icon: "🗓️", label: "Timetable", desc: "Class schedules and periods" },
  { icon: "📢", label: "Communication", desc: "Announcements and school feed" },
  { icon: "📝", label: "Homework", desc: "Assignments and submissions" },
  { icon: "🎓", label: "Progress Card", desc: "Marks, grades and report cards" },
  { icon: "📊", label: "Reports", desc: "Academic and fee analytics" },
  { icon: "📚", label: "Academics", desc: "Subjects, terms and curriculum" },
  { icon: "🔔", label: "Notifications", desc: "Alerts, reminders and updates" },
  { icon: "🚌", label: "Transport", desc: "Live bus tracking, student safety, and pickup/drop alerts for parents." },
  { icon: "⚙️", label: "School Settings", desc: "Branding and configuration" },
  { icon: "🧑‍💼", label: "Users", desc: "Role-based staff and parent access" },
];

const ONBOARDING_HIGHLIGHTS = [
  "School onboarding workflow",
  "Role-based access control",
  "Works on web + mobile app"
];

export function HomeShell({ isSignedIn }: { isSignedIn: boolean }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setOnboarded(false);
    }
  }, []);

  /* Skeleton while checking localStorage */
  if (onboarded === null && !isSignedIn) {
    return (
      <div className="space-y-5">
        <Card>
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-10 w-full rounded-[13px] bg-white/[0.04] animate-pulse" />
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: FEATURES.length }).map((_, i) => (
              <div key={i} className="h-16 lg:h-14 rounded-[13px] bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  /* Signed-in state */
  if (isSignedIn) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

  /* New user — onboarding */
  if (!onboarded) {
    return (
      <div className="space-y-5">
        <Card title="Get started" description="Create your school & admin account in minutes" accent="indigo">
          <div className="rounded-[14px] border border-white/[0.14] bg-[radial-gradient(circle_at_15%_15%,rgba(96,165,250,0.25),transparent_45%),linear-gradient(180deg,rgba(10,18,35,0.72),rgba(8,14,28,0.9))] p-4">
            <p className="text-sm text-white/80 leading-relaxed">
              Launch your digital school operations with fast onboarding, secure access, and ready-to-use modules.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ONBOARDING_HIGHLIGHTS.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-full border border-blue-300/25 bg-blue-500/12 px-2.5 py-1 text-[11px] font-medium text-blue-100/95"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <HomeCTA isSignedIn={false} />
          </div>
          <p className="mt-4 text-xs text-white/40">Free to start · No credit card required</p>
        </Card>
        <Card title="Everything you need" description="Core modules included" accent="teal">
          <div className="mb-3 flex items-center justify-between rounded-[12px] border border-white/[0.10] bg-[#0d1629]/70 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">All-in-one school suite</p>
            <span className="rounded-full border border-teal-300/30 bg-teal-400/14 px-2.5 py-1 text-[11px] font-semibold text-teal-100">
              {FEATURES.length} modules
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {FEATURES.map(f => (
              <div
                key={f.label}
                className="rounded-[13px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(21,34,58,0.95),rgba(11,18,33,0.96))]
                           px-3 py-3 lg:px-2.5 lg:py-2.5 hover:border-white/[0.20] hover:bg-[#17253d] transition-colors"
              >
                <div className="mb-1.5 inline-flex h-7 w-7 lg:h-6 lg:w-6 items-center justify-center rounded-[9px] border border-white/[0.14] bg-white/[0.06] text-base lg:text-sm">
                  {f.icon}
                </div>
                <div
                  className="text-[13px] lg:text-[12px] font-semibold text-white/85 leading-snug whitespace-nowrap"
                  title={f.label}
                >
                  {f.label}
                </div>
                <div className="mt-0.5 text-[11px] text-white/45 leading-snug lg:hidden">{f.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  /* Returning user — login */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="New school?" description="Manage multiple schools from one device" accent="teal">
        <p className="text-sm text-white/55 mb-4">
          Each school has its own isolated data and user accounts.
        </p>
        <Link
          href="/onboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[13px]
                     border border-white/[0.12] bg-[#101a2d]/90 text-sm font-medium text-white/85
                     hover:bg-[#17253d] hover:text-white transition-all"
        >
          Onboard School
        </Link>
      </Card>
      <Card title="Sign in" description="Enter your school code to continue" accent="indigo">
        <SchoolSlugCheck />
      </Card>
    </div>
  );
}
