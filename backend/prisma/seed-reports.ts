import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany();

  for (const vehicle of vehicles) {
    const positions = await prisma.position.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { timestamp: 'asc' },
    });

    let currentFuel = 100.0;
    
    for (let i = 0; i < positions.length; i++) {
      let heading = Math.floor(Math.random() * 360);
      if (i > 0) {
        const prev = positions[i-1];
        const curr = positions[i];
        
        const dLat = curr.latitude - prev.latitude;
        const dLng = curr.longitude - prev.longitude;
        // Simple angle approximation
        heading = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
        
        // Approximate distance distance in km
        const dist = Math.sqrt(dLat*dLat + dLng*dLng) * 111; 
        currentFuel -= dist * 0.1; // Fake consumption
        if (currentFuel < 5) currentFuel = 100.0; // "Refuel"
      }
      
      await prisma.position.update({
        where: { id: positions[i].id },
        data: {
          heading,
          fuelLevel: currentFuel
        }
      });
    }
  }

  // Update equipments prices
  await prisma.equipment.updateMany({
    where: { name: 'Basic GPS Tracker' },
    data: { pricePerDay: 75.00 } // 75 eur
  });
  
  const plan = await prisma.plan.findFirst({ where: { name: 'Basic Tracking' } });
  if (plan) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: { pricePerVehicle: 5.20 } // 5.20 eur
    });
  } else {
    await prisma.plan.create({
      data: {
        name: 'Basic Tracking',
        pricePerVehicle: 5.20
      }
    });
  }

  console.log("Database seeded with new fuel, heading, and pricing data!");
}

main()
  .catch((e) => {
    console.error(e);
    
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
