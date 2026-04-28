import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { KnownSchoolRoleKeySchema, PlatformSessionClaimsSchema, SchoolSessionClaimsSchema, type KnownSchoolRoleKey } from "@/lib/auth-claims";
import { hostWithoutPort, isPlatformHost } from "@/lib/app-env";
import { getExpiredSessionCookieOptions, getReadableSessionCookieNames } from "@/lib/auth-cookie";
import { verifyScopedToken } from "@/lib/auth-token";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/onboard",
  "/accept-invite",
  "/platform/login",
  "/platform/forgot-password",
  "/platform/onboard"
]);

const ROLE_SECURITY_LEVEL: Record<KnownSchoolRoleKey, number> = {
  ADMIN: 100,
  PRINCIPAL: 75,
  HEAD_MASTER: 70,
  CORRESPONDENT: 65,
  CLASS_TEACHER: 60,
  TEACHER: 50,
  PARENT: 40,
  BUS_ASSISTANT: 35
};

const MIN_SECURITY_ROUTES: Array<{ prefix: string; level: number }> = [
  { prefix: "/dashboard", level: 100 },
  { prefix: "/admin/users", level: 100 },
  { prefix: "/admin/settings", level: 100 },
  { prefix: "/admin/teacher-salary", level: 100 },
  { prefix: "/admin/approvals", level: 75 },
  { prefix: "/admin/audit", level: 75 }
];

const PARENT_ONLY_ROUTES = ["/requests/student-profile"];

const BASE_SECURITY_HEADERS: Array<[string, string]> = [
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-site"],
  ["X-DNS-Prefetch-Control", "off"],
  ["Origin-Agent-Cluster", "?1"],
  ["Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"],
];

function isSecureRequest(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return req.nextUrl.protocol === "https:" || forwardedProto === "https";
}

function withSecurityHeaders(req: NextRequest, res: NextResponse) {
  for (const [key, value] of BASE_SECURITY_HEADERS) {
    res.headers.set(key, value);
  }

  if (isSecureRequest(req)) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

function readCookie(req: NextRequest, names: string[]) {
  for (const name of names) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }
  return null;
}

function redirectToAuth(req: NextRequest, loginPath: "/login" | "/platform/login", scope: "school" | "platform") {
  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (nextPath && nextPath !== loginPath) {
    url.searchParams.set("next", nextPath);
  }
  const response = NextResponse.redirect(url);
  const clearOptions = getExpiredSessionCookieOptions();
  for (const name of getReadableSessionCookieNames(scope)) {
    response.cookies.set(name, "", clearOptions);
  }
  return withSecurityHeaders(req, response);
}

function fallbackPathForRole(roleKey: string) {
  return roleKey === "ADMIN" ? "/dashboard" : "/home";
}

export function middleware(req: NextRequest) {
  return (async () => {
  const { pathname } = req.nextUrl;
  const host = hostWithoutPort(req.headers.get("host") ?? "");

  if (isPlatformHost(host)) {
    const url = req.nextUrl.clone();
    if (pathname === "/") {
      url.pathname = "/platform";
      return NextResponse.redirect(url);
    }
    if (pathname === "/login") {
      url.pathname = "/platform/login";
      return NextResponse.redirect(url);
    }
    if (pathname === "/onboard") {
      url.pathname = "/platform/onboard";
      return NextResponse.redirect(url);
    }
    if (pathname === "/forgot-password") {
      url.pathname = "/platform/forgot-password";
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/platform")) {
    if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
    const token = readCookie(req, getReadableSessionCookieNames("platform"));
    if (!token) {
      return redirectToAuth(req, "/platform/login", "platform");
    }
    const platformSession = await verifyScopedToken("platform", token, PlatformSessionClaimsSchema);
    if (!platformSession) {
      return redirectToAuth(req, "/platform/login", "platform");
    }
    return NextResponse.next();
  }
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  const token = readCookie(req, getReadableSessionCookieNames("school"));
  if (!token) {
    return redirectToAuth(req, "/login", "school");
  }
  const schoolSession = await verifyScopedToken("school", token, SchoolSessionClaimsSchema);
  if (!schoolSession) {
    return redirectToAuth(req, "/login", "school");
  }

  if (
    PARENT_ONLY_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) &&
    schoolSession.roleKey !== "PARENT"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = fallbackPathForRole(schoolSession.roleKey);
    return NextResponse.redirect(url);
  }

  const rule = MIN_SECURITY_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  const knownRole = KnownSchoolRoleKeySchema.safeParse(schoolSession.roleKey);
  const roleLevel = knownRole.success ? ROLE_SECURITY_LEVEL[knownRole.data] : 0;
  if (rule && roleLevel < rule.level) {
    const url = req.nextUrl.clone();
    url.pathname = fallbackPathForRole(schoolSession.roleKey);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
  })().then((response) => withSecurityHeaders(req, response));
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
