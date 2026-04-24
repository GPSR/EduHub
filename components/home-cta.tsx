"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "eduhub_onboarded_v1";
const STORAGE_SLUG_KEY = "eduhub_school_slug_v1";

export function setOnboardedFlag(schoolSlug?: string) {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
    if (schoolSlug) localStorage.setItem(STORAGE_SLUG_KEY, schoolSlug);
  } catch {
    // ignore (privacy mode)
  }
}

function getStoredSlug() {
  try {
    return localStorage.getItem(STORAGE_SLUG_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function HomeCTA({ isSignedIn }: { isSignedIn: boolean }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(STORAGE_KEY) === "1");
      setSlug(getStoredSlug());
    } catch {
      setOnboarded(false);
    }
  }, []);

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] hover:from-[#7ac0ff] hover:to-[#5a95ff] text-white shadow-[0_12px_30px_-18px_rgba(79,141,253,0.7)] transition-colors"
      >
        Open dashboard
      </Link>
    );
  }

  // Avoid flicker on first paint.
  if (onboarded === null) {
    return (
      <div className="h-[46px] w-40 rounded-2xl border border-white/10 bg-white/[0.04]" aria-hidden="true" />
    );
  }

  if (!onboarded) {
    const loginHref = slug ? `/login?schoolSlug=${encodeURIComponent(slug)}` : "/login";
    return (
      <div className="flex flex-wrap gap-3">
        <Link
          href="/onboard"
          className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] hover:from-[#7ac0ff] hover:to-[#5a95ff] text-white shadow-[0_12px_30px_-18px_rgba(79,141,253,0.7)] transition-colors"
        >
          Onboard school
        </Link>
        <Link
          href={loginHref}
          className="px-5 py-3 rounded-2xl bg-[#101a2d]/90 hover:bg-[#17253d] text-white border border-white/[0.12] transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  const loginHref = slug ? `/login?schoolSlug=${encodeURIComponent(slug)}` : "/login";

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={loginHref}
        className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] hover:from-[#7ac0ff] hover:to-[#5a95ff] text-white shadow-[0_12px_30px_-18px_rgba(79,141,253,0.7)] transition-colors"
      >
        Login
      </Link>
      <Link href="/onboard" className="px-5 py-3 rounded-2xl bg-[#101a2d]/90 hover:bg-[#17253d] text-white border border-white/[0.12] transition-colors">
        Create another school
      </Link>
    </div>
  );
}
