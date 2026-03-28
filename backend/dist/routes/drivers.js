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
// Get all drivers
router.get('/', async (req, res) => {
    try {
        const drivers = await db_1.prisma.driver.findMany({ include: { driverLogs: true } });
        res.json(drivers);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create driver
router.post('/', async (req, res) => {
    try {
        const { name, licenseNumber, contact } = req.body;
        const driver = await db_1.prisma.driver.create({
            data: { name, licenseNumber, contact }
        });
        res.json(driver);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Log an action (e.g., LOGIN, LOGOUT)
router.post('/:id/logs', async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        const { vehicleId, action, notes } = req.body;
        const log = await db_1.prisma.driverLog.create({
            data: { driverId, vehicleId, action, notes }
        });
        res.json(log);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
