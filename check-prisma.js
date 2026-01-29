const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('Checking for Photo model...');
    if (prisma.photo) {
        console.log('SUCCESS: prisma.photo exists!');
    } else {
        console.log('FAILURE: prisma.photo is undefined.');
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    }
}

check();
