/**
 * Phase 0b preflight: probe SELECT 1 on both Supabase URLs.
 * Exits 0 only if both succeed.
 */
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

async function probe(label, urlEnvKey) {
  const url = process.env[urlEnvKey];
  if (!url) {
    console.error(`[${label}] ${urlEnvKey} is missing`);
    return false;
  }
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["warn", "error"],
  });
  try {
    const rows = await client.$queryRawUnsafe("SELECT 1 as ok");
    console.log(
      `[${label}] OK via ${urlEnvKey} -> ${JSON.stringify(rows)}`
    );
    return true;
  } catch (err) {
    console.error(`[${label}] FAIL via ${urlEnvKey}:`);
    console.error(`  ${err.code || ""} ${err.message}`);
    if (err.meta) console.error(`  meta: ${JSON.stringify(err.meta)}`);
    return false;
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

(async () => {
  const a = await probe("DATABASE_URL (pooler 6543)", "DATABASE_URL");
  const b = await probe("DIRECT_URL    (pooler 5432)", "DIRECT_URL");
  if (!(a && b)) {
    process.exit(1);
  }
  console.log("\nPreflight passed. Supabase reachable on both URLs.");
})();
