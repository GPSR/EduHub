import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/onboard",
  "/accept-invite",
  "/platform/login",
  "/platform/onboard"
]);

type SchoolRoleKey =
  | "ADMIN"
  | "HEAD_MASTER"
  | "PRINCIPAL"
  | "CLASS_TEACHER"
  | "TEACHER"
  | "PARENT"
  | "BUS_ASSISTANT"
  | "CORRESPONDENT";

const ROLE_RULES: Array<{ prefix: string; allow: SchoolRoleKey[] }> = [
  { prefix: "/dashboard", allow: ["ADMIN"] },
  { prefix: "/admin/users", allow: ["ADMIN"] },
  { prefix: "/admin/settings", allow: ["ADMIN"] },
  { prefix: "/admin/approvals", allow: ["ADMIN", "PRINCIPAL"] },
  { prefix: "/admin/audit", allow: ["ADMIN", "PRINCIPAL"] },
  { prefix: "/requests/student-profile", allow: ["PARENT"] }
];

async function getSchoolRoleFromToken(token: string): Promise<SchoolRoleKey | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const roleKey = String(payload.roleKey ?? "");
    if (
      roleKey === "ADMIN" ||
      roleKey === "HEAD_MASTER" ||
      roleKey === "PRINCIPAL" ||
      roleKey === "CLASS_TEACHER" ||
      roleKey === "TEACHER" ||
      roleKey === "PARENT" ||
      roleKey === "BUS_ASSISTANT" ||
      roleKey === "CORRESPONDENT"
    ) {
      return roleKey;
    }
    return null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  return (async () => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host")?.toLowerCase() ?? "";

  if (host.startsWith("platform.")) {
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
    const token = req.cookies.get("ssa_platform_session")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/platform/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  const token = req.cookies.get("ssa_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const roleKey = await getSchoolRoleFromToken(token);
  if (roleKey) {
    const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
    if (rule && !rule.allow.includes(roleKey)) {
      const url = req.nextUrl.clone();
      url.pathname = roleKey === "PARENT" ? "/students" : "/feed";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
  })();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
