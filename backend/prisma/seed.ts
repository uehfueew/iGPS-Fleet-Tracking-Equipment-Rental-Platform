import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with dynamic data...');

  // 1. Create a few Subaccounts
  const subaccounts = [];
  for (let i = 0; i < 3; i++) {
    const subaccount = await prisma.subaccount.create({
      data: {
        name: faker.company.name(),
      },
    });
    subaccounts.push(subaccount);
  }
  console.log(`Created ${subaccounts.length} subaccounts`);

  // 2. Create Groups
  const groups = [];
  for (let i = 0; i < 5; i++) {
    const group = await prisma.group.create({
      data: {
        name: faker.commerce.department(),
        description: faker.company.catchPhrase(),
        subaccountId: faker.helpers.arrayElement(subaccounts).id,
      },
    });
    groups.push(group);
  }
  console.log(`Created ${groups.length} groups`);

  // 3. Create Vehicles
  const vehicles = [];
  for (let i = 0; i < 20; i++) {
    const vehicle = await prisma.vehicle.create({
      data: {
        name: `${faker.vehicle.manufacturer()} ${faker.vehicle.model()}`,
        licensePlate: faker.vehicle.vrm(),
        deviceId: faker.string.uuid(),
        groupId: faker.helpers.arrayElement(groups).id,
      },
    });
    vehicles.push(vehicle);
  }
  console.log(`Created ${vehicles.length} vehicles`);

  // 4. Create Positions for each Vehicle to simulate movement
  let positionsCreated = 0;
  for (const vehicle of vehicles) {
    // Generate an initial random location somewhere in the US
    let currentLat = faker.location.latitude({ min: 25, max: 48 });
    let currentLng = faker.location.longitude({ min: -125, max: -70 });

    for (let j = 0; j < 10; j++) {
      // Simulate moving a little bit from the previous point
      currentLat += faker.number.float({ min: -0.01, max: 0.01 });
      currentLng += faker.number.float({ min: -0.01, max: 0.01 });

      await prisma.position.create({
        data: {
          vehicleId: vehicle.id,
          latitude: currentLat,
          longitude: currentLng,
          speed: faker.number.float({ min: 0, max: 80 }),
          heading: faker.number.float({ min: 0, max: 360 }),
          fuelLevel: faker.number.float({ min: 10, max: 100 }),
          timestamp: faker.date.recent({ days: 1 }), // Random time in the last 24 hours
        },
      });
      positionsCreated++;
    }
  }
  console.log(`Created ${positionsCreated} positions`);

  // 5. Create drivers and driver logs
  const drivers = [];
  for (let i = 0; i < 10; i++) {
    const driver = await prisma.driver.create({
      data: {
        name: faker.person.fullName(),
        licenseNumber: faker.vehicle.vrm(),
        contact: faker.phone.number(),
      },
    });
    drivers.push(driver);
  }
  console.log(`Created ${drivers.length} drivers`);

  // 6. Create Equipment for rental
  const equipment = [];
  for (let i = 0; i < 15; i++) {
    const item = await prisma.equipment.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        pricePerDay: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
        available: faker.datatype.boolean(),
      },
    });
    equipment.push(item);
  }
  console.log(`Created ${equipment.length} equipment items`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });