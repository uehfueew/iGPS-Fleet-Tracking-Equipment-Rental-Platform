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
        const routes = await db_1.prisma.route.findMany({
            include: {
                stops: {
                    orderBy: { sequence: 'asc' }
                }
            },
            orderBy: { displayOrder: 'asc' }
        });
        res.json(routes);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update display orders for routes
router.put('/reorder', async (req, res) => {
    try {
        const { routeOrders } = req.body; // Expect [{id: number, displayOrder: number}]
        for (const item of routeOrders) {
            await db_1.prisma.route.update({
                where: { id: item.id },
                data: { displayOrder: item.displayOrder }
            });
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create route
router.post('/', async (req, res) => {
    try {
        const { name, description, startLocation, endLocation } = req.body;
        // Get max display order to put new route at the end
        const lastRoute = await db_1.prisma.route.findFirst({
            orderBy: { displayOrder: 'desc' }
        });
        const nextOrder = lastRoute ? lastRoute.displayOrder + 1 : 0;
        const route = await db_1.prisma.route.create({
            data: {
                name,
                description,
                startLocation,
                endLocation,
                displayOrder: nextOrder
            }
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
        const stops = await db_1.prisma.stop.findMany({
            where: { routeId: parseInt(req.params.id) },
            orderBy: { sequence: 'asc' }
        });
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
        let seq = sequence;
        if (seq === undefined) {
            const lastStop = await db_1.prisma.stop.findFirst({
                where: { routeId },
                orderBy: { sequence: 'desc' }
            });
            seq = lastStop ? lastStop.sequence + 1 : 0;
        }
        const stop = await db_1.prisma.stop.create({
            data: {
                routeId,
                name,
                location,
                sequence: seq,
                assignedTime: assignedTime ? new Date(assignedTime) : null
            }
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
            // Recreate stops with sequence
            await db_1.prisma.stop.deleteMany({ where: { routeId } });
            for (let i = 0; i < stops.length; i++) {
                await db_1.prisma.stop.create({
                    data: {
                        routeId,
                        name: stops[i].name,
                        location: stops[i].location,
                        sequence: i
                    }
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
