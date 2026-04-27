import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

export type AuthTokenScope = "school" | "platform";

const DEFAULT_ISSUER = "eduhub-auth";
const DEFAULT_TTL: Record<AuthTokenScope, string> = {
  school: "12h",
  platform: "12h"
};
const DEFAULT_AUDIENCE: Record<AuthTokenScope, string> = {
  school: "eduhub-school",
  platform: "eduhub-platform"
};

const warnedSecrets = new Set<string>();
const DURATION_PATTERN = /^(\d+)\s*([smhd])$/i;

function parseDurationToSeconds(raw: string) {
  const match = DURATION_PATTERN.exec(raw.trim());
  if (!match) return null;
  const amount = Number.parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "").toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 60 * 60;
  if (unit === "d") return amount * 24 * 60 * 60;
  return null;
}

function resolveTokenTtl(scope: AuthTokenScope) {
  const envValue = scope === "school" ? process.env.SCHOOL_SESSION_TTL : process.env.PLATFORM_SESSION_TTL;
  const fallback = DEFAULT_TTL[scope];
  const parsed = parseDurationToSeconds(envValue ?? "");
  if (parsed) return { raw: envValue!.trim().toLowerCase(), seconds: parsed };
  return { raw: fallback, seconds: parseDurationToSeconds(fallback) ?? 12 * 60 * 60 };
}

function resolveAudience(scope: AuthTokenScope) {
  if (scope === "school") return process.env.AUTH_AUDIENCE_SCHOOL?.trim() || DEFAULT_AUDIENCE.school;
  return process.env.AUTH_AUDIENCE_PLATFORM?.trim() || DEFAULT_AUDIENCE.platform;
}

function resolveIssuer() {
  return process.env.AUTH_TOKEN_ISSUER?.trim() || DEFAULT_ISSUER;
}

function getSecretValue(scope: AuthTokenScope) {
  if (scope === "school") return process.env.AUTH_SECRET_SCHOOL?.trim() || process.env.AUTH_SECRET?.trim() || "";
  return process.env.AUTH_SECRET_PLATFORM?.trim() || process.env.AUTH_SECRET?.trim() || "";
}

function getSecretEnvName(scope: AuthTokenScope) {
  return scope === "school" ? "AUTH_SECRET_SCHOOL/AUTH_SECRET" : "AUTH_SECRET_PLATFORM/AUTH_SECRET";
}

function validateSecret(scope: AuthTokenScope, value: string) {
  if (!value) return false;
  if (value.length >= 32) return true;

  const warningKey = `${scope}:${value.length}`;
  const message = `Auth secret for ${scope} tokens must be at least 32 characters: ${getSecretEnvName(scope)}.`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  if (!warnedSecrets.has(warningKey)) {
    warnedSecrets.add(warningKey);
    console.warn(message);
  }
  return true;
}

function getSecretKey(scope: AuthTokenScope) {
  const secret = getSecretValue(scope);
  if (!validateSecret(scope, secret)) {
    throw new Error(`Missing auth secret for ${scope} tokens.`);
  }
  return new TextEncoder().encode(secret);
}

function randomJti() {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function hasTokenSecret(scope: AuthTokenScope) {
  try {
    const secret = getSecretValue(scope);
    if (!secret) return false;
    validateSecret(scope, secret);
    return true;
  } catch {
    return false;
  }
}

export function getTokenTtlSeconds(scope: AuthTokenScope) {
  return resolveTokenTtl(scope).seconds;
}

export async function signScopedToken(
  scope: AuthTokenScope,
  claims: Record<string, unknown>,
  subject: string
) {
  const ttl = resolveTokenTtl(scope);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(resolveIssuer())
    .setAudience(resolveAudience(scope))
    .setSubject(subject)
    .setJti(randomJti())
    .setIssuedAt()
    .setExpirationTime(ttl.raw)
    .sign(getSecretKey(scope));
}

export async function verifyScopedToken<T>(
  scope: AuthTokenScope,
  token: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  if (!hasTokenSecret(scope)) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(scope), {
      algorithms: ["HS256"],
      issuer: resolveIssuer(),
      audience: resolveAudience(scope)
    });
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
