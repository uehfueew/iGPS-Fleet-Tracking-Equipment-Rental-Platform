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
// Get available vehicles not assigned to any group
router.get('/available-vehicles', async (req, res) => {
    try {
        const vehicles = await db_1.prisma.vehicle.findMany({
            where: { groupId: null }
        });
        res.json(vehicles);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get all groups
router.get('/', async (req, res) => {
    try {
        const groups = await db_1.prisma.group.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create group
router.post('/', async (req, res) => {
    try {
        const { name, description, parentId } = req.body;
        const group = await db_1.prisma.group.create({
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null
            }
        });
        res.json(group);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update group
router.put('/:id', async (req, res) => {
    try {
        const { name, description, parentId } = req.body;
        const group = await db_1.prisma.group.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null
            }
        });
        res.json(group);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete group
router.delete('/:id', async (req, res) => {
    try {
        // First remove parentId from subgroups if any
        await db_1.prisma.group.updateMany({
            where: { parentId: parseInt(req.params.id) },
            data: { parentId: null }
        });
        // Then unlink vehicles 
        await db_1.prisma.vehicle.updateMany({
            where: { groupId: parseInt(req.params.id) },
            data: { groupId: null }
        });
        await db_1.prisma.group.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Assign vehicle to group
router.post('/:id/vehicles', async (req, res) => {
    try {
        const { vehicleId } = req.body;
        const vehicle = await db_1.prisma.vehicle.update({
            where: { id: parseInt(vehicleId) },
            data: { groupId: parseInt(req.params.id) }
        });
        res.json(vehicle);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Remove vehicle from group
router.delete('/:id/vehicles/:vehicleId', async (req, res) => {
    try {
        const vehicle = await db_1.prisma.vehicle.update({
            where: { id: parseInt(req.params.vehicleId) },
            data: { groupId: null }
        });
        res.json(vehicle);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
