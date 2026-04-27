import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function ensureDatabaseUrl() {
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim();
  const fallbackUrl = process.env.DATABASE_URL?.trim();
  // Neon is the source of truth across environments.
  const selected = neonDatabaseUrl || fallbackUrl;
  if (!selected) {
    throw new Error(
      "Missing DB config. Set NEON_DATABASE_URL (preferred) or DATABASE_URL."
    );
  }
  if (selected.startsWith("file:")) {
    throw new Error("DB URL cannot use SQLite file format. Use a Neon/PostgreSQL URL.");
  }
  process.env.DATABASE_URL = selected;
}

ensureDatabaseUrl();

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
