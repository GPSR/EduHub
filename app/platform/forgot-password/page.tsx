import Link from "next/link";
import { PlatformForgotPasswordForm } from "./ui";

export default function PlatformForgotPasswordPage() {
  return (
    <main className="min-h-dvh md:min-h-screen overflow-y-auto keyboard-aware keyboard-aware-scroll flex items-start justify-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[520px] md:max-w-[860px] space-y-4 sm:space-y-5 animate-fade-up">
        <Link href="/platform/login" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/75 transition">
          ← Back to platform login
        </Link>
        <PlatformForgotPasswordForm />
      </div>
    </main>
  );
}
