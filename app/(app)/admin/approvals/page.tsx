import { Card, Button, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { decideStudentUpdateRequestAction } from "./actions";

export default async function ApprovalsPage() {
  const { session } = await requirePermission("REPORTS", "VIEW");

  const requests = await prisma.studentUpdateRequest.findMany({
    where: { schoolId: session.schoolId, status: "PENDING" },
    include: { student: true, requestedBy: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <Card title="Approvals" description="Review and approve parent requests.">
      <div className="text-sm text-white/70">
        {requests.length ? <Badge tone="info">{requests.length} pending</Badge> : <Badge>None pending</Badge>}
      </div>
      <div className="mt-4 divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
        {requests.map((r) => (
          <div key={r.id} className="px-4 py-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{r.student.fullName}</div>
                <div className="text-xs text-white/60">
                  Requested by: {r.requestedBy.name} ({r.requestedBy.email}) • {r.createdAt.toDateString()}
                </div>
              </div>
              <Badge tone="info">PENDING</Badge>
            </div>
            <details className="rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm text-white/80">View requested changes</summary>
              <pre className="mt-3 text-xs text-white/70 overflow-auto">
{JSON.stringify(JSON.parse(r.payloadJson), null, 2)}
              </pre>
            </details>
            <div className="flex flex-wrap gap-2">
              <form action={decideStudentUpdateRequestAction} className="flex items-center gap-2">
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="decision" value="APPROVE" />
                <Button type="submit">Approve</Button>
              </form>
              <form action={decideStudentUpdateRequestAction} className="flex items-center gap-2">
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="decision" value="REJECT" />
                <Button type="submit" variant="danger">
                  Reject
                </Button>
              </form>
            </div>
          </div>
        ))}
        {requests.length === 0 ? (
          <div className="px-4 py-8 text-sm text-white/60">No pending approval requests.</div>
        ) : null}
      </div>
    </Card>
  );
}
