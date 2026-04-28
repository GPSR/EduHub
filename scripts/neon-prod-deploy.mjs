import { spawnSync } from "node:child_process";

const neonUrl = process.env.NEON_DATABASE_URL?.trim();
const fallbackUrl = process.env.DATABASE_URL?.trim();
const databaseUrl = neonUrl || fallbackUrl;

if (!databaseUrl) {
  console.error("Missing NEON_DATABASE_URL (preferred) or DATABASE_URL for production deploy.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  }
);

process.exit(result.status ?? 1);
