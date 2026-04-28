import { db } from "@/lib/db";

export type AuditActor =
  | { type: "SYSTEM"; id?: string }
  | { type: "PLATFORM_USER"; id: string }
  | { type: "SCHOOL_USER"; id: string; schoolId: string };

export async function auditLog(args: {
  actor: AuditActor;
  action: string;
  entityType?: string;
  entityId?: string;
  schoolId?: string;
  metadata?: Record<string, unknown>;
}) {
  const schoolId =
    args.schoolId ??
    (args.actor.type === "SCHOOL_USER" ? args.actor.schoolId : undefined);

  await db.auditLog.create({
    data: {
      schoolId,
      actorType: args.actor.type,
      actorId: args.actor.type === "SYSTEM" ? args.actor.id ?? null : args.actor.id,
      action: args.action,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      metadataJson: args.metadata ? JSON.stringify(args.metadata) : null
    }
  });
}

