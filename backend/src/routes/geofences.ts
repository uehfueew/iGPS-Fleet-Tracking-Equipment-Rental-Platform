import express from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const geofences = await prisma.geofence.findMany();
    res.json(geofences);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, polygon, vehicleId } = req.body;
  try {
    const gf = await prisma.geofence.create({
      data: { name, polygon, vehicleId }
    });
    res.json(gf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await prisma.geofence.delete({ where: { id: parseInt(req.params.id as string) } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;