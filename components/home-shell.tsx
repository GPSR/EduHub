"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { SchoolSlugCheck } from "@/components/school-slug-check";
import { HomeCTA } from "@/components/home-cta";

const STORAGE_KEY = "eduhub_onboarded_v1";

const FEATURES = [
  { icon: "👥", label: "Students",    desc: "Profiles, parents, guardians"  },
  { icon: "✅", label: "Attendance",  desc: "Daily tracking & reports"       },
  { icon: "💳", label: "Fees",        desc: "Invoices & online payments"     },
  { icon: "📢", label: "Feed",        desc: "Posts, updates & announcements" },
  { icon: "📚", label: "Academics",   desc: "Classes, subjects & grades"     },
  { icon: "📊", label: "Reports",     desc: "Analytics & exports"            },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-10 w-full rounded-[13px] bg-white/[0.04] animate-pulse" />
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[13px] bg-white/[0.04] animate-pulse" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Get started" description="Create your school & admin account in minutes" accent="indigo">
          <HomeCTA isSignedIn={false} />
          <p className="mt-4 text-xs text-white/40">Free to start · No credit card required</p>
        </Card>
        <Card title="Everything you need" description="Core modules included" accent="teal">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FEATURES.map(f => (
              <div
                key={f.label}
                className="rounded-[13px] border border-white/[0.12] bg-[#101a2d]/90 px-3 py-3
                           hover:bg-[#17253d] transition-colors"
              >
                <div className="text-xl mb-1.5">{f.icon}</div>
                <div className="text-[13px] font-semibold text-white/85">{f.label}</div>
                <div className="mt-0.5 text-[11px] text-white/45 leading-snug">{f.desc}</div>
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
