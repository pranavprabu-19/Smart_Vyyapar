import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@smartvyapar.com';
    const password = 'admin'; // Simple password for dev
    const companyName = 'Sai Associates'; // Default company

    let user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log('Admin user not found. Creating...');
        user = await prisma.user.create({
            data: {
                name: 'Super Admin',
                email,
                password,
                role: 'ADMIN',
                companyName,
            },
        });
        console.log('Admin user created!');
    } else {
        console.log('Admin user already exists.');
        // Optional: Update password to ensure we know it
        // await prisma.user.update({
        //   where: { email },
        //   data: { password }
        // });
        // console.log('Admin password reset to: ' + password);
    }

    console.log('------------------------------------------------');
    console.log('LOGIN CREDENTIALS:');
    console.log('Email:    ', user.email);
    console.log('Password: ', user.password); // In a real app, never print passwords
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
