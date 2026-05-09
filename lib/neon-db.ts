import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

export type SqlPrimitive = string | number | boolean | Date | null;

function resolveNeonDatabaseUrl() {
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim();
  const fallbackUrl = process.env.DATABASE_URL?.trim();
  const selected = neonDatabaseUrl || fallbackUrl;

  if (!selected) {
    throw new Error("Missing DB config. Set NEON_DATABASE_URL (preferred) or DATABASE_URL.");
  }
  if (!selected.startsWith("postgres://") && !selected.startsWith("postgresql://")) {
    throw new Error("DB URL must be a PostgreSQL/Neon connection string.");
  }

  return selected;
}

let cachedSql: NeonQueryFunction<false, false> | null = null;

function getSqlClient() {
  if (cachedSql) return cachedSql;

  // Keep defaults; avoid forcing websocket/polyfill settings unless needed.
  neonConfig.fetchConnectionCache = true;
  const databaseUrl = resolveNeonDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  cachedSql = neon(databaseUrl);
  return cachedSql;
}

export const neonSql = getSqlClient();

export async function queryRows<T = Record<string, unknown>>(query: string, params: SqlPrimitive[] = []): Promise<T[]> {
  const rows = await neonSql.query(query, params as never[]);
  return rows as T[];
}

export async function queryFirst<T = Record<string, unknown>>(query: string, params: SqlPrimitive[] = []): Promise<T | null> {
  const rows = await queryRows<T>(query, params);
  return rows[0] ?? null;
}

export async function execute(query: string, params: SqlPrimitive[] = []) {
  return neonSql.query(query, params as never[]);
}
