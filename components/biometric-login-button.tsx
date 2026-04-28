"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { haptic, isNative } from "@/lib/native";
import {
  BIOMETRIC_PREFERENCE_CHANGED_EVENT,
  clearBiometricUnlockUntil,
  getBiometricCredentialServer,
  getBiometricPreferenceKey,
  readBiometricPreference,
  writeBiometricUnlockUntil,
} from "@/lib/biometric-preference";

type BiometricLoginButtonProps = {
  scope: "school" | "platform";
};

function biometryLabel(type: number): string {
  if (type === 2) return "Face ID";
  if (type === 1) return "Touch ID";
  if (type === 3) return "Fingerprint";
  if (type === 4) return "Face unlock";
  if (type === 5) return "Iris";
  if (type === 6) return "Biometrics";
  if (type === 7) return "device passcode";
  return "biometrics";
}

export function BiometricLoginButton({ scope }: BiometricLoginButtonProps) {
  const pathname = usePathname() || (scope === "platform" ? "/platform/login" : "/login");
  const native = useMemo(() => isNative(), []);
  const preferenceKey = useMemo(() => getBiometricPreferenceKey(pathname), [pathname]);
  const credentialServer = useMemo(() => getBiometricCredentialServer(pathname), [pathname]);
  const loginEndpoint = scope === "platform" ? "/api/biometric/platform/login" : "/api/biometric/school/login";
  const fallbackRedirect = scope === "platform" ? "/platform" : "/dashboard";

  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("biometrics");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!native) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const sync = async () => {
      const enabled = readBiometricPreference(pathname);
      if (!enabled) {
        if (!cancelled) setVisible(false);
        return;
      }

      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        const [available, saved] = await Promise.all([
          NativeBiometric.isAvailable({ useFallback: true }),
          NativeBiometric.isCredentialsSaved({ server: credentialServer }),
        ]);
        if (cancelled) return;
        setLabel(biometryLabel(available.biometryType));
        setVisible(available.isAvailable && saved.isSaved);
      } catch {
        if (!cancelled) setVisible(false);
      }
    };

    void sync();

    const onPreferenceChanged = () => void sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === preferenceKey) void sync();
    };
    window.addEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [credentialServer, native, pathname, preferenceKey]);

  if (!visible) return null;

  const onBiometricLogin = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const { AccessControl, NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const creds =
        typeof NativeBiometric.getSecureCredentials === "function"
          ? await NativeBiometric.getSecureCredentials({
              server: credentialServer,
              reason: "Sign in to EduHub",
              title: "Sign in with Face ID",
              subtitle: "Secure login",
              description: "Authenticate to continue",
              negativeButtonText: "Cancel",
            })
          : await NativeBiometric.getCredentials({ server: credentialServer });
      if (!creds?.password) {
        setMessage("Biometric sign-in is not ready yet. Please sign in with password once.");
        return;
      }

      const response = await fetch(loginEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: creds.password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; redirectTo?: string; token?: string; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "Unable to sign in with biometrics right now.");
        if (response.status === 401) {
          clearBiometricUnlockUntil(pathname);
          try {
            await NativeBiometric.deleteCredentials({ server: credentialServer });
          } catch {
            // Ignore cleanup errors.
          }
        }
        void haptic("warning");
        return;
      }

      if (payload.token) {
        await NativeBiometric.setCredentials({
          username: creds.username || "eduhub-biometric",
          password: payload.token,
          server: credentialServer,
          accessControl: AccessControl.BIOMETRY_ANY,
        });
      }

      void haptic("success");
      writeBiometricUnlockUntil(pathname, Date.now() + 15 * 60 * 1000);
      const destination = payload.redirectTo || fallbackRedirect;
      window.location.assign(destination);
    } catch {
      setMessage("Biometric authentication failed. Please try again.");
      void haptic("warning");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onBiometricLogin()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-[13px] border border-cyan-300/35 bg-cyan-500/16 px-4 py-2.5 text-sm font-semibold text-cyan-100/95 transition hover:bg-cyan-500/24 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Checking..." : `Sign in with ${label}`}
      </button>
      {message ? <p className="text-xs text-amber-200/90">{message}</p> : null}
    </div>
  );
}
