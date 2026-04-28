import { hostWithoutPort } from "@/lib/app-env";

function getRequestHost(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;
  return hostWithoutPort(host);
}

const NATIVE_ORIGIN_PROTOCOLS = new Set(["capacitor:", "ionic:", "app:", "file:"]);

function isLikelyNativeClient(req: Request) {
  const userAgent = req.headers.get("user-agent")?.toLowerCase() ?? "";
  if (userAgent.includes("capacitor")) return true;
  if (req.headers.has("x-capacitor-platform")) return true;
  if (req.headers.has("x-capacitor-app")) return true;
  return false;
}

function isNativeAppOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return NATIVE_ORIGIN_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function isJsonRequest(req: Request) {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json");
}

type TrustedMutationRequestOptions = {
  allowNativeAppOrigin?: boolean;
};

// Best-effort same-origin check for state-changing requests.
// If browser security headers are unavailable, we avoid hard-failing legitimate native clients.
export function isTrustedMutationRequest(req: Request, options: TrustedMutationRequestOptions = {}) {
  const allowNative = options.allowNativeAppOrigin === true;
  const reqHost = getRequestHost(req);

  const origin = req.headers.get("origin");
  if (origin) {
    if (origin === "null") {
      if (allowNative && isLikelyNativeClient(req)) return true;
      return false;
    }
    if (!reqHost) return true;
    try {
      const originUrl = new URL(origin);
      const originHost = hostWithoutPort(originUrl.host);
      if (originHost === reqHost) return true;
      if (allowNative && isNativeAppOrigin(origin)) return true;
      return false;
    } catch {
      return false;
    }
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (!secFetchSite) return true;

  return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";
}
