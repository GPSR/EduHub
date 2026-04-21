import Link from "next/link";
import { getSession } from "@/lib/session";
import { BrandIcon } from "@/components/brand";
import { HomeShell } from "@/components/home-shell";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center">
          <div className="flex justify-center">
            <BrandIcon size={120} />
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight">EduHub</h1>
          <p className="mt-2 text-white/70">
            A mobile-first platform for students, fees, attendance, and announcements.
          </p>
        </header>

        <HomeShell isSignedIn={!!session} />
      </div>
    </main>
  );
}
