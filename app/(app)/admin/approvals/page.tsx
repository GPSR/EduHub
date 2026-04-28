import { Card, Button, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { decideStudentUpdateRequestAction } from "./actions";

export default async function ApprovalsPage() {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const requests = await db.studentUpdateRequest.findMany({
    where: { schoolId: session.schoolId, status: "PENDING" },
    include: { student: true, requestedBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Approvals" subtitle="Review and approve pending change requests" />
        {requests.length > 0 && <Badge tone="warning" dot>{requests.length} pending</Badge>}
      </div>

      <Card>
        {requests.length === 0 ? (
          <EmptyState icon="✓" title="All clear" description="No pending approval requests." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {requests.map((r, i) => (
              <div
                key={r.id}
                className={`px-4 py-5 space-y-4
                             ${i === 0 ? "rounded-t-[16px]" : ""}
                             ${i === requests.length - 1 ? "rounded-b-[16px]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold text-white/90">{r.student.fullName}</p>
                    <p className="text-[12px] text-white/45 mt-1">
                      Requested by {r.requestedBy.name} · {r.createdAt.toDateString()}
                    </p>
                  </div>
                  <Badge tone="warning" dot>Pending</Badge>
                </div>

                <details className="group rounded-[14px] border border-white/[0.08] bg-black/20 overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-[13px] font-medium text-white/70 hover:text-white/90 select-none transition">
                    <span>View requested changes</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                      <span className="group-open:hidden">Open</span>
                      <span className="hidden group-open:inline">Close</span>
                    </span>
                  </summary>
                  <pre className="px-4 pb-4 text-xs text-white/60 overflow-auto leading-relaxed">
{JSON.stringify(JSON.parse(r.payloadJson), null, 2)}
                  </pre>
                </details>

                <div className="flex flex-wrap gap-2">
                  <form action={decideStudentUpdateRequestAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="APPROVE" />
                    <Button type="submit" size="sm">✓ Approve</Button>
                  </form>
                  <form action={decideStudentUpdateRequestAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="REJECT" />
                    <Button type="submit" variant="danger" size="sm">✕ Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
