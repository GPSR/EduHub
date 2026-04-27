import type { AuthTokenScope } from "@/lib/auth-token";
import { getTokenTtlSeconds } from "@/lib/auth-token";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function getPrimarySessionCookieName(scope: AuthTokenScope) {
  if (scope === "school") {
    return isProd() ? "__Host-ssa_session" : "ssa_session";
  }
  return isProd() ? "__Host-ssa_platform_session" : "ssa_platform_session";
}

export function getReadableSessionCookieNames(scope: AuthTokenScope) {
  const primary = getPrimarySessionCookieName(scope);
  if (scope === "school") {
    return unique([primary, "ssa_session", "__Host-ssa_session"]);
  }
  return unique([primary, "ssa_platform_session", "__Host-ssa_platform_session"]);
}

export function getSessionCookieOptions(scope: AuthTokenScope) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProd(),
    path: "/",
    maxAge: getTokenTtlSeconds(scope),
    priority: "high" as const
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProd(),
    path: "/",
    expires: new Date(0),
    priority: "high" as const
  };
}
