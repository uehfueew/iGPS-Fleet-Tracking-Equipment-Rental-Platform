import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all subaccounts
router.get('/', async (req, res) => {
  try {
    const subaccounts = await prisma.subaccount.findMany({ include: { users: true, groups: true } });
    res.json(subaccounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create subaccount
router.post('/', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const subaccount = await prisma.subaccount.create({
      data: { name, parentId: parentId || null }
    });
    res.json(subaccount);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
