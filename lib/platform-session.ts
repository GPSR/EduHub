import { cookies } from "next/headers";
import { PlatformSessionClaimsSchema, type PlatformSessionClaims } from "@/lib/auth-claims";
import { getExpiredSessionCookieOptions, getPrimarySessionCookieName, getReadableSessionCookieNames, getSessionCookieOptions } from "@/lib/auth-cookie";
import { hasTokenSecret, signScopedToken, verifyScopedToken } from "@/lib/auth-token";

export type PlatformSession = PlatformSessionClaims;

export async function createPlatformSessionCookie(session: PlatformSession) {
  const token = await signScopedToken("platform", session, session.platformUserId);
  const cookieStore = await cookies();
  const primaryName = getPrimarySessionCookieName("platform");
  cookieStore.set(primaryName, token, getSessionCookieOptions("platform"));
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("platform")) {
    if (name !== primaryName) cookieStore.set(name, "", clearOptions);
  }
}

export async function clearPlatformSessionCookie() {
  const cookieStore = await cookies();
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("platform")) {
    cookieStore.set(name, "", clearOptions);
  }
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const cookieStore = await cookies();
  const token = getReadableSessionCookieNames("platform")
    .map((name) => cookieStore.get(name)?.value)
    .find((value): value is string => Boolean(value));
  if (!token) return null;
  if (!hasTokenSecret("platform")) return null;
  return verifyScopedToken("platform", token, PlatformSessionClaimsSchema);
}
