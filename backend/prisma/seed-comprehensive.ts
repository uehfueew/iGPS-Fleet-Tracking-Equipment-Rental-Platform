import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding comprehensive data...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const techcorp = await prisma.user.upsert({
    where: { username: 'techcorp' },
    update: {},
    create: { username: 'techcorp', password: passwordHash, role: 'client' },
  });

  const admin2 = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: { username: 'superadmin', password: passwordHash, role: 'admin' },
  });

  const vehiclesData = [
    { name: 'Crane XC-900', licensePlate: 'FT-2001', deviceId: 'DEV-8001' },
    { name: 'Bulldozer B-Rex', licensePlate: 'FT-2002', deviceId: 'DEV-8002' },
    { name: 'Forklift F-150', licensePlate: 'FT-2003', deviceId: 'DEV-8003' },
    { name: 'Cement Mixer M-200', licensePlate: 'FT-2004', deviceId: 'DEV-8004' },
    { name: 'Scissor Lift S-300', licensePlate: 'FT-2005', deviceId: 'DEV-8005' },
    { name: 'Dump Truck DT-500', licensePlate: 'FT-2006', deviceId: 'DEV-8006' },
  ];

  const vehicles = [];
  for (const v of vehiclesData) {
    const created = await prisma.vehicle.upsert({
      where: { licensePlate: v.licensePlate },
      update: {},
      create: v,
    });
    vehicles.push(created);
  }

  // Equipment Fleet
  const equipmentData = [
    { id: 3, name: 'Komatsu D61EX Dozer', description: 'Advanced bulldozer with intelligent machine control, offering precise grading and pushing power. Ideal for heavy construction sites.', pricePerDay: 550, available: true },
    { id: 4, name: 'JCB 374 Excavator', description: 'Large crawler excavator suitable for deep digging and heavy lifting operations. Fuel efficient and powerful.', pricePerDay: 600, available: true },
    { id: 5, name: 'Volvo 3CX Backhoe Loader', description: 'Versatile backhoe loader capable of digging, loading, and carrying. Perfect for dynamic utility work.', pricePerDay: 350, available: false },
    { id: 6, name: 'Terex RT 90 Crane', description: 'Rough terrain crane handling up to 90 tons. Equipped with advanced stabilization technology.', pricePerDay: 1200, available: true },
    { id: 7, name: 'Manitou Aerial Work Platform', description: 'Telescopic boom lift offering safe access up to 80 feet. Excellent for high-reach maintenance.', pricePerDay: 400, available: true },
    { id: 8, name: 'Wacker Neuson Dumper', description: 'Articulated site dumper for moving loose materials across rough terrain efficiently.', pricePerDay: 250, available: false },
    { id: 9, name: 'Atlas Copco Light Tower', description: 'Mobile light tower providing brilliant illumination for night-time operation sights.', pricePerDay: 150, available: true }
  ];

  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { id: eq.id },
      update: { available: eq.available },
      create: eq,
    });
  }

  await prisma.rental.createMany({
    data: [
      { equipmentId: 5, clientId: techcorp.id, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: 'active',   },
      { equipmentId: 8, clientId: admin2.id, startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'active',   },
    ],
    skipDuplicates: true
  });

  await prisma.alert.createMany({
    data: [
      { vehicleId: vehicles[0].id, type: 'geofence_exit', message: 'Crane XC-900 breached Northern Sector perimeter.', isRead: false },
      { vehicleId: vehicles[1].id, type: 'maintenance', message: 'Bulldozer B-Rex engine oil pressure drop detected.', isRead: false },
      { vehicleId: vehicles[2].id, type: 'speeding', message: 'Forklift F-150 moving at excessive speed in warehouse zone.', isRead: false },
      { vehicleId: vehicles[3].id, type: 'info', message: 'Cement Mixer M-200 completed refuel stop.', isRead: true },
    ],
    skipDuplicates: true
  });

  console.log('Seeding done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());