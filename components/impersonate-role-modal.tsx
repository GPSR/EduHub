"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Badge } from "@/components/ui";

type RoleUser = { id: string; name: string; email: string; role: string };
type ApiRoleUser = { id: string; name: string; email: string; schoolRole?: { key?: string; name?: string } | null };

function avatarColor(name: string) {
  const colors = ["from-indigo-400 to-indigo-600","from-violet-400 to-violet-600","from-teal-400 to-teal-600","from-rose-400 to-rose-600","from-amber-400 to-amber-600"];
  return colors[name.charCodeAt(0) % colors.length];
}

export function ImpersonateRoleModal({ open, onClose, schoolId, schoolName }: {
  open: boolean; onClose: () => void;
  schoolId: string; schoolName: string;
}) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [users, setUsers]       = useState<RoleUser[]>([]);
  const [acting, setActing]     = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`/api/platform/schools/${encodeURIComponent(schoolId)}/users`, { cache: "no-store" })
      .then(async r => {
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) throw new Error(r.status === 401 ? "Session expired — please log in again." : `HTTP ${r.status}`);
        const data = (await r.json()) as { ok: boolean; message?: string; users?: ApiRoleUser[] };
        if (!r.ok || !data.ok) throw new Error(data.message ?? "Failed to load users.");
        if (!cancelled) setUsers((data.users ?? []).map(u => ({
          id: u.id, name: u.name, email: u.email,
          role: u.schoolRole?.name ?? u.schoolRole?.key ?? "Unknown",
        })));
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, schoolId]);

  const grouped = useMemo(() => {
    const map = new Map<string, RoleUser[]>();
    for (const u of users) { const l = map.get(u.role) ?? []; l.push(u); map.set(u.role, l); }
    return Array.from(map.entries());
  }, [users]);

  async function handleImpersonate(userId: string) {
    try {
      setActing(userId); setError(null);
      const r = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolId, userId }),
      });
      const data = (await r.json().catch(() => null)) as { ok: boolean; message?: string } | null;
      if (!r.ok || !data?.ok) throw new Error(data?.message ?? `HTTP ${r.status}`);
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to impersonate.");
    } finally {
      setActing(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-xl rounded-[24px] border border-white/[0.10]
                      bg-[#060912]/97 backdrop-blur-2xl
                      shadow-[0_-20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]
                      overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div>
            <h2 className="text-[16px] font-bold text-white/95">Impersonate User</h2>
            <p className="text-[13px] text-white/45 mt-0.5">
              Sign in as a user in <span className="text-white/65 font-medium">{schoolName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[10px] border border-white/[0.09] bg-white/[0.05]
                       p-2 text-white/50 hover:text-white hover:bg-white/[0.10] transition"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
          {loading && (
            <div className="flex items-center gap-3 py-6 justify-center text-white/50 text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              Loading users…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2.5 rounded-[12px] border border-rose-500/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
              <span>⚠</span> {error}
            </div>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="text-center text-sm text-white/45 py-8">No users found for this school.</p>
          )}
          {!loading && !error && grouped.map(([role, list]) => (
            <div key={role}>
              <div className="flex items-center gap-2 mb-2">
                <Badge tone="neutral">{role}</Badge>
                <span className="text-[11px] text-white/35">{list.length} user{list.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="rounded-[16px] border border-white/[0.07] overflow-hidden divide-y divide-white/[0.06]">
                {list.map(u => {
                  const initials = u.name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase();
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition">
                      <div className={`hidden sm:grid h-8 w-8 shrink-0 place-items-center rounded-[9px]
                                       bg-gradient-to-b ${avatarColor(u.name)} text-[11px] font-bold text-white`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/85 truncate">{u.name}</p>
                        <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={acting === u.id}
                        onClick={() => handleImpersonate(u.id)}
                      >
                        {acting === u.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border border-white/30 border-t-white animate-spin" />
                            …
                          </span>
                        ) : "Sign in as"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
