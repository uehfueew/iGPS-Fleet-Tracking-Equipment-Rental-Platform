import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { createClient } from 'redis';

export const prisma = new PrismaClient();

export const pgPool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'igps',
  password: 'igps123',
  database: 'igps_db',
});

export const tsPool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'igps',
  password: 'igps123',
  database: 'igps_ts',
});

export const redisClient = createClient({
  url: 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect();