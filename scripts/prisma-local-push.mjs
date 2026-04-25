import { spawnSync } from "node:child_process";

const localUrl = process.env.LOCAL_DATABASE_URL?.trim();
const fallbackUrl = process.env.DATABASE_URL?.trim();
const databaseUrl = localUrl || fallbackUrl;

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run local db push in production.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Missing LOCAL_DATABASE_URL (preferred) or DATABASE_URL for local db push.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["prisma", "db", "push"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  }
);

process.exit(result.status ?? 1);
