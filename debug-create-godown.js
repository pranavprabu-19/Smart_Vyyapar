
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const existing = await prisma.godown.findFirst();
        if (existing) {
            console.log('Godown already exists:', existing);
        } else {
            const newGodown = await prisma.godown.create({
                data: {
                    name: 'Main Warehouse',
                    location: 'Chennai',
                    manager: 'Admin',
                    contact: '9999999999'
                }
            });
            console.log('Created Godown:', newGodown);
        }
        const count = await prisma.godown.count();
        console.log('Final Godown count:', count);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
