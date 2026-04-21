import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const SESSION_COOKIE = "ssa_session";

const SessionSchema = z.object({
  userId: z.string(),
  schoolId: z.string(),
  roleId: z.string(),
  roleKey: z.string()
});

export type Session = z.infer<typeof SessionSchema>;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function createSessionCookie(session: Session) {
  const token = await signSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return SessionSchema.parse(payload);
  } catch {
    return null;
  }
}
