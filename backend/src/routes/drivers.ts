import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({ 
      include: { 
        driverLogs: {
          include: {
            vehicle: true
          },
          orderBy: {
            timestamp: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(drivers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create driver
router.post('/', async (req, res) => {
  try {
    const { name, licenseNumber, contact } = req.body;
    const driver = await prisma.driver.create({
      data: { name, licenseNumber, contact }
    });
    res.json({ ...driver, driverLogs: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update driver
router.put('/:id', async (req, res) => {
  try {
    const { name, licenseNumber, contact } = req.body;
    const driver = await prisma.driver.update({
      where: { id: parseInt(req.params.id) },
      data: { name, licenseNumber, contact },
      include: {
        driverLogs: {
          include: { vehicle: true },
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    res.json(driver);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  try {
    await prisma.driverLog.deleteMany({
      where: { driverId: parseInt(req.params.id) }
    });
    
    await prisma.driver.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Log an action (e.g., CHECK_OUT, CHECK_IN, MAINTENANCE)
router.post('/:id/logs', async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    const { vehicleId, action, notes } = req.body;
    const log = await prisma.driverLog.create({
      data: { driverId, vehicleId: parseInt(vehicleId), action, notes }
    });
    
    const logWithVehicle = await prisma.driverLog.findUnique({
      where: { id: log.id },
      include: { vehicle: true }
    });
    res.json(logWithVehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
