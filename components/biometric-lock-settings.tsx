"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui";
import { haptic, isNative } from "@/lib/native";
import {
  BIOMETRIC_PREFERENCE_CHANGED_EVENT,
  getBiometricPreferenceKey,
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
      writeBiometricPreference(pathname, false);
      setEnabled(false);
      setMessage("Biometric lock disabled.");
      void haptic("light");
      return;
    }

    setBusy(true);
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const check = await NativeBiometric.isAvailable({ useFallback: true });
      setUnlockLabel(biometryLabel(check.biometryType));
      setAvailability(check.isAvailable ? "available" : "unavailable");

      if (!check.isAvailable) {
        setMessage("Biometric unlock is not available on this device. Set up Face ID, fingerprint, or device passcode first.");
        return;
      }

      writeBiometricPreference(pathname, true);
      setEnabled(true);
      setMessage("Biometric lock enabled.");
      void haptic("success");
    } catch {
      setMessage("Unable to enable biometric lock right now.");
      void haptic("warning");
      setEnabled(false);
      writeBiometricPreference(pathname, false);
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
          ? `${unlockLabel} is available on this device.`
          : "Biometric unlock is not available on this device.";

  return (
    <Card
      title="Biometric Lock"
      description="Control Face ID / fingerprint lock for this app on this device."
      accent="teal"
    >
      <div className="rounded-[14px] border border-white/[0.12] bg-[#0f1728]/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/92">{enabled ? "Enabled" : "Disabled"}</p>
            <p className="mt-0.5 text-xs text-white/55">{availabilityText}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Disable biometric lock" : "Enable biometric lock"}
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

      {message ? (
        <p className="mt-3 text-xs text-cyan-100/90">{message}</p>
      ) : null}
    </Card>
  );
}
