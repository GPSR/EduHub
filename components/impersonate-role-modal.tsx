"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";

type RoleUser = { id: string; name: string; email: string; role: string };
type ApiRoleUser = {
  id: string;
  name: string;
  email: string;
  schoolRole?: { key?: string; name?: string } | null;
};

export function ImpersonateRoleModal({
  open,
  onClose,
  schoolId,
  schoolName
}: {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<RoleUser[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/platform/schools/${encodeURIComponent(schoolId)}/users`, { cache: "no-store" })
      .then(async (r) => {
        const contentType = r.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const text = await r.text();
          throw new Error(
            r.status === 401
              ? "Platform session expired. Please log in again."
              : `Failed to load users (HTTP ${r.status}).`
          );
        }
        const data = (await r.json()) as { ok: boolean; message?: string; users?: ApiRoleUser[] };
        if (!r.ok || !data.ok) throw new Error(data.message ?? "Failed to load users.");
        if (!cancelled) {
          const normalized = (data.users ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.schoolRole?.name ?? u.schoolRole?.key ?? "UNKNOWN_ROLE"
          }));
          setUsers(normalized);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, schoolId]);

  const grouped = useMemo(() => {
    const map = new Map<string, RoleUser[]>();
    for (const u of users) {
      const list = map.get(u.role) ?? [];
      list.push(u);
      map.set(u.role, list);
    }
    return Array.from(map.entries());
  }, [users]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl">
        <Card title="Impersonate School Role" description={`Choose a user in “${schoolName}” to sign in as.`}>
          {loading ? <div className="text-sm text-white/70">Loading users...</div> : null}
          {error ? <div className="text-sm text-rose-200">{error}</div> : null}
          {!loading && !error && users.length === 0 ? (
            <div className="text-sm text-white/70">No users found for this school yet.</div>
          ) : null}

          {!loading && !error && users.length > 0 ? (
            <div className="mt-4 space-y-4">
              {grouped.map(([role, list]) => (
                <div key={role} className="rounded-xl border border-white/10 bg-black/20">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">{role}</div>
                  <div className="divide-y divide-white/10">
                    {list.map((u) => (
                      <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-white/60">
                            {u.email} • Role: <span className="text-white/80">{u.role}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              setError(null);
                              const r = await fetch("/api/platform/impersonate", {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ schoolId, userId: u.id })
                              });
                              const data = (await r.json().catch(() => null)) as
                                | { ok: boolean; message?: string }
                                | null;
                              if (!r.ok || !data?.ok) {
                                throw new Error(data?.message ?? `Failed (HTTP ${r.status}).`);
                              }
                              window.location.href = "/dashboard";
                            } catch (e: unknown) {
                              setError(e instanceof Error ? e.message : "Failed to impersonate.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Impersonate
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
