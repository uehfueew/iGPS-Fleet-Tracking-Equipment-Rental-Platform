import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get routes
router.get('/', async (req, res) => {
  try {
    const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: 'asc' } } }, orderBy: { id: 'desc' } });
    res.json(routes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create route
router.post('/', async (req, res) => {
  try {
    const { name, description, startLocation, endLocation } = req.body;
    const route = await prisma.route.create({
      data: { name, description, startLocation, endLocation }
    });
    res.json(route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get stops for route
router.get('/:id/stops', async (req, res) => {
  try {
    const stops = await prisma.stop.findMany({ where: { routeId: parseInt(req.params.id) } });
    res.json(stops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add stop to route
router.post('/:id/stops', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const { name, location, assignedTime, sequence } = req.body;
    const stop = await prisma.stop.create({
      data: { routeId, name, location, sequence: sequence || 0, assignedTime: assignedTime ? new Date(assignedTime) : null }
    });
    res.json(stop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const { name, description, startLocation, endLocation, stops } = req.body;
    
    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: { name, description, startLocation, endLocation }
    });

    if (stops) {
      // Recreate stops for simplicity
      await prisma.stop.deleteMany({ where: { routeId } });
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        await prisma.stop.create({
          data: { routeId, name: stop.name, location: stop.location, sequence: i }
        });
      }
    }
    
    res.json(updatedRoute);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    await prisma.stop.deleteMany({ where: { routeId } });
    await prisma.route.delete({ where: { id: routeId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
