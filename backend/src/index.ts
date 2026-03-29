import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Parser } from 'json2csv';
import { pgPool, tsPool, prisma } from './db';  // import prisma, pgPool, tsPool
import authRouter from './routes/auth';
import equipmentRouter from './routes/equipment';
import rentalsRouter from './routes/rentals';
import geofencesRouter from './routes/geofences';
import alertsRouter from './routes/alerts';
import billingRouter from './routes/billing';
import reportsRouter from "./routes/reports";
import subaccountsRouter from './routes/subaccounts';
import groupsRouter from './routes/groups';
import driversRouter from './routes/drivers';
import fuelRouter from './routes/fuel';
import routesApiRouter from './routes/routes_api';
import automatedReportsRouter from './routes/automated_reports';
import profileRouter from './routes/profile';
import webhooksRouter from './routes/webhooks';
import { authenticateToken, requireRole } from './middleware/auth';
import { isPointInPolygon } from './utils/geo';
import { z } from 'zod';
import { initScheduler } from './scheduler';

const vehicleSchema = z.object({
  name: z.string().min(1),
  licensePlate: z.string().min(1),
  deviceId: z.string().optional(),
  routeId: z.number().nullable().optional(),
  groupId: z.number().nullable().optional()
});

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible inside express routes (like our webhooks)
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(limiter);

app.use('/api/auth', authRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/geofences', geofencesRouter);
app.use('/api/alerts', alertsRouter);
app.use("/api/reports", reportsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/subaccounts', subaccountsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/fuel', fuelRouter);
app.use('/api/routes_api', routesApiRouter);
app.use('/api/automated_reports', automatedReportsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/webhooks', webhooksRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Test raw PostgreSQL connection (optional)
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT NOW()');
    res.json({ time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Prisma connection
app.get('/api/test-prisma', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ userCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const validatedData = vehicleSchema.parse(req.body);
    const vehicle = await prisma.vehicle.create({
      data: validatedData,
    });
    res.json(vehicle);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: (err as any).errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all vehicles
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { route: true },
      orderBy: { id: 'asc' }
    });
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  // Update a vehicle (and link its tracker)
  app.put('/api/vehicles/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = vehicleSchema.parse(req.body);
      const vehicle = await prisma.vehicle.update({
        where: { id: parseInt(id as string) },
        data: validatedData,
      });
      res.json(vehicle);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: (err as any).errors });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a vehicle
  app.delete('/api/vehicles/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.vehicle.delete({
        where: { id: parseInt(id as string) },
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/positions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { vehicleId, latitude, longitude, speed, timestamp } = req.body;
      const position = await prisma.position.create({
        data: { vehicleId, latitude, longitude, speed, timestamp }
      });
    
    // Emit new position to socket connected clients
    io.emit('new-position', {
      vehicleId: position.vehicleId,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed,
      timestamp: position.timestamp
    });

    // Check Geofences
    const geofences = await prisma.geofence.findMany();
    for (const gf of geofences) {
      const polygon = gf.polygon as [number, number][];
      const isInside = isPointInPolygon([latitude, longitude], polygon);
      
      // We would ideally verify the *previous* state to determine if it's an "enter" or "exit"
      // For simplicity, we just generate "enter" if inside, but better to just do this properly.
      // We will skip full state diffing here to keep it simpler, or fetch previous point.
      const lastPos = await prisma.position.findFirst({
        where: { vehicleId, id: { not: position.id } },
        orderBy: { timestamp: 'desc' }
      });

      if (lastPos) {
        const wasInside = isPointInPolygon([lastPos.latitude, lastPos.longitude], polygon);
        if (!wasInside && isInside) {
          await prisma.alert.create({
            data: { vehicleId, type: 'geofence_enter', message: `Vehicle entered geofence: ${gf.name}` }
          });
        } else if (wasInside && !isInside) {
          await prisma.alert.create({
            data: { vehicleId, type: 'geofence_exit', message: `Vehicle exited geofence: ${gf.name}` }
          });
        }
      }
    }

    res.json(position);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles/:id/positions', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  try {
    const where: any = { vehicleId: parseInt(id as string) };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from as string);
      if (to) where.timestamp.lte = new Date(to as string);
    }
    const positions = await prisma.position.findMany({
      where,
      orderBy: { timestamp: 'asc' }
    });
    res.json(positions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles/:id/positions/export', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  try {
    const where: any = { vehicleId: parseInt(id as string) };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from as string);
      if (to) where.timestamp.lte = new Date(to as string);
    }
    const positions = await prisma.position.findMany({
      where,
      orderBy: { timestamp: 'asc' }
    });

    const fields = ['id', 'vehicleId', 'latitude', 'longitude', 'speed', 'timestamp'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(positions);

    res.header('Content-Type', 'text/csv');
    res.attachment(`vehicle-${id}-positions.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get the latest position
app.get('/api/vehicles/:id/latest-position', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id as string);
  try {
    const position = await prisma.position.findFirst({
      where: { vehicleId: id },
      orderBy: { timestamp: 'desc' }
    });
    res.json(position || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initScheduler(); // Initialize reports scheduler
});