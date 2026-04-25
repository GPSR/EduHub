import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function ensureDatabaseUrl() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const localDatabaseUrl = process.env.LOCAL_DATABASE_URL?.trim();
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim();

  // Local/dev/test: prefer LOCAL_DATABASE_URL, then DATABASE_URL
  if (nodeEnv !== "production") {
    const selected = localDatabaseUrl || databaseUrl;
    if (!selected) {
      throw new Error(
        "Missing DB config. Set LOCAL_DATABASE_URL (preferred) or DATABASE_URL for local development."
      );
    }
    if (selected.startsWith("file:")) {
      throw new Error(
        "Local DB URL is using SQLite file format. This project now expects PostgreSQL/Neon URLs."
      );
    }
    process.env.DATABASE_URL = selected;
    return;
  }

  // Production: prefer NEON_DATABASE_URL, then DATABASE_URL
  const selected = neonDatabaseUrl || databaseUrl;
  if (!selected) {
    throw new Error(
      "Missing production DB config. Set NEON_DATABASE_URL (preferred) or DATABASE_URL."
    );
  }
  if (selected.startsWith("file:")) {
    throw new Error("Production DB URL cannot use SQLite file format. Use a Neon/PostgreSQL URL.");
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
