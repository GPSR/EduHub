export const BIOMETRIC_PREFERENCE_CHANGED_EVENT = "eduhub:biometric-preference-changed";

const SCHOOL_BIOMETRIC_KEY = "eduhub_biometric_lock_school_v1";
const PLATFORM_BIOMETRIC_KEY = "eduhub_biometric_lock_platform_v1";
const SCHOOL_BIOMETRIC_CREDENTIAL_SERVER = "eduhub.school.biometric.v1";
const PLATFORM_BIOMETRIC_CREDENTIAL_SERVER = "eduhub.platform.biometric.v1";

export function isPlatformPathname(pathname: string): boolean {
  return pathname.startsWith("/platform");
}

export function getBiometricPreferenceKey(pathname: string): string {
  return isPlatformPathname(pathname) ? PLATFORM_BIOMETRIC_KEY : SCHOOL_BIOMETRIC_KEY;
}

export function getBiometricCredentialServer(pathname: string): string {
  return isPlatformPathname(pathname) ? PLATFORM_BIOMETRIC_CREDENTIAL_SERVER : SCHOOL_BIOMETRIC_CREDENTIAL_SERVER;
}

export function readBiometricPreference(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(getBiometricPreferenceKey(pathname)) === "1";
  } catch {
    return false;
  }
}

export function writeBiometricPreference(pathname: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  const key = getBiometricPreferenceKey(pathname);
  try {
    localStorage.setItem(key, enabled ? "1" : "0");
  } catch {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(BIOMETRIC_PREFERENCE_CHANGED_EVENT, {
      detail: { key, enabled },
    })
  );
}
