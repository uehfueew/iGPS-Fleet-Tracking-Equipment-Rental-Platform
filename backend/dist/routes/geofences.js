"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const geofences = await db_1.prisma.geofence.findMany();
        res.json(geofences);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { name, polygon, vehicleId } = req.body;
    try {
        const gf = await db_1.prisma.geofence.create({
            data: { name, polygon, vehicleId }
        });
        res.json(gf);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        await db_1.prisma.geofence.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
