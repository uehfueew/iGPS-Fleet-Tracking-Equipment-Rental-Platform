import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all fuel logs
router.get('/', async (req, res) => {
  try {
    const logs = await prisma.fuelLog.findMany({
      include: { vehicle: true },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add fuel log
router.post('/', async (req, res) => {
  try {
    const { vehicleId, amount, cost } = req.body;
    const fuelLog = await prisma.fuelLog.create({
      data: { vehicleId, amount, cost }
    });
    res.json(fuelLog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
