import { getSession } from "@/lib/session";
import { BrandIcon } from "@/components/brand";
import { HomeShell } from "@/components/home-shell";

const HERO_MARKERS = [
  "Admissions to transport in one workflow",
  "Secure role-based access for every user",
  "Web, mobile, and Android app ready",
];

const HERO_STATS = [
  { value: "14", label: "Core Modules" },
  { value: "1", label: "Unified Platform" },
  { value: "24/7", label: "Parent Visibility" },
  { value: "Role-based", label: "Secure Access" },
];

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="relative min-h-dvh md:min-h-screen flex items-start lg:items-center justify-center px-4 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-x-0 -top-24 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_62%)] pointer-events-none" />

      <div className="relative w-full max-w-[1240px]">
        <header className="text-center mb-5 sm:mb-6 lg:mb-4 animate-fade-up">
          <div className="flex justify-center mb-3 lg:mb-2.5">
            <BrandIcon size={76} />
          </div>
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/12 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-100/95">
              School onboarding in minutes
            </span>
          </div>

          <h1 className="text-[30px] sm:text-[38px] lg:text-[46px] font-extrabold tracking-tight text-white/95 leading-[1.03]">
            Build a school experience parents trust
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-400">
              and teams can run with confidence
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base lg:text-[15px] text-white/62 max-w-3xl mx-auto leading-relaxed">
            Launch admissions, attendance, fees, announcements, transport, and reporting from one modern platform designed for web, mobile, and app users.
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {HERO_MARKERS.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-white/[0.14] bg-white/[0.05] px-2.5 py-1 text-white/78"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-4xl mx-auto">
            {HERO_STATS.map((item) => (
              <div
                key={item.label}
                className="rounded-[12px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(23,38,66,0.76),rgba(10,18,33,0.86))] px-2.5 py-2.5 shadow-[0_12px_28px_-24px_rgba(79,141,253,0.75)]"
              >
                <p className="text-sm font-bold text-white/92">{item.value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/52">{item.label}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="animate-fade-up stagger-2">
          <HomeShell isSignedIn={!!session} />
        </div>

        <p className="mt-5 text-center text-xs text-white/25 animate-fade-up stagger-4">
          EduHub · Built for trust, execution, and modern school operations
        </p>
      </div>
    </main>
  );
}
