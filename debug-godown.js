
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const count = await prisma.godown.count();
        console.log('Godown count:', count);
        const godowns = await prisma.godown.findMany();
        console.log('Godowns:', godowns);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
