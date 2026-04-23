import { Card, SectionHeader } from "@/components/ui";
import { requirePermission } from "@/lib/require-permission";
import { getLiveTransportForSchool, getParentAssignedBusIds } from "@/lib/transport";
import { prisma } from "@/lib/db";
import { TransportLiveBoard, TransportOpsForms } from "./ui";

export default async function TransportPage() {
  const { session, level } = await requirePermission("TRANSPORT", "VIEW");

  const [allLiveBuses, scopedBuses, drivers, students, routes] = await Promise.all([
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
      : prisma.bus.findMany({ where: { schoolId: session.schoolId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    session.roleKey === "ADMIN"
      ? prisma.user.findMany({
          where: { schoolId: session.schoolId, schoolRole: { key: "BUS_ASSISTANT" }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    session.roleKey === "ADMIN"
      ? prisma.student.findMany({ where: { schoolId: session.schoolId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
    session.roleKey === "ADMIN"
      ? prisma.busRoute.findMany({ where: { schoolId: session.schoolId }, orderBy: { name: "asc" }, select: { id: true, name: true, busId: true } })
      : Promise.resolve([])
  ]);

  let liveBuses = allLiveBuses;
  if (session.roleKey === "PARENT") {
    const assignedBusIds = await getParentAssignedBusIds(session.schoolId, session.userId);
    liveBuses = allLiveBuses.filter((b) => assignedBusIds.has(b.id) && b.tripStatus === "STARTED");
  }

  const lastUpdatedAt = liveBuses
    .map((b) => (b.location ? new Date(b.location.at).getTime() : 0))
    .reduce((max, n) => Math.max(max, n), 0);

  const hasLocation = liveBuses.filter((b) => b.location).length;
  const canTrackOps = level === "EDIT" || level === "APPROVE" || level === "ADMIN";
  const canAdminOps = session.roleKey === "ADMIN" && canTrackOps;

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Bus Live Tracking" subtitle="Driver starts trip with GPS; assigned parents can track live" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Visible Buses" value={String(liveBuses.length)} />
        <Metric label="Live Trips" value={String(liveBuses.filter((b) => b.tripStatus === "STARTED").length)} />
        <Metric label="Tracking Scope" value={session.roleKey === "PARENT" ? "Assigned" : String(scopedBuses.length)} />
        <Metric label="Last Update" value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "Never"} />
      </div>

      <TransportOpsForms
        buses={scopedBuses}
        canAdminOps={canAdminOps}
        canTrackOps={canTrackOps}
        drivers={drivers}
        students={students}
        routes={routes}
        roleKey={session.roleKey}
      />

      <Card title="Live Bus Status" description="Auto-refreshes every 15 seconds" accent="emerald">
        <TransportLiveBoard initialBuses={liveBuses} />
      </Card>

      {session.roleKey === "PARENT" ? (
        <p className="text-xs text-white/50">Only buses assigned to your children appear, and only while trip is active.</p>
      ) : null}
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
