import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get available vehicles not assigned to any group
router.get('/available-vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { groupId: null }
    });
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({ 
      include: { 
        vehicles: true, 
        subaccount: true,
        subgroups: {
          include: { vehicles: true }
        },
        parent: true
      } 
    });
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create group
router.post('/', async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    const group = await prisma.group.create({
      data: { 
        name, 
        description, 
        parentId: parentId ? parseInt(parentId) : null 
      }
    });
    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update group
router.put('/:id', async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    const group = await prisma.group.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        description,
        parentId: parentId ? parseInt(parentId) : null
      }
    });
    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    // First remove parentId from subgroups if any
    await prisma.group.updateMany({
      where: { parentId: parseInt(req.params.id) },
      data: { parentId: null }
    });
    
    // Then unlink vehicles 
    await prisma.vehicle.updateMany({
      where: { groupId: parseInt(req.params.id) },
      data: { groupId: null }
    });

    await prisma.group.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Assign vehicle to group
router.post('/:id/vehicles', async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(vehicleId) },
      data: { groupId: parseInt(req.params.id) }
    });
    res.json(vehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove vehicle from group
router.delete('/:id/vehicles/:vehicleId', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(req.params.vehicleId) },
      data: { groupId: null }
    });
    res.json(vehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
