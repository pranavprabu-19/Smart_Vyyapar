const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

function readArg(name) {
  const key = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(key));
  return hit ? hit.slice(key.length) : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function randomPassword(len = 12) {
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = (readArg("email") || process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@smartvyapar.local").trim().toLowerCase();
    const name = (readArg("name") || process.env.BOOTSTRAP_ADMIN_NAME || "SmartVyapar Admin").trim();
    const companyName = (readArg("company") || process.env.BOOTSTRAP_ADMIN_COMPANY || "Sai Associates").trim();
    const forceReset = hasFlag("reset-password");
    const password =
      readArg("password") ||
      process.env.BOOTSTRAP_ADMIN_PASSWORD ||
      randomPassword(12);
    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role: "ADMIN",
          password: hashed,
          companyName,
        },
      });
      console.log("Admin user created.");
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${password}`);
      console.log(`Company: ${user.companyName || "-"}`);
      return;
    }

    if (forceReset) {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          password: hashed,
          role: "ADMIN",
          name: existing.name || name,
          companyName: existing.companyName || companyName,
        },
      });
      console.log("Existing admin password reset.");
      console.log(`Email: ${updated.email}`);
      console.log(`Password: ${password}`);
      console.log(`Company: ${updated.companyName || "-"}`);
      return;
    }

    console.log("Admin user already exists. No changes made.");
    console.log(`Email: ${existing.email}`);
    console.log(`Role: ${existing.role}`);
    console.log("Use --reset-password to rotate password.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

