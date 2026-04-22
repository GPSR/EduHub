import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const PLATFORM_SESSION_COOKIE = "ssa_platform_session";

const PlatformSessionSchema = z.object({
  platformUserId: z.string(),
  role: z.enum(["SUPER_ADMIN", "SUPPORT_USER"])
});

export type PlatformSession = z.infer<typeof PlatformSessionSchema>;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function createPlatformSessionCookie(session: PlatformSession) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearPlatformSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) return null;
  if (!process.env.AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return PlatformSessionSchema.parse(payload);
  } catch {
    return null;
  }
}
