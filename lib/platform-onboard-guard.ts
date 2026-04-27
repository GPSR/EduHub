import { secureTokenEquals } from "@/lib/token";

const MIN_SETUP_KEY_LENGTH = 16;

function readConfiguredSetupKey() {
  return process.env.PLATFORM_ONBOARD_SECRET?.trim() ?? "";
}

export function platformOnboardNeedsSetupKey() {
  const configured = readConfiguredSetupKey();
  if (configured.length >= MIN_SETUP_KEY_LENGTH) return true;
  return process.env.NODE_ENV === "production";
}

export function platformOnboardReady() {
  const configured = readConfiguredSetupKey();
  if (configured.length >= MIN_SETUP_KEY_LENGTH) return true;
  return process.env.NODE_ENV !== "production";
}

export function verifyPlatformOnboardSetupKey(candidate: string) {
  const configured = readConfiguredSetupKey();
  if (configured.length < MIN_SETUP_KEY_LENGTH) {
    return process.env.NODE_ENV !== "production";
  }
  return secureTokenEquals(candidate.trim(), configured);
}
