import { cookies } from "next/headers";
import { SchoolSessionClaimsSchema, type SchoolSessionClaims } from "@/lib/auth-claims";
import { getExpiredSessionCookieOptions, getPrimarySessionCookieName, getReadableSessionCookieNames, getSessionCookieOptions } from "@/lib/auth-cookie";
import { hasTokenSecret, signScopedToken, verifyScopedToken } from "@/lib/auth-token";

export type Session = SchoolSessionClaims;

export async function signSessionToken(session: Session) {
  return signScopedToken("school", session, session.userId);
}

export async function createSessionCookie(session: Session) {
  const token = await signSessionToken(session);
  const cookieStore = await cookies();
  const primaryName = getPrimarySessionCookieName("school");
  cookieStore.set(primaryName, token, getSessionCookieOptions("school"));
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("school")) {
    if (name !== primaryName) cookieStore.set(name, "", clearOptions);
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames("school")) {
    cookieStore.set(name, "", clearOptions);
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = getReadableSessionCookieNames("school")
    .map((name) => cookieStore.get(name)?.value)
    .find((value): value is string => Boolean(value));
  if (!token) return null;
  if (!hasTokenSecret("school")) return null;
  return verifyScopedToken("school", token, SchoolSessionClaimsSchema);
}
