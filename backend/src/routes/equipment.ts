import express from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const equipment = await prisma.equipment.findMany();
    res.json(equipment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const equip = await prisma.equipment.findUnique({ where: { id: Number(req.params.id) } });
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });
    res.json(equip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, description, pricePerDay } = req.body;
  try {
    const equip = await prisma.equipment.create({
      data: { name, description, pricePerDay },
    });
    res.json(equip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, description, pricePerDay, available } = req.body;
  try {
    const equip = await prisma.equipment.update({
      where: { id: Number(req.params.id) },
      data: { name, description, pricePerDay, available },
    });
    res.json(equip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await prisma.equipment.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;