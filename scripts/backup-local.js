const fs = require("fs/promises");
const path = require("path");

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

function tsStamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();
  const dbPath = path.join(repoRoot, "prisma", "dev.db");
  const uploadsDir = path.join(repoRoot, "public", "uploads");
  const backupsRoot = path.join(repoRoot, "backups");
  const backupDir = path.join(backupsRoot, tsStamp());

  await fs.mkdir(backupDir, { recursive: true });

  if (await exists(dbPath)) {
    await fs.copyFile(dbPath, path.join(backupDir, "dev.db"));
  }
  if (await exists(uploadsDir)) {
    await copyDir(uploadsDir, path.join(backupDir, "uploads"));
  }

  console.log(`Backup created at: ${backupDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

