"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useEffect } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import type { BusLiveView } from "@/lib/transport";
import { createBusAction, updateBusLocationAction, type TransportState } from "./actions";

const initialState: TransportState = { ok: true };

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to fetch live data");
  return (await res.json()) as { buses: BusLiveView[]; serverTime: string };
};

function formatSince(iso: string | null | undefined) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function TransportLiveBoard({ initialBuses }: { initialBuses: BusLiveView[] }) {
  const [buses, setBuses] = useState<BusLiveView[]>(initialBuses);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetcher("/api/transport/live");
        if (!cancelled) setBuses(data.buses);
      } catch {
        // Keep last successful live snapshot on polling failure.
      }
    };
    run();
    timer = setInterval(run, 15000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-3">
      {buses.map((bus) => {
        const loc = bus.location;
        const maps = loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : null;
        return (
          <div
            key={bus.id}
            className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-white/90">{bus.name}</p>
                {bus.plateNumber ? <span className="text-[11px] text-white/40">{bus.plateNumber}</span> : null}
              </div>
              <p className="text-[12px] text-white/45 mt-1">
                Driver: {bus.assignedDriverName ?? "Not assigned"}
              </p>
              {loc ? (
                <p className="text-[12px] text-white/55 mt-1">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  {typeof loc.speedKph === "number" ? ` • ${Math.round(loc.speedKph)} km/h` : ""}
                  {typeof loc.headingDeg === "number" ? ` • ${Math.round(loc.headingDeg)}°` : ""}
                </p>
              ) : (
                <p className="text-[12px] text-amber-300/80 mt-1">No live location yet</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-white/40">{formatSince(loc?.at)}</p>
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex rounded-[10px] border border-white/[0.12] px-2.5 py-1.5 text-[11px] text-white/75 hover:bg-white/[0.06]"
                >
                  Open map
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
      {buses.length === 0 ? <p className="text-sm text-white/50">No buses configured yet.</p> : null}
    </div>
  );
}

export function TransportAdminForms({
  buses,
  canCreateBus
}: {
  buses: Array<{ id: string; name: string }>;
  canCreateBus: boolean;
}) {
  const [createState, createAct, createPending] = useActionState(createBusAction, initialState);
  const [locState, locAct, locPending] = useActionState(updateBusLocationAction, initialState);

  const [geo, setGeo] = useState<{ lat: string; lng: string } | null>(null);
  const [isLocating, startLocating] = useTransition();

  const canTrack = useMemo(() => buses.length > 0, [buses.length]);

  const detectLocation = () => {
    startLocating(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude)
          });
        },
        () => {
          setGeo(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {canCreateBus ? (
        <Card title="Add Bus" accent="teal">
          <form action={createAct} className="space-y-3">
            <div>
              <Label required>Bus name</Label>
              <Input name="name" placeholder="Bus A" required />
            </div>
            <div>
              <Label>Plate number</Label>
              <Input name="plateNumber" placeholder="TN-01-AB-1234" />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input name="capacity" type="number" min={1} max={500} placeholder="40" />
            </div>
            {createState.message ? <p className={`text-xs ${createState.ok ? "text-emerald-300" : "text-rose-300"}`}>{createState.message}</p> : null}
            <Button type="submit" disabled={createPending}>{createPending ? "Saving..." : "Create bus"}</Button>
          </form>
        </Card>
      ) : null}

      <Card title="Update Live Location" accent="indigo">
        <form action={locAct} className="space-y-3">
          <div>
            <Label required>Bus</Label>
            <select
              name="busId"
              className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-base sm:text-sm text-white outline-none"
              required
              disabled={!canTrack}
            >
              <option value="">Select bus</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Latitude</Label>
              <Input name="lat" defaultValue={geo?.lat ?? ""} required />
            </div>
            <div>
              <Label required>Longitude</Label>
              <Input name="lng" defaultValue={geo?.lng ?? ""} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Speed (km/h)</Label>
              <Input name="speedKph" type="number" min={0} max={250} step="0.1" />
            </div>
            <div>
              <Label>Heading (0-360)</Label>
              <Input name="headingDeg" type="number" min={0} max={360} step="1" />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Input name="note" placeholder="Near Main Gate" maxLength={160} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={detectLocation} disabled={isLocating || !canTrack}>
              {isLocating ? "Detecting..." : "Use my current location"}
            </Button>
            <Button type="submit" disabled={locPending || !canTrack}>{locPending ? "Updating..." : "Update live location"}</Button>
          </div>
          {locState.message ? <p className={`text-xs ${locState.ok ? "text-emerald-300" : "text-rose-300"}`}>{locState.message}</p> : null}
        </form>
      </Card>
    </div>
  );
}
