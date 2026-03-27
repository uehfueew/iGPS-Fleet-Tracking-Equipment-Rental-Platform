import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedPositions() {
  console.log('Seeding simulated GPS positions...');
  const vehicles = await prisma.vehicle.findMany();
  
  if (vehicles.length === 0) {
    console.log('No vehicles found to seed positions.');
    return;
  }

  // Define some routes (New York / SF / etc or just abstract coords like 40.7, -74.0)
  // Let's use New York coordinates roughly: 40.7128, -74.0060

  const routes = [
    { baseLat: 40.7128, baseLng: -74.0060 },
    { baseLat: 40.7200, baseLng: -74.0100 },
    { baseLat: 40.7300, baseLng: -73.9900 },
    { baseLat: 40.7400, baseLng: -73.9800 },
  ];

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const route = routes[i % routes.length];
    
    // Generate 50 points over the last 2 hours
    const points = [];
    let currentLat = route.baseLat;
    let currentLng = route.baseLng;
    const now = Date.now();
    
    for (let p = 0; p < 50; p++) {
      // time steps of ~2.4 mins
      const timestamp = new Date(now - (50 - p) * 144000); 
      
      points.push({
        vehicleId: v.id,
        latitude: currentLat,
        longitude: currentLng,
        speed: Math.random() * 30 + 10,
        timestamp: timestamp
      });
      
      // Move a little bit
      currentLat += (Math.random() - 0.5) * 0.005;
      currentLng += (Math.random() - 0.5) * 0.005;
    }
    
    // Insert points
    for (const pt of points) {
      await pgPool.query(
        'INSERT INTO "Position" ("vehicleId", latitude, longitude, speed, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [pt.vehicleId, pt.latitude, pt.longitude, pt.speed, pt.timestamp]
      );
    }
  }

  console.log(`Seeded positions for ${vehicles.length} vehicles.`);
}

seedPositions().catch(console.error).finally(() => {
  prisma.$disconnect();
  pgPool.end();
});
