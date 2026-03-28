"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
// Get all fuel logs
router.get('/', async (req, res) => {
    try {
        const logs = await db_1.prisma.fuelLog.findMany({
            include: { vehicle: true },
            orderBy: { timestamp: 'desc' }
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add fuel log
router.post('/', async (req, res) => {
    try {
        const { vehicleId, amount, cost } = req.body;
        const fuelLog = await db_1.prisma.fuelLog.create({
            data: { vehicleId, amount, cost }
        });
        res.json(fuelLog);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
