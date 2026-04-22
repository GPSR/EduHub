import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/onboard",
  "/accept-invite",
  "/platform/login",
  "/platform/onboard"
]);

export function middleware(req: NextRequest) {
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
