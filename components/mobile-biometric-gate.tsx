"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BiometricAuthError,
  BiometryType,
  NativeBiometric,
} from "@capgo/capacitor-native-biometric";
import { haptic, isNative } from "@/lib/native";
import {
  BIOMETRIC_PREFERENCE_CHANGED_EVENT,
  clearBiometricUnlockUntil,
  getBiometricPreferenceKey,
  readBiometricUnlockUntil,
  readBiometricPreference,
  writeBiometricUnlockUntil,
} from "@/lib/biometric-preference";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/onboard",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/offline",
  "/logout",
  "/platform/login",
  "/platform/onboard",
  "/platform/forgot-password",
  "/platform/logout",
]);

function routeNeedsBiometric(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return false;
  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(`${path}/`)) return false;
  }
  return true;
}

function biometryLabel(type: BiometryType): string {
  switch (type) {
    case BiometryType.FACE_ID:
      return "Face ID";
    case BiometryType.TOUCH_ID:
      return "Touch ID";
    case BiometryType.FINGERPRINT:
      return "Fingerprint";
    case BiometryType.FACE_AUTHENTICATION:
      return "Face unlock";
    case BiometryType.IRIS_AUTHENTICATION:
      return "Iris";
    default:
      return "biometrics";
  }
}

export function MobileBiometricGate() {
  const pathname = usePathname() || "/";
  const native = useMemo(() => isNative(), []);
  const preferenceKey = useMemo(() => getBiometricPreferenceKey(pathname), [pathname]);
  const passwordLogoutAction = pathname.startsWith("/platform") ? "/platform/logout" : "/logout";
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const shouldProtectRoute = native && biometricEnabled && routeNeedsBiometric(pathname);

  const inFlightRef = useRef(false);
  const unlockedRef = useRef(false);
  const lastUnlockAtRef = useRef(0);
  const sessionUnlockUntilRef = useRef(0);
  const foregroundGraceUntilRef = useRef(0);
  const backgroundedAtRef = useRef(0);
  const lastForegroundEventAtRef = useRef(0);

  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockLabel, setUnlockLabel] = useState("biometrics");
  const FOREGROUND_REAUTH_GRACE_MS = 5000;
  const SESSION_UNLOCK_TTL_MS = 15 * 60 * 1000;
  const FOREGROUND_EVENT_DEBOUNCE_MS = 1200;
  const MIN_BACKGROUND_REAUTH_MS = 10000;

  const markUnlocked = useCallback(() => {
    const now = Date.now();
    const unlockUntil = now + SESSION_UNLOCK_TTL_MS;
    unlockedRef.current = true;
    lastUnlockAtRef.current = now;
    sessionUnlockUntilRef.current = unlockUntil;
    foregroundGraceUntilRef.current = now + FOREGROUND_REAUTH_GRACE_MS;
    writeBiometricUnlockUntil(pathname, unlockUntil);
    setLocked(false);
    setErrorMessage(null);
  }, [pathname]);

  useEffect(() => {
    if (!native) {
      setBiometricEnabled(false);
      return;
    }

    const syncPreference = () => setBiometricEnabled(readBiometricPreference(pathname));
    syncPreference();

    const onPreferenceChanged = () => syncPreference();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === preferenceKey) syncPreference();
    };

    window.addEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [native, pathname, preferenceKey]);

  const promptUnlock = useCallback(async () => {
    if (!shouldProtectRoute || inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setLocked(true);
    setErrorMessage(null);

    try {
      const check = await NativeBiometric.isAvailable({ useFallback: true });
      setUnlockLabel(biometryLabel(check.biometryType));

      if (!check.isAvailable) {
        // No biometrics and no secure device credential; do not trap the user.
        markUnlocked();
        return;
      }

      await Promise.race([
        NativeBiometric.verifyIdentity({
          reason: "Unlock EduHub",
          title: "Unlock EduHub",
          subtitle: "Secure access",
          description: "Confirm your identity to continue",
          negativeButtonText: "Cancel",
          useFallback: true,
          fallbackTitle: "Use passcode",
          maxAttempts: 5,
        }),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("BIOMETRIC_TIMEOUT")), 25000);
        }),
      ]);

      markUnlocked();
      void haptic("success");
    } catch (error) {
      if (error instanceof Error && error.message === "BIOMETRIC_TIMEOUT") {
        setErrorMessage("Face ID took too long. Tap unlock to try again.");
        setLocked(true);
        unlockedRef.current = false;
        return;
      }

      const code =
        typeof error === "object" && error && "code" in error
          ? Number((error as { code?: unknown }).code)
          : BiometricAuthError.UNKNOWN_ERROR;

      if (!Number.isNaN(code)) {
        if (
          code === BiometricAuthError.BIOMETRICS_UNAVAILABLE ||
          code === BiometricAuthError.BIOMETRICS_NOT_ENROLLED ||
          code === BiometricAuthError.PASSCODE_NOT_SET
        ) {
          // Device cannot authenticate yet; allow access instead of hard lock.
          markUnlocked();
          return;
        }

        if (
          code === BiometricAuthError.USER_CANCEL ||
          code === BiometricAuthError.SYSTEM_CANCEL ||
          code === BiometricAuthError.APP_CANCEL
        ) {
          setErrorMessage("Authentication canceled. Tap unlock to try again.");
        } else if (code === BiometricAuthError.AUTHENTICATION_FAILED) {
          setErrorMessage("Authentication failed. Please try again.");
        } else {
          setErrorMessage("Unable to verify identity right now. Try again.");
        }
      } else {
        setErrorMessage("Unable to verify identity right now. Try again.");
      }

      void haptic("warning");
      setLocked(true);
      unlockedRef.current = false;
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [markUnlocked, shouldProtectRoute]);

  useEffect(() => {
    if (!shouldProtectRoute) return;
    let cancelled = false;
    void (async () => {
      try {
        const check = await NativeBiometric.isAvailable({ useFallback: true });
        if (!cancelled) setUnlockLabel(biometryLabel(check.biometryType));
      } catch {
        if (!cancelled) setUnlockLabel("Face ID");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldProtectRoute]);

  useEffect(() => {
    if (!shouldProtectRoute) {
      setLocked(false);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    const now = Date.now();
    const persistedUnlockUntil = readBiometricUnlockUntil(pathname);
    if (persistedUnlockUntil > now) {
      unlockedRef.current = true;
      lastUnlockAtRef.current = now;
      sessionUnlockUntilRef.current = persistedUnlockUntil;
      foregroundGraceUntilRef.current = now + FOREGROUND_REAUTH_GRACE_MS;
      setLocked(false);
      setLoading(false);
      setErrorMessage(null);
      return;
    }
    if (persistedUnlockUntil > 0) {
      clearBiometricUnlockUntil(pathname);
    }

    if (unlockedRef.current && Date.now() < sessionUnlockUntilRef.current) {
      setLocked(false);
      return;
    }

    unlockedRef.current = false;
    sessionUnlockUntilRef.current = 0;
    clearBiometricUnlockUntil(pathname);
    setLocked(true);
    setLoading(false);
    setErrorMessage(null);
  }, [pathname, shouldProtectRoute]);

  useEffect(() => {
    if (!native) return;

    const onAppStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isActive?: boolean }>).detail;
      if (detail?.isActive === false) {
        backgroundedAtRef.current = Date.now();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        backgroundedAtRef.current = Date.now();
      }
    };

    window.addEventListener("app-state-change", onAppStateChange as EventListener);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("app-state-change", onAppStateChange as EventListener);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [native]);

  useEffect(() => {
    if (!native) return;

    const onForeground = () => {
      if (!biometricEnabled) return;
      if (!routeNeedsBiometric(window.location.pathname)) return;
      if (inFlightRef.current) return;

      const now = Date.now();
      if (now - lastForegroundEventAtRef.current < FOREGROUND_EVENT_DEBOUNCE_MS) return;
      lastForegroundEventAtRef.current = now;

      if (now < foregroundGraceUntilRef.current) return;
      if (unlockedRef.current && now - lastUnlockAtRef.current < FOREGROUND_REAUTH_GRACE_MS) return;
      if (unlockedRef.current && backgroundedAtRef.current > 0 && now - backgroundedAtRef.current < MIN_BACKGROUND_REAUTH_MS) return;
      if (unlockedRef.current && now < sessionUnlockUntilRef.current) return;

      unlockedRef.current = false;
      sessionUnlockUntilRef.current = 0;
      clearBiometricUnlockUntil(window.location.pathname);
      setLocked(true);
      setLoading(false);
      setErrorMessage(null);
    };

    window.addEventListener("app-foreground", onForeground);
    return () => window.removeEventListener("app-foreground", onForeground);
  }, [biometricEnabled, native]);

  if (!shouldProtectRoute || !locked) return null;

  const faceButtonLabel = loading ? "Checking..." : unlockLabel;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#040915]/92 backdrop-blur-md px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(10,16,29,0.98))] p-6 text-center shadow-[0_24px_70px_-30px_rgba(0,0,0,0.95)]">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] bg-cyan-500/18 text-[30px]">
          🛡️
        </div>
        <h2 className="text-[18px] font-semibold text-white/96">Unlock EduHub</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
          Choose {unlockLabel} or Password to continue.
        </p>
        {errorMessage ? <p className="mt-3 text-[12px] text-amber-200/90">{errorMessage}</p> : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void promptUnlock()}
            className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-white/[0.15] bg-white/[0.04] px-3 py-4 text-white transition hover:bg-white/[0.09] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-500/20 text-[24px]">🧬</span>
            <span className="text-sm font-semibold">{faceButtonLabel}</span>
          </button>

          <form action={passwordLogoutAction} method="post" className="w-full">
            <button
              type="submit"
              className="w-full flex flex-col items-center justify-center gap-2 rounded-[16px] border border-white/[0.15] bg-white/[0.04] px-3 py-4 text-white transition hover:bg-white/[0.09]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-500/20 text-[24px]">🔐</span>
              <span className="text-sm font-semibold">Password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
