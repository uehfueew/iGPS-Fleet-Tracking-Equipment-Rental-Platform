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
        const drivers = await db_1.prisma.driver.findMany({
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
        res.json({ ...driver, driverLogs: [] });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update driver
router.put('/:id', async (req, res) => {
    try {
        const { name, licenseNumber, contact } = req.body;
        const driver = await db_1.prisma.driver.update({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete driver
router.delete('/:id', async (req, res) => {
    try {
        await db_1.prisma.driverLog.deleteMany({
            where: { driverId: parseInt(req.params.id) }
        });
        await db_1.prisma.driver.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Log an action (e.g., CHECK_OUT, CHECK_IN, MAINTENANCE)
router.post('/:id/logs', async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        const { vehicleId, action, notes } = req.body;
        const log = await db_1.prisma.driverLog.create({
            data: { driverId, vehicleId: parseInt(vehicleId), action, notes }
        });
        const logWithVehicle = await db_1.prisma.driverLog.findUnique({
            where: { id: log.id },
            include: { vehicle: true }
        });
        res.json(logWithVehicle);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
