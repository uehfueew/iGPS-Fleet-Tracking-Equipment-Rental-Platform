import express from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { equipmentId, startDate, endDate, addTracking } = req.body;
  const clientId = req.user.id;

  try {
    // Check availability
    const overlappingRentals = await prisma.rental.findMany({
      where: {
        equipmentId,
        status: { in: ['approved', 'active'] },
        OR: [
          { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } }
        ]
      }
    });

    if (overlappingRentals.length > 0) {
      return res.status(400).json({ error: 'Equipment already booked for these dates' });
    }

    const rental = await prisma.rental.create({
      data: {
        equipmentId,
        clientId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'pending'
      }
    });

    // Upsell logic
    if (addTracking) {
      const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (equipment) {
        const vehicle = await prisma.vehicle.create({
          data: {
            name: `Rental: ${equipment.name}`,
            licensePlate: `RENTAL-${rental.id}-${Date.now().toString().slice(-4)}`,
            deviceId: `DEV-${rental.id}`
          }
        });
      }
    }

    res.json(rental);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let rentals;
    if (req.user.role === 'admin') {
      rentals = await prisma.rental.findMany({ include: { equipment: true, client: true } });
    } else {
      rentals = await prisma.rental.findMany({ 
        where: { clientId: req.user.id },
        include: { equipment: true }
      });
    }
    res.json(rentals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  const { status } = req.body; // 'approved', 'declined', etc.
  try {
    const rental = await prisma.rental.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(rental);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;