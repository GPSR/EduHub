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

type AvailabilityState = "checking" | "available" | "unavailable" | "web";

function biometryLabel(type: number): string {
  if (type === 2) return "Face ID";
  if (type === 1) return "Touch ID";
  if (type === 3) return "Fingerprint";
  if (type === 4) return "Face unlock";
  if (type === 5) return "Iris";
  if (type === 6) return "Multiple biometrics";
  return "Biometrics";
}

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
  const [availability, setAvailability] = useState<AvailabilityState>("checking");
  const [unlockLabel, setUnlockLabel] = useState("Biometrics");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!native) {
      setEnabled(false);
      setAvailability("web");
      setMessage(null);
      return;
    }

    let cancelled = false;
    const syncPreference = () => setEnabled(readBiometricPreference(pathname));
    syncPreference();

    void (async () => {
      setAvailability("checking");
      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        const check = await NativeBiometric.isAvailable({ useFallback: true });
        if (cancelled) return;
        setUnlockLabel(biometryLabel(check.biometryType));
        setAvailability(check.isAvailable ? "available" : "unavailable");
      } catch {
        if (cancelled) return;
        setAvailability("unavailable");
      }
    })();

    const onPreferenceChanged = () => syncPreference();
    const onStorage = (event: StorageEvent) => {
      if (event.key === preferenceKey) syncPreference();
    };

    window.addEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(BIOMETRIC_PREFERENCE_CHANGED_EVENT, onPreferenceChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [native, pathname, preferenceKey]);

  const toggleBiometricLock = async () => {
    if (!native || busy) return;
    const nextEnabled = !enabled;
    setMessage(null);

    if (!nextEnabled) {
      try {
        const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
        await NativeBiometric.deleteCredentials({ server: credentialServer });
      } catch {
        // Ignore native storage deletion errors during disable.
      }
      writeBiometricPreference(pathname, false);
      setEnabled(false);
      setMessage("Biometric lock disabled.");
      void haptic("light");
      return;
    }

    setBusy(true);
    try {
      const { AccessControl, NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const check = await NativeBiometric.isAvailable({ useFallback: true });
      setUnlockLabel(biometryLabel(check.biometryType));
      setAvailability(check.isAvailable ? "available" : "unavailable");

      if (!check.isAvailable) {
        setMessage("Biometric unlock is not available on this device. Set up Face ID, fingerprint, or device passcode first.");
        return;
      }

      const response = await fetch(credentialEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; token?: string; message?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.token) {
        const fallback = "Unable to set up biometric sign-in right now.";
        setMessage(payload?.message ?? fallback);
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
      setMessage("Biometric lock enabled. You can sign in using Face ID/Fingerprint after logout.");
      void haptic("success");
    } catch {
      setMessage("Unable to enable biometric lock right now.");
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

  const availabilityText =
    availability === "web"
      ? "Available in iOS and Android app."
      : availability === "checking"
        ? "Checking biometric availability..."
        : availability === "available"
          ? `${unlockLabel} is available.`
          : "Not available on this device.";

  return (
    <Card
      title="Face ID / Fingerprint"
      description="Simple app unlock toggle."
      accent="teal"
    >
      <div className="rounded-[14px] border border-white/[0.12] bg-[#0f1728]/72 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/92">{unlockLabel}</p>
            <p className="mt-0.5 text-xs text-white/55">Toggle on / off</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-white/75">{enabled ? "On" : "Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={enabled ? "Turn biometric lock off" : "Turn biometric lock on"}
              onClick={() => void toggleBiometricLock()}
              disabled={!native || busy}
              className={[
                "relative inline-flex h-7 w-12 items-center rounded-full transition",
                enabled ? "bg-emerald-500/90" : "bg-white/20",
                (!native || busy) ? "cursor-not-allowed opacity-60" : "hover:opacity-90",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                  enabled ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/50">{availabilityText}</p>
      </div>

      {message ? (
        <p className="mt-3 text-xs text-cyan-100/90">{message}</p>
      ) : null}
    </Card>
  );
}
