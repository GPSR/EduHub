"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { SchoolSlugCheck } from "@/components/school-slug-check";
import { HomeCTA } from "@/components/home-cta";

const STORAGE_KEY = "eduhub_onboarded_v1";

export function HomeShell({ isSignedIn }: { isSignedIn: boolean }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setOnboarded(false);
    }
  }, []);

  // Avoid a flash of the wrong screen.
  if (onboarded === null && !isSignedIn) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Getting started">
          <div className="h-10 w-44 rounded-2xl border border-white/10 bg-white/[0.04]" aria-hidden="true" />
        </Card>
        <Card title="Loading">
          <div className="h-24 rounded-3xl border border-white/10 bg-white/[0.04]" aria-hidden="true" />
        </Card>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="You’re signed in">
          <div className="text-sm text-white/70">
            Continue where you left off.{" "}
            <Link href="/dashboard" className="text-indigo-300 hover:text-indigo-200">
              Open dashboard
            </Link>
            .
          </div>
        </Card>
        <Card title="Quick links">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link href="/students" className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition">
              <div className="font-semibold">Students</div>
              <div className="mt-1 text-white/60">Profiles and contacts.</div>
            </Link>
            <Link href="/fees" className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition">
              <div className="font-semibold">Fees</div>
              <div className="mt-1 text-white/60">Invoices & payments.</div>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // New user: show only onboarding.
  if (!onboarded) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Start here" description="Create your first school and admin account">
          <HomeCTA isSignedIn={false} />
          <div className="mt-4 text-sm text-white/60">
            You only need to do this once on a new device.
          </div>
        </Card>
        <Card title="What you’ll get" description="Core modules in EduHub">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold">Students</div>
              <div className="mt-1 text-white/60">Profiles, parents, guardians.</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold">Attendance</div>
              <div className="mt-1 text-white/60">Daily tracking.</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold">Fees</div>
              <div className="mt-1 text-white/60">Invoices & payments.</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold">Announcements</div>
              <div className="mt-1 text-white/60">Posts and updates.</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Onboarded user: show only login.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Login" description="Enter your school code to continue">
        <SchoolSlugCheck />
      </Card>
      <Card title="Need another school?" description="You can onboard multiple schools on one device">
        <Link href="/onboard" className="px-5 py-3 inline-flex rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10">
          Onboard another school
        </Link>
      </Card>
    </div>
  );
}

