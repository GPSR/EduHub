import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resolveActiveSchoolSession } from "@/lib/auth-session";
import { ProductHomePage } from "@/components/product-home-page";
import { HomeShell } from "@/components/home-shell";
import { headers } from "next/headers";

function shouldUseLegacyMobileHome(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile|iemobile|opera mini|capacitor|cordova|ionic/i.test(userAgent);
}

export default async function HomePage() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const session = await resolveActiveSchoolSession(await getSession());
  const user = session
    ? await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true }
    })
    : null;

  if (shouldUseLegacyMobileHome(userAgent)) {
    return (
      <main className="relative min-h-dvh md:min-h-screen flex items-start justify-center px-3 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="absolute inset-x-0 -top-24 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_62%)] pointer-events-none" />

        <div className="relative w-full max-w-[520px] md:max-w-[920px]">
          <div className="animate-fade-up stagger-2">
            <HomeShell isSignedIn={Boolean(session)} userName={user?.name ?? null} />
          </div>
        </div>
      </main>
    );
  }

  return <ProductHomePage isSignedIn={Boolean(session)} userName={user?.name ?? null} />;
}
