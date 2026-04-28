import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Label, SectionHeader } from "@/components/ui";
import { LeaveRequestCreateCard } from "@/components/leave-request-create-card";
import { db } from "@/lib/db";
import { atLeastLevel, getEffectivePermissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { requireSession } from "@/lib/require";
import {
  canApproveStudentLeaveByRole,
  canApproveTeacherLeaveByRole,
  getClassTeacherClassIds
} from "@/lib/leave-approval";
import { createStudentLeaveRequestAction, createTeacherLeaveRequestAction, decideLeaveRequestAction } from "./actions";

function statusTone(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

function typeLabel(type: "STUDENT" | "TEACHER") {
  return type === "STUDENT" ? "Student" : "Teacher";
}

function classLabel(name: string, section: string) {
  return section ? `${name}-${section}` : name;
}

function dateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildLeaveRequestsHref(args: { status?: "PENDING" | "APPROVED" | "REJECTED" | null; compose?: boolean }) {
  const params = new URLSearchParams();
  if (args.status) params.set("status", args.status);
  if (args.compose) params.set("compose", "1");
  const query = params.toString();
  return query ? `/leave-requests?${query}` : "/leave-requests";
}

type LeaveRequestWhereInput = NonNullable<Parameters<typeof db.leaveRequest.findMany>[0]>["where"];

export default async function LeaveRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; compose?: string }>;
}) {
  await requirePermission("LEAVE_REQUESTS", "VIEW");
  const session = await requireSession();
  const { status, compose } = await searchParams;
  const composeOpen = compose === "1";

  const statusFilter = status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? status : null;

  const perms = await getEffectivePermissions({
    schoolId: session.schoolId,
    userId: session.userId,
    roleId: session.roleId
  });

  const leaveLevel = perms.LEAVE_REQUESTS;
  const canCreate = leaveLevel ? atLeastLevel(leaveLevel, "EDIT") : false;

  const classTeacherClassIds =
    session.roleKey === "CLASS_TEACHER"
      ? await getClassTeacherClassIds(session.schoolId, session.userId)
      : [];

  const parentStudentIds =
    session.roleKey === "PARENT"
      ? (
          await db.student.findMany({
            where: {
              schoolId: session.schoolId,
              parents: { some: { userId: session.userId } }
            },
            select: { id: true }
          })
        ).map((row) => row.id)
      : [];

  const whereByRole: LeaveRequestWhereInput = (() => {
    if (session.roleKey === "ADMIN" || session.roleKey === "HEAD_MASTER" || session.roleKey === "PRINCIPAL") {
      return { schoolId: session.schoolId };
    }

    if (session.roleKey === "CLASS_TEACHER") {
      return {
        schoolId: session.schoolId,
        OR: [
          { requestedByUserId: session.userId },
          { requesterType: "TEACHER" as const, teacherUserId: session.userId },
          {
            requesterType: "STUDENT" as const,
            student: {
              classId: { in: classTeacherClassIds }
            }
          }
        ]
      };
    }

    if (session.roleKey === "TEACHER") {
      return {
        schoolId: session.schoolId,
        OR: [{ requestedByUserId: session.userId }, { requesterType: "TEACHER" as const, teacherUserId: session.userId }]
      };
    }

    if (session.roleKey === "PARENT") {
      return {
        schoolId: session.schoolId,
        OR: [{ requestedByUserId: session.userId }, { studentId: { in: parentStudentIds } }]
      };
    }

    return { schoolId: session.schoolId, requestedByUserId: session.userId };
  })();

  const leaveRequests = await db.leaveRequest.findMany({
    where: {
      ...whereByRole,
      ...(statusFilter ? { status: statusFilter } : {})
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          classId: true,
          class: { select: { name: true, section: true } }
        }
      },
      teacherUser: { select: { id: true, name: true } },
      requestedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 260
  });

  const visibleStudents = await (async () => {
    if (!canCreate) return [] as Array<{ id: string; fullName: string; classId: string; classLabel: string }>;

    if (session.roleKey === "PARENT") {
      const rows = await db.student.findMany({
        where: {
          schoolId: session.schoolId,
          parents: { some: { userId: session.userId } }
        },
        select: {
          id: true,
          fullName: true,
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: { fullName: "asc" }
      });
      return rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        classId: row.class?.id ?? "__UNASSIGNED__",
        classLabel: row.class ? classLabel(row.class.name, row.class.section) : "Unassigned"
      }));
    }

    if (session.roleKey === "CLASS_TEACHER") {
      const rows = await db.student.findMany({
        where: {
          schoolId: session.schoolId,
          classId: { in: classTeacherClassIds }
        },
        select: {
          id: true,
          fullName: true,
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: { fullName: "asc" }
      });
      return rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        classId: row.class?.id ?? "__UNASSIGNED__",
        classLabel: row.class ? classLabel(row.class.name, row.class.section) : "Unassigned"
      }));
    }

    if (session.roleKey === "ADMIN" || session.roleKey === "PRINCIPAL" || session.roleKey === "HEAD_MASTER") {
      const rows = await db.student.findMany({
        where: { schoolId: session.schoolId },
        select: {
          id: true,
          fullName: true,
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: [{ fullName: "asc" }],
        take: 600
      });
      return rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        classId: row.class?.id ?? "__UNASSIGNED__",
        classLabel: row.class ? classLabel(row.class.name, row.class.section) : "Unassigned"
      }));
    }

    return [];
  })();

  const classOptions = Array.from(
    new Map(visibleStudents.map((student) => [student.classId, student.classLabel])).entries()
  )
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const visibleStaff = await (async () => {
    if (!canCreate) return [] as Array<{ id: string; name: string; roleLabel: string }>;

    if (session.roleKey === "ADMIN" || session.roleKey === "PRINCIPAL" || session.roleKey === "HEAD_MASTER") {
      const rows = await db.user.findMany({
        where: {
          schoolId: session.schoolId,
          isActive: true,
          schoolRole: {
            key: {
              in: ["TEACHER", "CLASS_TEACHER"]
            }
          }
        },
        select: {
          id: true,
          name: true,
          schoolRole: { select: { name: true } }
        },
        orderBy: [{ name: "asc" }],
        take: 500
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        roleLabel: row.schoolRole.name
      }));
    }

    if (session.roleKey === "TEACHER" || session.roleKey === "CLASS_TEACHER") {
      const me = await db.user.findFirst({
        where: {
          schoolId: session.schoolId,
          id: session.userId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          schoolRole: { select: { key: true, name: true } }
        }
      });
      if (!me) return [];
      if (!(me.schoolRole.key === "TEACHER" || me.schoolRole.key === "CLASS_TEACHER")) return [];
      return [
        {
          id: me.id,
          name: me.name,
          roleLabel: me.schoolRole.name
        }
      ];
    }

    return [];
  })();

  const canCreateStudentRequest =
    canCreate &&
    ["PARENT", "CLASS_TEACHER", "PRINCIPAL", "HEAD_MASTER", "ADMIN"].includes(session.roleKey) &&
    visibleStudents.length > 0;

  const canCreateStaffRequest =
    canCreate &&
    ["TEACHER", "CLASS_TEACHER", "PRINCIPAL", "HEAD_MASTER", "ADMIN"].includes(session.roleKey) &&
    visibleStaff.length > 0;

  const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    db.leaveRequest.count({ where: whereByRole }),
    db.leaveRequest.count({ where: { ...whereByRole, status: "PENDING" } }),
    db.leaveRequest.count({ where: { ...whereByRole, status: "APPROVED" } }),
    db.leaveRequest.count({ where: { ...whereByRole, status: "REJECTED" } })
  ]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Leave Requests"
          subtitle="Student and staff leave workflow with role-based approvals"
        />
        {canCreateStudentRequest || canCreateStaffRequest ? (
          <Link
            href={buildLeaveRequestsHref({ status: statusFilter, compose: !composeOpen })}
            aria-label={composeOpen ? "Close leave request form" : "Create new leave request"}
            className="sm-btn min-h-0 mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[26px] leading-none text-white shadow-[0_14px_30px_-18px_rgba(79,141,253,0.95)] transition hover:brightness-105 active:scale-[0.98]"
            title={composeOpen ? "Close" : "New request"}
          >
            {composeOpen ? "×" : "+"}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <MetricCard
          href={buildLeaveRequestsHref({ compose: composeOpen })}
          label="Total"
          value={totalCount}
          tone="text-white/85"
          active={!statusFilter}
        />
        <MetricCard
          href={buildLeaveRequestsHref({ status: "PENDING", compose: composeOpen })}
          label="Pending"
          value={pendingCount}
          tone="text-amber-300"
          active={statusFilter === "PENDING"}
        />
        <MetricCard
          href={buildLeaveRequestsHref({ status: "APPROVED", compose: composeOpen })}
          label="Approved"
          value={approvedCount}
          tone="text-emerald-300"
          active={statusFilter === "APPROVED"}
        />
        <MetricCard
          href={buildLeaveRequestsHref({ status: "REJECTED", compose: composeOpen })}
          label="Rejected"
          value={rejectedCount}
          tone="text-rose-300"
          active={statusFilter === "REJECTED"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusChip href={buildLeaveRequestsHref({ compose: composeOpen })} active={!statusFilter} label="All" />
        <StatusChip href={buildLeaveRequestsHref({ status: "PENDING", compose: composeOpen })} active={statusFilter === "PENDING"} label="Pending" />
        <StatusChip href={buildLeaveRequestsHref({ status: "APPROVED", compose: composeOpen })} active={statusFilter === "APPROVED"} label="Approved" />
        <StatusChip href={buildLeaveRequestsHref({ status: "REJECTED", compose: composeOpen })} active={statusFilter === "REJECTED"} label="Rejected" />
      </div>

      {composeOpen && (canCreateStudentRequest || canCreateStaffRequest) ? (
        <LeaveRequestCreateCard
          canStudent={canCreateStudentRequest}
          canStaff={canCreateStaffRequest}
          classOptions={classOptions}
          students={visibleStudents}
          staffOptions={visibleStaff}
          createStudentAction={createStudentLeaveRequestAction}
          createStaffAction={createTeacherLeaveRequestAction}
        />
      ) : null}

      <Card title="Requests" description={`${leaveRequests.length} request(s)`} accent="teal">
        {leaveRequests.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No leave requests"
            description="Create a leave request to start the approval process."
          />
        ) : (
          <div className="space-y-3">
            {leaveRequests.map((request) => {
              const targetName =
                request.requesterType === "STUDENT"
                  ? request.student?.fullName ?? "Student"
                  : request.teacherUser?.name ?? "Teacher";

              const classTag =
                request.requesterType === "STUDENT" && request.student?.class
                  ? classLabel(request.student.class.name, request.student.class.section)
                  : null;

              const canApprove = (() => {
                if (request.status !== "PENDING") return false;

                if (request.requesterType === "STUDENT") {
                  if (!canApproveStudentLeaveByRole(session.roleKey)) return false;
                  if (session.roleKey === "CLASS_TEACHER") {
                    return Boolean(request.student?.class && request.student.classId && classTeacherClassIds.includes(request.student.classId));
                  }
                  return true;
                }

                return canApproveTeacherLeaveByRole(session.roleKey);
              })();

              return (
                <article
                  key={request.id}
                  className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-white/90">{targetName}</p>
                        <Badge tone="info">{typeLabel(request.requesterType)}</Badge>
                        <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                        {classTag ? <Badge tone="neutral">{classTag}</Badge> : null}
                      </div>
                      <p className="mt-1 text-[12px] text-white/55">
                        {dateLabel(request.fromDate)} to {dateLabel(request.toDate)} · {request.totalDays} day(s)
                      </p>
                      <p className="mt-1 text-[12px] text-white/45">
                        Requested by {request.requestedByUser.name} on {request.createdAt.toDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-[12px] text-white/75">
                    {request.reason}
                  </p>

                  {request.status !== "PENDING" ? (
                    <p className="mt-2 text-[12px] text-white/45">
                      {request.status === "APPROVED" ? "Approved" : "Rejected"} by {request.approvedByUser?.name ?? "-"}
                      {request.approvedAt ? ` · ${request.approvedAt.toDateString()}` : ""}
                      {request.decisionNote ? ` · Note: ${request.decisionNote}` : ""}
                    </p>
                  ) : null}

                  {canApprove ? <ApproveLeaveCard leaveRequestId={request.id} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  href,
  label,
  value,
  tone,
  active
}: {
  href: string;
  label: string;
  value: number;
  tone: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-[12px] border px-3 py-3 text-center transition",
        active
          ? "border-blue-400/35 bg-blue-500/[0.18]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.06]"
      ].join(" ")}
    >
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/35">{label}</div>
    </Link>
  );
}

function StatusChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <span
        className={[
          "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
          active
            ? "border-blue-400/35 bg-blue-500/[0.18] text-white"
            : "border-white/[0.10] text-white/60 hover:bg-white/[0.06] hover:text-white/88"
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}

async function ApproveLeaveCard({ leaveRequestId }: { leaveRequestId: string }) {
  return (
    <form action={decideLeaveRequestAction} className="mt-3 space-y-2">
      <input type="hidden" name="leaveRequestId" value={leaveRequestId} />
      <div>
        <Label>Decision note (optional)</Label>
        <Input name="decisionNote" placeholder="Optional note for requester" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="decision" value="APPROVE" size="sm">Approve</Button>
        <Button type="submit" name="decision" value="REJECT" variant="danger" size="sm">Reject</Button>
      </div>
    </form>
  );
}
