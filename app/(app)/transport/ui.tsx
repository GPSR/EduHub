"use client";

import { useActionState, useMemo, useState, useTransition, useEffect, useRef } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { BusLiveView } from "@/lib/transport";
import {
  assignDriverAction,
  assignStudentBusAction,
  createBusAction,
  createRouteAction,
  markStudentDropAction,
  startTripAction,
  stopTripAction,
  updateBusLocationAction,
  type TransportState
} from "./actions";

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

function ActionMsg({ state }: { state: TransportState }) {
  if (!state.message) return null;
  return <p className={`text-xs ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</p>;
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
        // Keep last successful snapshot.
      }
    };
    run();
    timer = setInterval(run, 5000);
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
        const live = bus.tripStatus === "STARTED";
        return (
          <div
            key={bus.id}
            className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-white/90">{bus.name}</p>
                {bus.plateNumber ? <span className="text-[11px] text-white/40">{bus.plateNumber}</span> : null}
                <span className={`text-[10px] rounded-full px-2 py-0.5 ${live ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                  {live ? "Trip Live" : "Trip Not Started"}
                </span>
              </div>
              <p className="text-[12px] text-white/45 mt-1">Driver: {bus.assignedDriverName ?? "Not assigned"}</p>
              <p className="text-[12px] text-white/45 mt-1">Route: {bus.routeName ?? "Not assigned"}</p>
              {loc ? (
                <p className="text-[12px] text-white/55 mt-1">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  {typeof loc.speedKph === "number" ? ` • ${Math.round(loc.speedKph)} km/h` : ""}
                  {typeof loc.headingDeg === "number" ? ` • ${Math.round(loc.headingDeg)}°` : ""}
                </p>
              ) : (
                <p className="text-[12px] text-amber-300/80 mt-1">No live location available</p>
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
      {buses.length === 0 ? <p className="text-sm text-white/50">No buses visible for your role.</p> : null}
    </div>
  );
}

export function TransportOpsForms({
  buses,
  canAdminOps,
  canTrackOps,
  drivers,
  students,
  routes,
  roleKey
}: {
  buses: Array<{ id: string; name: string }>;
  canAdminOps: boolean;
  canTrackOps: boolean;
  drivers: Array<{ id: string; name: string }>;
  students: Array<{ id: string; fullName: string }>;
  routes: Array<{ id: string; name: string; busId: string | null }>;
  roleKey: string;
}) {
  const [createState, createAct, createPending] = useActionState(createBusAction, initialState);
  const [assignDriverState, assignDriverAct, assignDriverPending] = useActionState(assignDriverAction, initialState);
  const [createRouteState, createRouteAct, createRoutePending] = useActionState(createRouteAction, initialState);
  const [assignStudentState, assignStudentAct, assignStudentPending] = useActionState(assignStudentBusAction, initialState);
  const [startState, startAct, startPending] = useActionState(startTripAction, initialState);
  const [stopState, stopAct, stopPending] = useActionState(stopTripAction, initialState);
  const [locState, locAct, locPending] = useActionState(updateBusLocationAction, initialState);
  const [dropState, dropAct, dropPending] = useActionState(markStudentDropAction, initialState);

  const [geo, setGeo] = useState<{ lat: string; lng: string } | null>(null);
  const [isLocating, startLocating] = useTransition();
  const canTrack = useMemo(() => canTrackOps && buses.length > 0, [canTrackOps, buses.length]);
  const [streamBusId, setStreamBusId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamMsg, setStreamMsg] = useState<string>("");
  const watchIdRef = useRef<number | null>(null);

  const detectLocation = () => {
    startLocating(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
        () => setGeo(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const stopStreaming = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStreaming(false);
    setStreamMsg("Live GPS streaming stopped.");
  };

  const startStreaming = () => {
    if (!navigator.geolocation) {
      setStreamMsg("GPS not supported on this device/browser.");
      return;
    }
    if (!streamBusId) {
      setStreamMsg("Select bus before starting live stream.");
      return;
    }
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const speedMps = typeof pos.coords.speed === "number" && Number.isFinite(pos.coords.speed) ? pos.coords.speed : null;
        const speedKph = speedMps == null ? undefined : Math.max(0, speedMps * 3.6);
        const heading = typeof pos.coords.heading === "number" && Number.isFinite(pos.coords.heading) ? pos.coords.heading : undefined;

        try {
          const res = await fetch("/api/transport/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              busId: streamBusId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speedKph,
              headingDeg: heading
            })
          });
          const data = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok || !data.ok) {
            setStreamMsg(data.message || "Unable to send GPS ping.");
            setStreaming(false);
            return;
          }
          setStreaming(true);
          setStreamMsg(`Streaming live... Last ping ${new Date().toLocaleTimeString()}`);
        } catch {
          setStreamMsg("Network issue while sending GPS ping.");
        }
      },
      () => {
        setStreamMsg("Unable to read GPS. Allow location permission.");
        setStreaming(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setStreamMsg("Starting GPS stream...");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {canAdminOps ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title="Add Bus" accent="teal">
            <form action={createAct} className="space-y-3">
              <div><Label required>Bus name</Label><Input name="name" placeholder="Bus A" required /></div>
              <div><Label>Plate number</Label><Input name="plateNumber" placeholder="TN-01-AB-1234" /></div>
              <div><Label>Capacity</Label><Input name="capacity" type="number" min={1} max={500} placeholder="40" /></div>
              <ActionMsg state={createState} />
              <Button type="submit" disabled={createPending}>{createPending ? "Saving..." : "Create bus"}</Button>
            </form>
          </Card>

          <Card title="Assign Driver to Bus" accent="indigo">
            <form action={assignDriverAct} className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Label required>Driver (Bus Assistant)</Label>
                <select name="userId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required>
                  <option value="">Select driver</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <ActionMsg state={assignDriverState} />
              <Button type="submit" disabled={assignDriverPending}>{assignDriverPending ? "Assigning..." : "Assign driver"}</Button>
            </form>
          </Card>

          <Card title="Create Route" accent="teal">
            <form action={createRouteAct} className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><Label required>Route name</Label><Input name="name" placeholder="Morning Route A" required /></div>
              <div><Label>Stops (one per line)</Label><Textarea name="stopsText" rows={4} placeholder={"School Gate\nMain Street\nTemple Stop"} /></div>
              <ActionMsg state={createRouteState} />
              <Button type="submit" disabled={createRoutePending}>{createRoutePending ? "Saving..." : "Create route"}</Button>
            </form>
          </Card>

          <Card title="Assign Student to Bus" accent="indigo">
            <form action={assignStudentAct} className="space-y-3">
              <div>
                <Label required>Student</Label>
                <select name="studentId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Route</Label>
                <select name="routeId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white">
                  <option value="">Select route</option>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div><Label>Pickup point</Label><Input name="pickupPoint" placeholder="Temple Stop" /></div>
              <ActionMsg state={assignStudentState} />
              <Button type="submit" disabled={assignStudentPending}>{assignStudentPending ? "Saving..." : "Assign student"}</Button>
            </form>
          </Card>
        </div>
      ) : null}

      {canTrackOps ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title="Trip Control" accent="emerald">
            <form action={startAct} className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required disabled={!canTrack}>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input name="lat" defaultValue={geo?.lat ?? ""} /></div>
                <div><Label>Longitude</Label><Input name="lng" defaultValue={geo?.lng ?? ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Speed (km/h)</Label><Input name="speedKph" type="number" min={0} max={250} step="0.1" /></div>
                <div><Label>Heading (0-360)</Label><Input name="headingDeg" type="number" min={0} max={360} step="1" /></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="secondary" onClick={detectLocation} disabled={isLocating || !canTrack}>
                  {isLocating ? "Detecting..." : "Allow GPS + Use Current"}
                </Button>
                <Button type="submit" disabled={startPending || !canTrack}>{startPending ? "Starting..." : "Start Trip"}</Button>
              </div>
              <ActionMsg state={startState} />
            </form>

            <form action={stopAct} className="space-y-3 mt-4 pt-4 border-t border-white/[0.08]">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required disabled={!canTrack}>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <Button type="submit" variant="secondary" disabled={stopPending || !canTrack}>{stopPending ? "Stopping..." : "End Trip"}</Button>
              <ActionMsg state={stopState} />
            </form>
          </Card>

          <Card title="Update Live GPS" accent="indigo">
            <form action={locAct} className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required disabled={!canTrack}>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label required>Latitude</Label><Input name="lat" defaultValue={geo?.lat ?? ""} required /></div>
                <div><Label required>Longitude</Label><Input name="lng" defaultValue={geo?.lng ?? ""} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Speed (km/h)</Label><Input name="speedKph" type="number" min={0} max={250} step="0.1" /></div>
                <div><Label>Heading (0-360)</Label><Input name="headingDeg" type="number" min={0} max={360} step="1" /></div>
              </div>
              <div><Label>Note</Label><Input name="note" placeholder="Near Central Stop" maxLength={160} /></div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="secondary" onClick={detectLocation} disabled={isLocating || !canTrack}>
                  {isLocating ? "Detecting..." : "Use Current Location"}
                </Button>
                <Button type="submit" disabled={locPending || !canTrack}>{locPending ? "Updating..." : "Update Location"}</Button>
              </div>
              <ActionMsg state={locState} />
            </form>
          </Card>

          <Card title="Auto Live GPS Streaming" accent="teal">
            <div className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select
                  value={streamBusId}
                  onChange={(e) => setStreamBusId(e.target.value)}
                  className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white"
                  disabled={!canTrack}
                >
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <p className="text-[12px] text-white/55">
                For drivers: keep this enabled after trip starts. GPS updates send continuously while bus moves.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" onClick={startStreaming} disabled={!canTrack || streaming}>
                  {streaming ? "Streaming Active" : "Start Live Streaming"}
                </Button>
                <Button type="button" variant="secondary" onClick={stopStreaming} disabled={!streaming}>
                  Stop Streaming
                </Button>
              </div>
              {streamMsg ? <p className={`text-xs ${streaming ? "text-emerald-300" : "text-white/55"}`}>{streamMsg}</p> : null}
            </div>
          </Card>

          <Card title="Student Drop Update" accent="emerald">
            <form action={dropAct} className="space-y-3">
              <div>
                <Label required>Bus</Label>
                <select name="busId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required disabled={!canTrack}>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Label required>Student</Label>
                <select name="studentId" className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white" required disabled={!canTrack}>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Drop Latitude</Label><Input name="lat" defaultValue={geo?.lat ?? ""} /></div>
                <div><Label>Drop Longitude</Label><Input name="lng" defaultValue={geo?.lng ?? ""} /></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="secondary" onClick={detectLocation} disabled={isLocating || !canTrack}>
                  {isLocating ? "Detecting..." : "Use Current Location"}
                </Button>
                <Button type="submit" disabled={dropPending || !canTrack}>
                  {dropPending ? "Saving..." : "Mark Student Dropped"}
                </Button>
              </div>
              <ActionMsg state={dropState} />
            </form>
          </Card>
        </div>
      ) : null}

      {!canAdminOps && !canTrackOps ? (
        <p className="text-sm text-white/55">{roleKey === "PARENT" ? "You can view live buses assigned to your children when trip is active." : "View-only access."}</p>
      ) : null}
    </div>
  );
}
