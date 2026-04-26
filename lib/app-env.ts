export type DeploymentEnv = "stage" | "production";

const SCHOOLS_URL_BY_ENV: Record<DeploymentEnv, string> = {
  // Current staging DNS uses "stgae". Keep this default until infra is renamed.
  stage: "https://stgae.schools.softlanetech.com",
  production: "https://schools.softlanetech.com",
};

const PLATFORM_URL_BY_ENV: Record<DeploymentEnv, string> = {
  // Current staging DNS uses "stgae". Keep this default until infra is renamed.
  stage: "https://stgae.platform.softlanetech.com",
  production: "https://platform.softlanetech.com",
};

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

export function normalizeDeploymentEnv(raw?: string | null): DeploymentEnv {
  const value = String(raw ?? "").trim().toLowerCase();
  // "int"/"integration" now map to stage to avoid NXDOMAIN host usage.
  if (value === "int" || value === "integration") return "stage";
  // Keep accepting the legacy misspelling "stgae" to avoid breaking existing env files.
  if (value === "stage" || value === "staging" || value === "stgae") return "stage";
  return "production";
}

export function resolveDeploymentEnv(raw?: string | null): DeploymentEnv {
  return normalizeDeploymentEnv(raw ?? process.env.APP_ENV ?? process.env.DEPLOY_ENV);
}

export function hostWithoutPort(host: string) {
  return host.replace(/:\d+$/, "").toLowerCase();
}

export function isPlatformHost(host: string) {
  const normalized = hostWithoutPort(host);
  return normalized.startsWith("platform.") || normalized.includes(".platform.");
}

export function resolveSchoolAppBaseUrl() {
  const envUrl =
    process.env.SCHOOL_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SCHOOL_APP_BASE_URL?.trim();
  if (envUrl) return trimTrailingSlashes(envUrl);
  return SCHOOLS_URL_BY_ENV[resolveDeploymentEnv()];
}

export function resolvePlatformAppBaseUrl() {
  const envUrl =
    process.env.PLATFORM_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_PLATFORM_APP_BASE_URL?.trim();
  if (envUrl) return trimTrailingSlashes(envUrl);
  return PLATFORM_URL_BY_ENV[resolveDeploymentEnv()];
}
