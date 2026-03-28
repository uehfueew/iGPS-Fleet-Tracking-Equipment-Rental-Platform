import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all automated reports
router.get('/', async (req, res) => {
  try {
    const reports = await prisma.automatedReport.findMany({
      include: { creator: true }
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create automated report
router.post('/', async (req, res) => {
  try {
    const { name, type, schedule, emailList, createdById } = req.body;
    
    // fallback createdById if not provided to the active user's id (req.user is set by authenticateToken but we haven't typed it strongly here)
    const userId = createdById || (req as any).user.id;

    const report = await prisma.automatedReport.create({
      data: { name, type, schedule, emailList, createdById: userId }
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete automated report
router.delete('/:id', async (req, res) => {
  try {
    await prisma.automatedReport.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
