import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get routes
router.get('/', async (req, res) => {
  try {
    const routes = await prisma.route.findMany({ include: { stops: true } });
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
    const { name, location, assignedTime } = req.body;
    const stop = await prisma.stop.create({
      data: { routeId, name, location, assignedTime: assignedTime ? new Date(assignedTime) : null }
    });
    res.json(stop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
