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
// Get routes
router.get('/', async (req, res) => {
    try {
        const routes = await db_1.prisma.route.findMany({ include: { stops: { orderBy: { sequence: 'asc' } } }, orderBy: { id: 'desc' } });
        res.json(routes);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create route
router.post('/', async (req, res) => {
    try {
        const { name, description, startLocation, endLocation } = req.body;
        const route = await db_1.prisma.route.create({
            data: { name, description, startLocation, endLocation }
        });
        res.json(route);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get stops for route
router.get('/:id/stops', async (req, res) => {
    try {
        const stops = await db_1.prisma.stop.findMany({ where: { routeId: parseInt(req.params.id) } });
        res.json(stops);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add stop to route
router.post('/:id/stops', async (req, res) => {
    try {
        const routeId = parseInt(req.params.id);
        const { name, location, assignedTime, sequence } = req.body;
        const stop = await db_1.prisma.stop.create({
            data: { routeId, name, location, sequence: sequence || 0, assignedTime: assignedTime ? new Date(assignedTime) : null }
        });
        res.json(stop);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update route
router.put('/:id', async (req, res) => {
    try {
        const routeId = parseInt(req.params.id);
        const { name, description, startLocation, endLocation, stops } = req.body;
        const updatedRoute = await db_1.prisma.route.update({
            where: { id: routeId },
            data: { name, description, startLocation, endLocation }
        });
        if (stops) {
            // Recreate stops for simplicity
            await db_1.prisma.stop.deleteMany({ where: { routeId } });
            for (let i = 0; i < stops.length; i++) {
                const stop = stops[i];
                await db_1.prisma.stop.create({
                    data: { routeId, name: stop.name, location: stop.location, sequence: i }
                });
            }
        }
        res.json(updatedRoute);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete route
router.delete('/:id', async (req, res) => {
    try {
        const routeId = parseInt(req.params.id);
        await db_1.prisma.stop.deleteMany({ where: { routeId } });
        await db_1.prisma.route.delete({ where: { id: routeId } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
