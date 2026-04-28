"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui";
import { haptic, isNative } from "@/lib/native";
import {
  BIOMETRIC_PREFERENCE_CHANGED_EVENT,
  getBiometricCredentialServer,
  getBiometricPreferenceKey,
  isPlatformPathname,
  readBiometricPreference,
  writeBiometricPreference,
} from "@/lib/biometric-preference";

export function BiometricLockSettings() {
  const pathname = usePathname() || "/";
  const native = useMemo(() => isNative(), []);
  const preferenceKey = useMemo(() => getBiometricPreferenceKey(pathname), [pathname]);
  const credentialServer = useMemo(() => getBiometricCredentialServer(pathname), [pathname]);
  const credentialEndpoint = useMemo(
    () => (isPlatformPathname(pathname) ? "/api/biometric/platform/credential" : "/api/biometric/school/credential"),
    [pathname]
  );

  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!native) {
      setEnabled(false);
      return;
    }

    const syncPreference = () => setEnabled(readBiometricPreference(pathname));
    syncPreference();

    const onPreferenceChanged = () => syncPreference();
    const onStorage = (event: StorageEvent) => {
      if (event.key === preferenceKey) syncPreference();
    };

    window.addEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [native, pathname, preferenceKey]);

  const toggleBiometricLock = async () => {
    if (!native || busy) return;
    const nextEnabled = !enabled;

    if (!nextEnabled) {
      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        await NativeBiometric.deleteCredentials({ server: credentialServer });
      } catch {
        // Ignore native storage deletion errors during disable.
      }
      writeBiometricPreference(pathname, false);
      setEnabled(false);
      void haptic("light");
      return;
    }

    setBusy(true);
    try {
      const { AccessControl, NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const check = await NativeBiometric.isAvailable({ useFallback: true });

      if (!check.isAvailable) {
        setEnabled(false);
        return;
      }

      const response = await fetch(credentialEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; token?: string; message?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.token) {
        writeBiometricPreference(pathname, false);
        setEnabled(false);
        void haptic("warning");
        return;
      }

      await NativeBiometric.setCredentials({
        username: "eduhub-biometric",
        password: payload.token,
        server: credentialServer,
        accessControl: AccessControl.BIOMETRY_ANY,
      });

      writeBiometricPreference(pathname, true);
      setEnabled(true);
      void haptic("success");
    } catch {
      void haptic("warning");
      setEnabled(false);
      writeBiometricPreference(pathname, false);
      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        await NativeBiometric.deleteCredentials({ server: credentialServer });
      } catch {
        // Ignore cleanup errors.
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Face ID / Touch ID"
      accent="teal"
      className="p-3 sm:p-3.5"
      action={(
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Turn biometric lock off" : "Turn biometric lock on"}
          onClick={() => void toggleBiometricLock()}
          disabled={!native || busy}
          className={[
            "sm-btn min-h-0 relative inline-flex h-8 w-14 items-center rounded-full border transition",
            enabled
              ? "border-[#67b4ff]/70 bg-[linear-gradient(180deg,#67b4ff,#4f8dfd)]"
              : "border-white/[0.2] bg-white/[0.12]",
            !native || busy ? "cursor-not-allowed opacity-60" : "hover:opacity-95",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform",
              enabled ? "translate-x-[28px]" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      )}
    >
      {enabled ? (
        <div className="flex items-center">
          <span className="w-fit rounded-full border border-[#67b4ff]/45 bg-[#67b4ff]/14 px-2 py-0.5 text-[11px] font-semibold text-[#67b4ff]">
            Enabled
          </span>
        </div>
      ) : null}
    </Card>
  );
}
