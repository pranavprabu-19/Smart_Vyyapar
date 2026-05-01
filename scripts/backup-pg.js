/**
 * SmartVyapar V2 — Postgres backup
 *
 * Creates a timestamped pg_dump of the database referenced by DATABASE_URL
 * (falls back to DIRECT_URL) into backups/<timestamp>/db.sql. Public uploads
 * are copied alongside for full local restore.
 *
 * Requirements: `pg_dump` available on PATH. On Windows, install Postgres
 * client tools (https://www.postgresql.org/download/windows/) and ensure the
 * bin folder is in PATH.
 *
 * Usage: `npm run backup:pg`
 */

const fs = require("fs/promises");
const path = require("path");
const { spawnSync } = require("child_process");

require("dotenv").config();

function tsStamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }
}

async function main() {
  const repoRoot = process.cwd();
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL / DIRECT_URL not set");
    process.exit(1);
  }
  if (url.startsWith("file:")) {
    console.error(
      "DATABASE_URL points to a SQLite file. Use scripts/backup-local.js instead."
    );
    process.exit(2);
  }

  const backupsRoot = path.join(repoRoot, "backups");
  const backupDir = path.join(backupsRoot, tsStamp());
  await fs.mkdir(backupDir, { recursive: true });

  const dumpFile = path.join(backupDir, "db.sql");
  console.log(`Running pg_dump -> ${dumpFile}`);

  const result = spawnSync(
    "pg_dump",
    ["--no-owner", "--no-privileges", "--format=plain", "--file", dumpFile, url],
    { stdio: "inherit", shell: process.platform === "win32" }
  );

  if (result.status !== 0) {
    console.error(`pg_dump exited with code ${result.status}`);
    process.exit(result.status ?? 3);
  }

  const uploadsDir = path.join(repoRoot, "public", "uploads");
  if (await exists(uploadsDir)) {
    await copyDir(uploadsDir, path.join(backupDir, "uploads"));
  }

  console.log(`Backup created at: ${backupDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
