import Link from "next/link";
import { Badge, Card, EmptyState, Input, SectionHeader, Select } from "@/components/ui";
import { db } from "@/lib/db";
import type { DemoRequestStatus } from "@/lib/db-types";
import { requirePlatformUser } from "@/lib/platform-require";
import { updateDemoRequestAction } from "./actions";

const STATUS_OPTIONS: Array<{ value: "ALL" | DemoRequestStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CLOSED", label: "Closed" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
];
const REQUEST_STATUS_OPTIONS: DemoRequestStatus[] = ["NEW", "CONTACTED", "CLOSED", "NOT_AVAILABLE"];

function statusTone(status: DemoRequestStatus): "warning" | "info" | "danger" | "neutral" {
  if (status === "NEW") return "warning";
  if (status === "CONTACTED") return "info";
  if (status === "NOT_AVAILABLE") return "danger";
  return "neutral";
}

function statusLabel(status: DemoRequestStatus): string {
  if (status === "NEW") return "New";
  if (status === "CONTACTED") return "Contacted";
  if (status === "CLOSED") return "Closed";
  return "Not Available";
}

type DemoRequestWhereInput = NonNullable<Parameters<typeof db.demoRequest.findMany>[0]>["where"];

export default async function PlatformDemoRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: "ALL" | DemoRequestStatus }>;
}) {
  await requirePlatformUser();
  const { q, status } = await searchParams;

  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const statusFilter: "ALL" | DemoRequestStatus =
    status === "NEW" || status === "CONTACTED" || status === "CLOSED" || status === "NOT_AVAILABLE" || status === "ALL" ? status : "ALL";

  const where: DemoRequestWhereInput = {};
  if (statusFilter !== "ALL") {
    where.status = statusFilter;
  }
  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { schoolName: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { mobileNumber: { contains: query } },
    ];
  }

  const [requests, totalCount, newCount] = await Promise.all([
    db.demoRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolName: true,
        address: true,
        email: true,
        mobileNumber: true,
        bestTimeToReach: true,
        status: true,
        note: true,
        reviewedAt: true,
        createdAt: true,
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
    db.demoRequest.count(),
    db.demoRequest.count({ where: { status: "NEW" } }),
  ]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader title="Demo Requests" subtitle="Review and track all incoming product demo enquiries." />
        <div className="flex items-center gap-2">
          <Badge tone="warning" dot>{newCount} new</Badge>
          <Badge tone="neutral">{totalCount} total</Badge>
        </div>
      </div>

      <Card>
        <form action="/platform/demo-requests" method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search by name, school, email or mobile"
              autoComplete="off"
            />
          </div>
          <div>
            <Select name="status" defaultValue={statusFilter}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-[36px] items-center justify-center rounded-[10px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(79,141,253,0.75)] transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
          >
            Apply
          </button>
          <Link
            href="/platform/demo-requests"
            className="inline-flex min-h-[36px] items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#111c30]/90 px-3 py-2 text-[13px] font-medium text-white/95 transition hover:border-white/[0.22] hover:bg-[#16233a]"
          >
            Reset
          </Link>
        </form>
      </Card>

      <Card title={`Requests${requests.length ? ` · ${requests.length} shown` : ""}`} accent="indigo">
        {requests.length === 0 ? (
          <EmptyState icon="📬" title="No demo requests" description="New demo enquiries will appear here." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {requests.map((request, index) => {
              const isLocked = Boolean(request.reviewedAt);
              return (
              <div
                key={request.id}
                className={`px-2 py-4 ${index === 0 ? "rounded-t-[12px]" : ""} ${index === requests.length - 1 ? "rounded-b-[12px]" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white/92">
                      {request.firstName} {request.lastName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/55">{request.schoolName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-white/45">
                      <a href={`mailto:${request.email}`} className="hover:text-cyan-200 transition">{request.email}</a>
                      <span>·</span>
                      <a href={`tel:${request.mobileNumber.replace(/[^+\d]/g, "")}`} className="hover:text-cyan-200 transition">
                        {request.mobileNumber}
                      </a>
                      <span>·</span>
                      <span>{request.bestTimeToReach}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
                    <span className="text-[11px] text-white/40">{request.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="mt-2 text-[13px] text-white/68 leading-relaxed">{request.address}</p>

                <form action={updateDemoRequestAction} className="mt-3 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <input type="hidden" name="requestId" value={request.id} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-white/55">Status</span>
                      <select
                        name="status"
                        defaultValue={request.status}
                        disabled={isLocked}
                        className="w-full rounded-[9px] border border-white/[0.14] bg-[#111c30]/90 px-2.5 py-1.5 text-[12px] text-white outline-none transition focus:border-cyan-300/65"
                      >
                        {REQUEST_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusLabel(statusOption)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-white/55">Internal note</span>
                      <input
                        type="text"
                        name="note"
                        defaultValue={request.note ?? ""}
                        maxLength={500}
                        placeholder="Add follow-up note for platform team"
                        disabled={isLocked}
                        className="w-full rounded-[9px] border border-white/[0.14] bg-[#111c30]/90 px-2.5 py-1.5 text-[12px] text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/65"
                      />
                    </label>
                    <div className="self-end">
                      <button
                        type="submit"
                        disabled={isLocked}
                        className="inline-flex min-h-[32px] items-center justify-center rounded-[9px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:from-[#7ac0ff] hover:to-[#5a95ff]"
                      >
                        {isLocked ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                </form>

                {isLocked ? (
                  <p className="mt-1.5 text-[11px] text-amber-200/85">
                    Locked after first save. This request can no longer be modified.
                  </p>
                ) : null}

                <div className="mt-2 text-[11px] text-white/45">
                  {request.reviewedBy
                    ? `Reviewed by ${request.reviewedBy.name} (${request.reviewedBy.email})`
                    : "Not yet reviewed by a platform user"}
                  {request.reviewedAt ? ` · ${request.reviewedAt.toLocaleString()}` : ""}
                </div>

                {request.note ? (
                  <p className="mt-1.5 text-[12px] italic text-white/55">Note: {request.note}</p>
                ) : null}
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
