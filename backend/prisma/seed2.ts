import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.alert.deleteMany();
  await prisma.position.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: { username: 'admin', password: passwordHash, role: 'admin' },
  });

  const client = await prisma.user.create({
    data: { username: 'client', password: passwordHash, role: 'client' },
  });

  console.log('Created users:', admin.username, client.username);

  const vehicle1 = await prisma.vehicle.create({
    data: { name: 'Delivery Truck Alpha', licensePlate: 'ABC-123', deviceId: 'DEV001' }
  });
  const vehicle2 = await prisma.vehicle.create({
    data: { name: 'Service Van Beta', licensePlate: 'XYZ-987', deviceId: 'DEV002' }
  });

  const now = new Date();
  const positions = [];
  for (let i = 0; i < 20; i++) {
    positions.push({
      vehicleId: vehicle1.id,
      latitude: 42.0 + (Math.random() * 0.1 - 0.05),
      longitude: 21.0 + (Math.random() * 0.1 - 0.05),
      speed: 40 + Math.random() * 40,
      timestamp: new Date(now.getTime() - (20 - i) * 15 * 60000),
    });
  }

  await prisma.position.createMany({ data: positions });

  const eq1 = await prisma.equipment.create({
    data: { name: 'Trimble R12i GNSS', description: 'Advanced GNSS rover', pricePerDay: 150.0, available: true }
  });
  const eq2 = await prisma.equipment.create({
    data: { name: 'DJI Phantom 4 RTK', description: 'Mapping drone', pricePerDay: 200.0, available: true }
  });
  const eq3 = await prisma.equipment.create({
    data: { name: 'Leica TS16 Total Station', description: 'Precision robotic total station', pricePerDay: 180.0, available: false }
  });

  await prisma.rental.create({
    data: {
      equipmentId: eq1.id,
      clientId: client.id,
      startDate: new Date(now.getTime() + 86400000),
      endDate: new Date(now.getTime() + 86400000 * 5),
      status: 'pending'
    }
  });

  await prisma.rental.create({
    data: {
      equipmentId: eq3.id,
      clientId: client.id,
      startDate: new Date(now.getTime() - 86400000 * 2),
      endDate: new Date(now.getTime() + 86400000 * 2),
      status: 'active'
    }
  });

  await prisma.geofence.create({
    data: {
      name: 'Central Depot Hub',
      polygon: [[42.02, 21.02], [42.05, 21.02], [42.05, 21.05], [42.02, 21.05]],
    }
  });

  await prisma.alert.create({
    data: {
      vehicleId: vehicle1.id,
      type: 'Speed',
      message: 'Speed limit exceeded (85 km/h) on Interstate 1',
      isRead: false,
    }
  });
  await prisma.alert.create({
    data: {
      vehicleId: vehicle2.id,
      type: 'Geofence',
      message: 'Geofence violation: exited Central Depot',
      isRead: true,
      timestamp: new Date(now.getTime() - 3600000)
    }
  });

  console.log('Seeding complete!');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());