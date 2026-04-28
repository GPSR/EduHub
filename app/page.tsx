import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { resolveActiveSchoolSession } from "@/lib/auth-session";
import { ProductHomePage } from "@/components/product-home-page";

export default async function HomePage() {
  const session = await resolveActiveSchoolSession(await getSession());
  const user = session
    ? await db.user.findUnique({
      where: { id: session.userId },
      select: { name: true }
    })
    : null;

  return <ProductHomePage isSignedIn={Boolean(session)} userName={user?.name ?? null} />;
}
