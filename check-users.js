const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking users in database...");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });
  console.log("Users found:", users.length);
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
