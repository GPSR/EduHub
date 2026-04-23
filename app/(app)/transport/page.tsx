import { Card, SectionHeader } from "@/components/ui";
import { requirePermission } from "@/lib/require-permission";
import { getLiveTransportForSchool } from "@/lib/transport";
import { prisma } from "@/lib/db";
import { TransportAdminForms, TransportLiveBoard } from "./ui";

export default async function TransportPage() {
  const { session, level } = await requirePermission("TRANSPORT", "VIEW");

  const [liveBuses, trackedBuses] = await Promise.all([
    getLiveTransportForSchool(session.schoolId),
    session.roleKey === "BUS_ASSISTANT"
      ? prisma.bus.findMany({
          where: {
            schoolId: session.schoolId,
            driverAssignments: { some: { userId: session.userId } }
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true }
        })
      : prisma.bus.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { name: "asc" },
          select: { id: true, name: true }
        })
  ]);

  const lastUpdatedAt = liveBuses
    .map((b) => (b.location ? new Date(b.location.at).getTime() : 0))
    .reduce((max, n) => Math.max(max, n), 0);

  const hasLocation = liveBuses.filter((b) => b.location).length;
  const canEdit = level === "EDIT" || level === "APPROVE" || level === "ADMIN";
  const canCreateBus = canEdit && session.roleKey === "ADMIN";

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Bus Live Tracking" subtitle="Parents and staff can follow bus location in real time" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total Buses" value={String(liveBuses.length)} />
        <Metric label="Live Now" value={String(hasLocation)} />
        <Metric label="Trackers" value={String(trackedBuses.length)} />
        <Metric
          label="Last Update"
          value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "Never"}
        />
      </div>

      {canEdit ? <TransportAdminForms buses={trackedBuses} canCreateBus={canCreateBus} /> : null}

      <Card title="Live Bus Status" description="Auto-refreshes every 15 seconds" accent="emerald">
        <TransportLiveBoard initialBuses={liveBuses} />
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-center">
      <div className="text-[18px] font-bold text-white/90">{value}</div>
      <div className="text-[11px] text-white/40 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
