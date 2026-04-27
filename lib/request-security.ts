import { hostWithoutPort } from "@/lib/app-env";

function getRequestHost(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;
  return hostWithoutPort(host);
}

export function isJsonRequest(req: Request) {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json");
}

// Best-effort same-origin check for state-changing requests.
// If browser security headers are unavailable, we avoid hard-failing legitimate native clients.
export function isTrustedMutationRequest(req: Request) {
  const reqHost = getRequestHost(req);

  const origin = req.headers.get("origin");
  if (origin) {
    if (origin === "null") return false;
    if (!reqHost) return true;
    try {
      const originUrl = new URL(origin);
      const originHost = hostWithoutPort(originUrl.host);
      return originHost === reqHost;
    } catch {
      return false;
    }
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (!secFetchSite) return true;

  return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";
}

