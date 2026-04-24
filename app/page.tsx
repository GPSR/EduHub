import Link from "next/link";
import { getSession } from "@/lib/session";
import { BrandIcon } from "@/components/brand";
import { HomeShell } from "@/components/home-shell";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="min-h-dvh md:min-h-screen flex items-start md:items-center justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-4xl">

        {/* Hero */}
        <header className="text-center mb-8 sm:mb-8 sm:mb-12 animate-fade-up">
          <div className="flex justify-center mb-6">
            <BrandIcon size={96} />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white/95 leading-[1.1]">
            Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">Hub</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/55 max-w-md mx-auto leading-relaxed">
            A modern school management platform for students, fees, attendance, and communication.
          </p>
        </header>

        {/* Cards */}
        <div className="animate-fade-up stagger-2">
          <HomeShell isSignedIn={!!session} />
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-white/25 animate-fade-up stagger-4">
          EduHub · Secure, mobile-first school management
        </p>
      </div>
    </main>
  );
}
