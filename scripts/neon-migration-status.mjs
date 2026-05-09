import { execSync } from "node:child_process";

function count(cmd) {
  return Number(execSync(cmd, { encoding: "utf8" }).trim() || "0");
}

const prismaImportFiles = count("rg -l \"from \\\"@/lib/db\\\"|from '\\\"@/lib/db\\\"'\" app lib | wc -l");
const prismaCallSites = count("rg -o \"\\bdb\\.[A-Za-z0-9_]+\" app lib | wc -l");
const neonImportFiles = count("rg -l \"from \\\"@/lib/neon-db\\\"|from '\\\"@/lib/neon-db\\\"'\" app lib | wc -l");

console.log(JSON.stringify({
  prismaImportFiles,
  prismaCallSites,
  neonImportFiles,
  migratedPercentByFile: prismaImportFiles + neonImportFiles === 0
    ? 0
    : Number(((neonImportFiles / (prismaImportFiles + neonImportFiles)) * 100).toFixed(2))
}, null, 2));
