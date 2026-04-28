import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { resolveActiveSchoolSession } from "@/lib/auth-session";
import { ProductHomePage } from "@/components/product-home-page";
import { headers } from "next/headers";
import { getDefaultSchoolHomePath } from "@/lib/default-school-home";

export default async function HomePage() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const isNativeShell = /capacitor/i.test(userAgent);
  const session = await resolveActiveSchoolSession(await getSession());
  const defaultHomeHref = session ? getDefaultSchoolHomePath(session.roleKey) : "/dashboard";
  const user = session
    ? await db.user.findUnique({
      where: { id: session.userId },
      select: { name: true }
    })
    : null;

  return (
    <ProductHomePage
      isSignedIn={Boolean(session)}
      userName={user?.name ?? null}
      forceMobileAppLayout={isNativeShell}
      defaultHomeHref={defaultHomeHref}
    />
  );
}
