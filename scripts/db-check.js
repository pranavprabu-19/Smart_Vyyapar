/**
 * SmartVyapar V2 — database check.
 *
 * Runs `prisma validate` and `prisma migrate status` in sequence so CI / pre-
 * deploy hooks can fail fast on schema drift, missing migrations, or invalid
 * relations. Exits non-zero if either command fails.
 *
 * Usage: `npm run db:check`
 */

const { spawnSync } = require("child_process");

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`Command failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "validate"]);
run("npx", ["prisma", "migrate", "status"]);
console.log("db:check passed");
