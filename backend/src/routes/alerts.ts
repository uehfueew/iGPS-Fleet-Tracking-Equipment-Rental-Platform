import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { timestamp: 'desc' },
      include: { vehicle: true },
      take: 50
    });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id as string);
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const updated = await prisma.alert.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;