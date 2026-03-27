"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const { equipmentId, startDate, endDate, addTracking } = req.body;
    const clientId = req.user.id;
    try {
        // Check availability
        const overlappingRentals = await db_1.prisma.rental.findMany({
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
        const rental = await db_1.prisma.rental.create({
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
            const equipment = await db_1.prisma.equipment.findUnique({ where: { id: equipmentId } });
            if (equipment) {
                const vehicle = await db_1.prisma.vehicle.create({
                    data: {
                        name: `Rental: ${equipment.name}`,
                        licensePlate: `RENTAL-${rental.id}-${Date.now().toString().slice(-4)}`,
                        deviceId: `DEV-${rental.id}`
                    }
                });
            }
        }
        res.json(rental);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        let rentals;
        if (req.user.role === 'admin') {
            rentals = await db_1.prisma.rental.findMany({ include: { equipment: true, client: true } });
        }
        else {
            rentals = await db_1.prisma.rental.findMany({
                where: { clientId: req.user.id },
                include: { equipment: true }
            });
        }
        res.json(rentals);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id/status', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { status } = req.body; // 'approved', 'declined', etc.
    try {
        const rental = await db_1.prisma.rental.update({
            where: { id: Number(req.params.id) },
            data: { status },
        });
        res.json(rental);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
