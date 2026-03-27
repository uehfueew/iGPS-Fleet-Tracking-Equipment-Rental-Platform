"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const equipment = await db_1.prisma.equipment.findMany();
        res.json(equipment);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const equip = await db_1.prisma.equipment.findUnique({ where: { id: Number(req.params.id) } });
        if (!equip)
            return res.status(404).json({ error: 'Equipment not found' });
        res.json(equip);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { name, description, pricePerDay } = req.body;
    try {
        const equip = await db_1.prisma.equipment.create({
            data: { name, description, pricePerDay },
        });
        res.json(equip);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { name, description, pricePerDay, available } = req.body;
    try {
        const equip = await db_1.prisma.equipment.update({
            where: { id: Number(req.params.id) },
            data: { name, description, pricePerDay, available },
        });
        res.json(equip);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        await db_1.prisma.equipment.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
