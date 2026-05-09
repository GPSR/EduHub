import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { Pool } from "@neondatabase/serverless";

function resolveDatabaseUrl() {
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim();
  const fallbackUrl = process.env.DATABASE_URL?.trim();
  const selected = neonDatabaseUrl || fallbackUrl;

  if (!selected) {
    throw new Error("Missing DB config. Set NEON_DATABASE_URL (preferred) or DATABASE_URL.");
  }
  if (!selected.startsWith("postgres://") && !selected.startsWith("postgresql://")) {
    throw new Error("Database URL must be PostgreSQL/Neon.");
  }
  return selected;
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_app_migrations" (
      "id" TEXT PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function prismaMigrationsTableExists(client) {
  const result = await client.query(
    `SELECT to_regclass('_prisma_migrations') AS prisma_table`
  );
  return Boolean(result.rows[0]?.prisma_table);
}

async function listMigrationFiles(repoRoot) {
  const migrationsRoot = path.join(repoRoot, "prisma", "migrations");
  const dirents = await fs.readdir(migrationsRoot, { withFileTypes: true });

  const migrationDirs = dirents
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const result = [];
  for (const dirName of migrationDirs) {
    const filePath = path.join(migrationsRoot, dirName, "migration.sql");
    try {
      const sql = await fs.readFile(filePath, "utf8");
      result.push({ id: dirName, filePath, sql });
    } catch {
      // Ignore folders without migration.sql
    }
  }

  return result;
}

async function applyMigration(client, migration) {
  await client.query("BEGIN");
  try {
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO "_app_migrations" ("id", "checksum") VALUES ($1, $2)`,
      [migration.id, migration.checksum]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function bootstrapFromPrismaMigrations(client, migrationChecksumById) {
  const hasPrismaTable = await prismaMigrationsTableExists(client);
  if (!hasPrismaTable) return;

  const appCountResult = await client.query(`SELECT COUNT(*)::INT AS count FROM "_app_migrations"`);
  const appCount = Number(appCountResult.rows[0]?.count ?? 0);
  if (appCount > 0) return;

  const prismaRows = await client.query(`
    SELECT DISTINCT ON ("migration_name")
      "migration_name",
      "checksum",
      "finished_at"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
    ORDER BY "migration_name", "finished_at" DESC
  `);

  for (const row of prismaRows.rows) {
    const migrationId = row.migration_name;
    const checksum = migrationChecksumById.get(migrationId) ?? row.checksum ?? "unknown";
    await client.query(
      `INSERT INTO "_app_migrations" ("id", "checksum", "appliedAt")
       VALUES ($1, $2, NOW())
       ON CONFLICT ("id") DO NOTHING`,
      [migrationId, checksum]
    );
  }
}

async function main() {
  const repoRoot = process.cwd();
  const migrations = await listMigrationFiles(repoRoot);
  const dbUrl = resolveDatabaseUrl();

  if (migrations.length === 0) {
    console.log("No SQL migrations found under prisma/migrations.");
    return;
  }

  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    for (const migration of migrations) {
      migration.checksum = sha256(migration.sql);
    }
    const migrationChecksumById = new Map(migrations.map((migration) => [migration.id, migration.checksum]));

    await ensureMigrationsTable(client);
    await bootstrapFromPrismaMigrations(client, migrationChecksumById);

    const appliedRows = await client.query(`SELECT "id", "checksum" FROM "_app_migrations"`);
    const appliedMap = new Map(appliedRows.rows.map((row) => [row.id, row.checksum]));

    let appliedCount = 0;
    for (const migration of migrations) {
      if (appliedMap.has(migration.id)) {
        const existingChecksum = appliedMap.get(migration.id);
        if (existingChecksum !== migration.checksum) {
          throw new Error(
            `Checksum mismatch for migration ${migration.id}. Existing: ${existingChecksum}, file: ${migration.checksum}`
          );
        }
        console.log(`skip  ${migration.id}`);
        continue;
      }

      console.log(`apply ${migration.id}`);
      await applyMigration(client, migration);
      appliedCount += 1;
    }

    console.log(`Migrations complete. Applied: ${appliedCount}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
