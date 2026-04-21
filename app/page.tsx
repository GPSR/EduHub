import Link from "next/link";
import { getSession } from "@/lib/session";
import { BrandIcon } from "@/components/brand";
import { HomeShell } from "@/components/home-shell";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">

        {/* Hero */}
        <header className="text-center mb-12 animate-fade-up">
          <div className="flex justify-center mb-6">
            <BrandIcon size={96} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white/95 leading-[1.1]">
            Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Hub</span>
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
