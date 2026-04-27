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
  getBiometricPreferenceKey,
  readBiometricPreference,
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
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const shouldProtectRoute = native && biometricEnabled && routeNeedsBiometric(pathname);

  const inFlightRef = useRef(false);
  const unlockedRef = useRef(false);

  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockLabel, setUnlockLabel] = useState("biometrics");

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
        setLocked(false);
        unlockedRef.current = true;
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: "Unlock EduHub",
        title: "Unlock EduHub",
        subtitle: "Secure access",
        description: "Confirm your identity to continue",
        negativeButtonText: "Cancel",
        useFallback: true,
        fallbackTitle: "Use passcode",
        maxAttempts: 5,
      });

      unlockedRef.current = true;
      setLocked(false);
      void haptic("success");
    } catch (error) {
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
          unlockedRef.current = true;
          setLocked(false);
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
  }, [shouldProtectRoute]);

  useEffect(() => {
    if (!shouldProtectRoute) {
      setLocked(false);
      setLoading(false);
      setErrorMessage(null);
      unlockedRef.current = false;
      return;
    }

    if (unlockedRef.current) return;
    void promptUnlock();
  }, [promptUnlock, shouldProtectRoute]);

  useEffect(() => {
    if (!native) return;

    const onForeground = () => {
      if (!biometricEnabled) return;
      if (!routeNeedsBiometric(window.location.pathname)) return;
      unlockedRef.current = false;
      setLocked(true);
      void promptUnlock();
    };

    window.addEventListener("app-foreground", onForeground);
    return () => window.removeEventListener("app-foreground", onForeground);
  }, [biometricEnabled, native, promptUnlock]);

  if (!shouldProtectRoute || !locked) return null;

  const buttonLabel = loading ? "Checking..." : `Unlock with ${unlockLabel}`;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#040915]/92 backdrop-blur-md px-4">
      <div className="w-full max-w-[360px] rounded-[20px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(10,16,29,0.98))] p-5 text-center shadow-[0_24px_70px_-30px_rgba(0,0,0,0.95)]">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px] bg-cyan-500/18 text-[24px]">
          🔐
        </div>
        <h2 className="text-[18px] font-semibold text-white/96">Unlock EduHub</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
          Use {unlockLabel} or your device passcode to continue.
        </p>
        {errorMessage ? <p className="mt-3 text-[12px] text-amber-200/90">{errorMessage}</p> : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void promptUnlock()}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[13px] px-4 py-2.5 text-sm font-semibold text-white
                     bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] shadow-[0_10px_28px_-12px_rgba(79,141,253,0.82)]
                     transition-colors hover:from-[#7ac0ff] hover:to-[#5a95ff] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
