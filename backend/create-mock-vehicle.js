const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking for TEST-TRACKER-001...");
        const existing = await prisma.vehicle.findFirst({
            where: { deviceId: 'TEST-TRACKER-001' }
        });

        if (existing) {
            console.log("Vehicle already exists, skipping creation.");
            return;
        }

        // We need a userId/companyId to attach the vehicle to.
        // Let's just find the first available user/company.
        const user = await prisma.user.findFirst();

        if (!user) {
            console.error("No users found in the DB. Please create a user/admin account first via the frontend.");
            return;
        }

        console.log("Creating mock vehicle 'TEST-TRACKER-001' attached to user ID:", user.id);

        await prisma.vehicle.create({
            data: {
                deviceId: 'TEST-TRACKER-001',
                name: 'Mock Delivery Truck',
                licensePlate: 'SYS-MOCK'
            }
        });

        console.log("Mock vehicle created successfully!");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
