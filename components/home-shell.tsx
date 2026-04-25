"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { SchoolSlugCheck } from "@/components/school-slug-check";
import { HomeCTA } from "@/components/home-cta";

const STORAGE_KEY = "eduhub_onboarded_v1";

type FeatureGroup = "Core Ops" | "Learning" | "Engagement" | "Insights" | "Administration";

type FeatureItem = {
  icon: string;
  label: string;
  desc: string;
  group: FeatureGroup;
};

const FEATURES = [
  { icon: "🏠", label: "Dashboard", desc: "Real-time school KPIs", group: "Core Ops" },
  { icon: "👥", label: "Students", desc: "Admissions and student profiles", group: "Core Ops" },
  { icon: "💳", label: "Fees", desc: "Invoices, reminders, and collections", group: "Core Ops" },
  { icon: "✅", label: "Attendance", desc: "Daily logs with trend insights", group: "Core Ops" },
  { icon: "🗓️", label: "Timetable", desc: "Class and period scheduling", group: "Core Ops" },
  { icon: "📢", label: "Communication", desc: "Announcements and school feed", group: "Engagement" },
  { icon: "📝", label: "Homework", desc: "Assignment tracking and follow-up", group: "Learning" },
  { icon: "🎓", label: "Progress Card", desc: "Exam marks and term reports", group: "Learning" },
  { icon: "📊", label: "Reports", desc: "Analytics and export-ready reports", group: "Insights" },
  { icon: "📚", label: "Academics", desc: "Subjects and curriculum setup", group: "Learning" },
  { icon: "🔔", label: "Notifications", desc: "Alerts for parents and staff", group: "Engagement" },
  { icon: "🚌", label: "Transport", desc: "Live tracking and route alerts", group: "Engagement" },
  { icon: "⚙️", label: "School Settings", desc: "Branding and school controls", group: "Administration" },
  { icon: "🧑‍💼", label: "Users", desc: "Role and permission management", group: "Administration" },
] satisfies FeatureItem[];

const FEATURE_GROUPS: FeatureGroup[] = ["Core Ops", "Learning", "Engagement", "Insights", "Administration"];

const FEATURE_GROUP_STYLES: Record<FeatureGroup, string> = {
  "Core Ops": "border-blue-300/35 bg-blue-500/14 text-blue-100/95",
  Learning: "border-emerald-300/35 bg-emerald-500/14 text-emerald-100/95",
  Engagement: "border-cyan-300/35 bg-cyan-500/14 text-cyan-100/95",
  Insights: "border-amber-300/35 bg-amber-500/14 text-amber-100/95",
  Administration: "border-violet-300/35 bg-violet-500/14 text-violet-100/95",
};

const ONBOARDING_HIGHLIGHTS = [
  { icon: "🚀", text: "Setup in minutes" },
  { icon: "🔐", text: "Secure permissions" },
  { icon: "📱", text: "Mobile-first experience" },
];

const PROOF_POINTS = [
  { value: "14", label: "Core modules" },
  { value: "1", label: "Unified platform" },
  { value: "24/7", label: "Parent visibility" },
  { value: "Role-based", label: "Secure access" },
];

const ONBOARDING_JOURNEY = [
  { step: "01", title: "Create school", desc: "Add school profile, slug, and branding details." },
  { step: "02", title: "Create admin", desc: "Set admin account and secure access permissions." },
  { step: "03", title: "Start operations", desc: "Run modules with students, teachers, and parents." },
];

const ONBOARDING_ASSURANCE = [
  "Approval update sent by email",
  "Secure invite links expire in 30 minutes",
  "No credit card required to start",
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
      <div className="space-y-4 lg:space-y-2.5">
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
      <div className="space-y-4 lg:space-y-3">
        <Card
          title="Get started"
          description="Create your school and admin account in minutes"
          accent="indigo"
          className="lg:p-4"
        >
          <div className="rounded-[14px] border border-white/[0.14] bg-[radial-gradient(circle_at_12%_10%,rgba(96,165,250,0.24),transparent_42%),linear-gradient(180deg,rgba(10,18,35,0.72),rgba(8,14,28,0.92))] p-4 lg:p-3.5">
            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 lg:gap-3">
              <div className="min-w-0">
                <h3 className="text-[17px] sm:text-[18px] font-semibold text-white/94 tracking-tight">
                  Launch your digital school operations with confidence
                </h3>
                <p className="mt-2 text-sm lg:text-[13px] text-white/78 leading-relaxed">
                  Move from onboarding to daily operations fast with secure access and production-ready workflows for students, teachers, parents, and transport teams.
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ONBOARDING_HIGHLIGHTS.map((item) => (
                    <span
                      key={item.text}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-blue-300/25 bg-blue-500/12 px-2.5 py-1 text-[11px] font-medium text-blue-100/95"
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <HomeCTA isSignedIn={false} />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ONBOARDING_ASSURANCE.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.14] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/68"
                    >
                      <span className="text-cyan-200/90">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[12px] border border-white/[0.12] bg-[#0d162a]/72 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">Why schools choose EduHub</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {PROOF_POINTS.map((item) => (
                    <div key={item.label} className="rounded-[10px] border border-white/[0.10] bg-white/[0.03] px-2.5 py-2">
                      <p className="text-sm font-bold text-white/90">{item.value}</p>
                      <p className="mt-0.5 text-[10px] text-white/55 leading-snug">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-[10px] border border-white/[0.10] bg-white/[0.03] p-2.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Onboarding Journey</p>
                  <div className="mt-2 space-y-2">
                    {ONBOARDING_JOURNEY.map((item) => (
                      <div key={item.step} className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300/35 bg-blue-500/18 text-[9px] font-semibold text-blue-100">
                          {item.step}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-white/88">{item.title}</p>
                          <p className="text-[10px] text-white/52 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Everything you need" description="Core modules included" accent="teal" className="lg:p-4">
          <div className="mb-3 rounded-[12px] border border-white/[0.10] bg-[#0d1629]/70 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">All-in-one school suite</p>
              <span className="rounded-full border border-teal-300/30 bg-teal-400/14 px-2.5 py-1 text-[11px] font-semibold text-teal-100">
                {FEATURES.length} modules
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FEATURE_GROUPS.map((group) => (
                <span
                  key={group}
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em] ${FEATURE_GROUP_STYLES[group]}`}
                >
                  {group}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-1.5">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="group rounded-[13px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(21,34,58,0.95),rgba(11,18,33,0.96))]
                           px-3 py-3 lg:px-2.5 lg:py-2 hover:border-white/[0.22] hover:bg-[#17253d] hover:-translate-y-[1px] transition-all"
              >
                <div className="mb-1.5 inline-flex h-7 w-7 lg:h-6 lg:w-6 items-center justify-center rounded-[9px] border border-white/[0.14] bg-white/[0.06] text-base lg:text-[13px] group-hover:border-white/[0.24]">
                  {f.icon}
                </div>
                <div className="mb-1">
                  <span
                    className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.03em] ${FEATURE_GROUP_STYLES[f.group]}`}
                  >
                    {f.group}
                  </span>
                </div>
                <div
                  className="text-[13px] lg:text-[11.5px] font-semibold text-white/90 leading-snug whitespace-nowrap"
                  title={f.label}
                >
                  {f.label}
                </div>
                <div
                  className="mt-0.5 text-[11px] lg:text-[10px] text-white/55 leading-snug min-h-[28px]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={f.desc}
                >
                  {f.desc}
                </div>
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
