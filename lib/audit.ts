import { randomUUID } from "node:crypto";
import { execute } from "@/lib/neon-db";

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

  await execute(
    `INSERT INTO "AuditLog"
      ("id", "schoolId", "actorType", "actorId", "action", "entityType", "entityId", "metadataJson", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      randomUUID(),
      schoolId ?? null,
      args.actor.type,
      args.actor.type === "SYSTEM" ? args.actor.id ?? null : args.actor.id,
      args.action,
      args.entityType ?? null,
      args.entityId ?? null,
      args.metadata ? JSON.stringify(args.metadata) : null
    ]
  );
}
