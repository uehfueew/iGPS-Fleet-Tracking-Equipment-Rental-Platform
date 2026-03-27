import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding extra database details without deleting existing data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: passwordHash, role: 'admin' },
  });

  const client = await prisma.user.upsert({
    where: { username: 'client1' },
    update: {},
    create: { username: 'client1', password: passwordHash, role: 'client' },
  });

  const v1 = await prisma.vehicle.upsert({
    where: { licensePlate: 'FT-1001' },
    update: {},
    create: { name: 'Delivery Truck 01', licensePlate: 'FT-1001', deviceId: 'DEV-9991' }
  });

  const v2 = await prisma.vehicle.upsert({
    where: { licensePlate: 'FT-1002' },
    update: {},
    create: { name: 'Service Van 02', licensePlate: 'FT-1002', deviceId: 'DEV-9992' }
  });

  const v3 = await prisma.vehicle.upsert({
    where: { licensePlate: 'FT-1003' },
    update: {},
    create: { name: 'Heavy Excavator', licensePlate: 'FT-1003', deviceId: 'DEV-9993' }
  });

  await prisma.position.createMany({
    data: [
      { vehicleId: v1.id, latitude: 40.7128, longitude: -74.0060, speed: 45 },
      { vehicleId: v1.id, latitude: 40.7138, longitude: -74.0070, speed: 50 },
      { vehicleId: v2.id, latitude: 34.0522, longitude: -118.2437, speed: 0 },
    ],
    skipDuplicates: true
  });

  const eq1 = await prisma.equipment.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Caterpillar 320 Excavator', description: 'Heavy duty tracked excavator', pricePerDay: 450, available: true }
  });
  
  const eq2 = await prisma.equipment.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Bobcat T590 Skid Steer', description: 'Compact track loader', pricePerDay: 200, available: false }
  });

  await prisma.rental.createMany({
    data: [{
      equipmentId: eq2.id,
      clientId: client.id,
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'active'
    }],
    skipDuplicates: true
  });

  await prisma.alert.createMany({
    data: [
      { vehicleId: v1.id, type: 'geofence_exit', message: 'Delivery Truck 01 exited Downtown HQ', isRead: false },
      { vehicleId: v2.id, type: 'speeding', message: 'Service Van 02 exceeded speed limit (75 mph)', isRead: true },
      { vehicleId: v3.id, type: 'maintenance', message: 'Heavy Excavator engine hours exceeded 500h', isRead: false },
    ],
    skipDuplicates: true
  });

  console.log('Seeding completed.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
