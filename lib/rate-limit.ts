import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token";

function normalizeRateLimitPart(value: string) {
  return value.trim().toLowerCase().slice(0, 220);
}

export function buildRateLimitKey(...parts: string[]) {
  return parts.map(normalizeRateLimitPart).join("|");
}

export async function readRequestIp() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = h.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "unknown";
}

export async function consumeRateLimitAttempt(args: {
  scope: string;
  key: string;
  maxAttempts: number;
  windowMs: number;
}) {
  const action = `RATE_LIMIT_${args.scope}`;
  const entityId = hashToken(`${args.scope}:${args.key}`);
  const windowStart = new Date(Date.now() - args.windowMs);

  const attemptCount = await prisma.auditLog.count({
    where: {
      action,
      entityId,
      createdAt: { gte: windowStart }
    }
  });
  if (attemptCount >= args.maxAttempts) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil(args.windowMs / 1000))
    } as const;
  }

  await prisma.auditLog.create({
    data: {
      actorType: "SYSTEM",
      action,
      entityType: "RateLimit",
      entityId,
      metadataJson: JSON.stringify({
        maxAttempts: args.maxAttempts,
        windowMs: args.windowMs
      })
    }
  });

  return { limited: false, retryAfterSeconds: 0 } as const;
}
