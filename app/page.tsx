import { getSession } from "@/lib/session";
import { BrandIcon } from "@/components/brand";
import { HomeShell } from "@/components/home-shell";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="min-h-dvh md:min-h-screen flex items-start lg:items-center justify-center px-4 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[1240px]">
        <header className="text-center mb-5 sm:mb-6 lg:mb-4 animate-fade-up">
          <div className="flex justify-center mb-3 lg:mb-2">
            <BrandIcon size={74} />
          </div>
          <div className="flex justify-center mb-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/95">
              Built For Modern Schools
            </span>
          </div>
          <h1 className="text-[30px] sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-white/95 leading-[1.06]">
            Grow admissions and run
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-400">
              your school from one platform
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base lg:text-[15px] text-white/60 max-w-3xl mx-auto leading-relaxed">
            EduHub helps school teams onboard faster, communicate better, and deliver a premium parent experience with real-time operations.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {[
              "Admissions to transport in one workflow",
              "Secure role-based access",
              "Web, mobile, and PWA ready",
            ].map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-white/[0.14] bg-white/[0.05] px-2.5 py-1 text-white/75"
              >
                {item}
              </span>
            ))}
          </div>
        </header>

        <div className="animate-fade-up stagger-2">
          <HomeShell isSignedIn={!!session} />
        </div>

        <p className="mt-5 text-center text-xs text-white/25 animate-fade-up stagger-4">
          EduHub · Built for school growth, trust, and daily execution
        </p>
      </div>
    </main>
  );
}
