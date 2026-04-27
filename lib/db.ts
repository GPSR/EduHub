import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var neonDb: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function resolveDatabaseUrl() {
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
  return selected;
}

let client: PrismaClient | undefined;

function getClient() {
  if (client) return client;

  const databaseUrl = resolveDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  client =
    globalThis.neonDb ??
    globalThis.prisma ??
    new PrismaClient({
      log: ["error", "warn"]
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.neonDb = client;
    globalThis.prisma = client;
  }

  return client;
}

const lazyDb = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const dbClient = getClient() as PrismaClient;
    const value = Reflect.get(dbClient, prop, dbClient);
    return typeof value === "function" ? value.bind(dbClient) : value;
  },
  set(_target, prop, value) {
    const dbClient = getClient() as PrismaClient;
    return Reflect.set(dbClient, prop, value, dbClient);
  },
  has(_target, prop) {
    return Reflect.has(getClient() as PrismaClient, prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getClient() as PrismaClient);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getClient() as PrismaClient, prop);
  }
});

export const db = lazyDb as PrismaClient;

// Keep backward compatibility while we migrate naming across the app.
export const prisma = db;
