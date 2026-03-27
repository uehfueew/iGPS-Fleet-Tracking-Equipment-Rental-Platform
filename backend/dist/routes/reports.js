"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Haversine formula to approximate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// GET /api/reports/vehicles
router.get('/vehicles', auth_1.authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        // Period might be 'daily', 'weekly', 'monthly'.
        // For simplicity we will fetch all positions between dates, calculate total km, start/end fuel
        let whereClause = {};
        if (startDate && endDate) {
            whereClause.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        const vehicles = await prisma.vehicle.findMany({
            include: {
                positions: {
                    where: whereClause,
                    orderBy: { timestamp: 'asc' },
                }
            }
        });
        const reports = vehicles.map(vehicle => {
            let totalDistance = 0;
            let startFuel = 0;
            let endFuel = 0;
            let fuelConsumption = 0;
            const pos = vehicle.positions;
            if (pos && pos.length > 0) {
                startFuel = pos[0].fuelLevel || 0;
                endFuel = pos[pos.length - 1].fuelLevel || 0;
                for (let i = 1; i < pos.length; i++) {
                    const prev = pos[i - 1];
                    const curr = pos[i];
                    const dist = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
                    totalDistance += dist;
                    if (curr.fuelLevel !== null && prev.fuelLevel !== null) {
                        if (prev.fuelLevel > curr.fuelLevel) {
                            fuelConsumption += (prev.fuelLevel - curr.fuelLevel);
                        }
                    }
                }
            }
            return {
                vehicleId: vehicle.id,
                vehicleName: vehicle.name,
                licensePlate: vehicle.licensePlate,
                totalDistance: totalDistance.toFixed(2),
                fuelConsumption: fuelConsumption.toFixed(2),
                startFuel: startFuel.toFixed(2),
                endFuel: endFuel.toFixed(2),
            };
        });
        res.json(reports);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
