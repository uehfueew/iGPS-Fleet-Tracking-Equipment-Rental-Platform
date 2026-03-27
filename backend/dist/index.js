"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const json2csv_1 = require("json2csv");
const db_1 = require("./db"); // import prisma, pgPool, tsPool
const auth_1 = __importDefault(require("./routes/auth"));
const equipment_1 = __importDefault(require("./routes/equipment"));
const rentals_1 = __importDefault(require("./routes/rentals"));
const geofences_1 = __importDefault(require("./routes/geofences"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const billing_1 = __importDefault(require("./routes/billing"));
const reports_1 = __importDefault(require("./routes/reports"));
const auth_2 = require("./middleware/auth");
const geo_1 = require("./utils/geo");
const zod_1 = require("zod");
const vehicleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    licensePlate: zod_1.z.string().min(1),
    deviceId: zod_1.z.string().optional()
});
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Must be before express.json()
app.use('/api/billing/webhook', express_1.default.raw({ type: 'application/json' }));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const port = process.env.PORT || 5001;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use((0, helmet_1.default)());
app.use(limiter);
app.use('/api/auth', auth_1.default);
app.use('/api/equipment', equipment_1.default);
app.use('/api/rentals', rentals_1.default);
app.use('/api/geofences', geofences_1.default);
app.use('/api/alerts', alerts_1.default);
app.use("/api/reports", reports_1.default);
app.use('/api/billing', billing_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});
// Test raw PostgreSQL connection (optional)
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await db_1.pgPool.query('SELECT NOW()');
        res.json({ time: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Test Prisma connection
app.get('/api/test-prisma', async (req, res) => {
    try {
        const count = await db_1.prisma.user.count();
        res.json({ userCount: count });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/vehicles', auth_2.authenticateToken, (0, auth_2.requireRole)('admin'), async (req, res) => {
    try {
        const validatedData = vehicleSchema.parse(req.body);
        const vehicle = await db_1.prisma.vehicle.create({
            data: validatedData,
        });
        res.json(vehicle);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
});
// Get all vehicles
app.get('/api/vehicles', auth_2.authenticateToken, async (req, res) => {
    try {
        const vehicles = await db_1.prisma.vehicle.findMany();
        res.json(vehicles);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ---- Position endpoints ----
// Add a GPS position for a vehicle
app.post('/api/positions', async (req, res) => {
    const { vehicleId, latitude, longitude, speed } = req.body;
    try {
        const timestamp = new Date();
        // Use tsPool for TimescaleDB
        const position = await db_1.prisma.position.create({
            data: { vehicleId, latitude, longitude, speed, timestamp }
        });
        // Emit new position to socket connected clients
        io.emit('new-position', {
            vehicleId: position.vehicleId,
            latitude: position.latitude,
            longitude: position.longitude,
            speed: position.speed,
            timestamp: position.timestamp
        });
        // Check Geofences
        const geofences = await db_1.prisma.geofence.findMany();
        for (const gf of geofences) {
            const polygon = gf.polygon;
            const isInside = (0, geo_1.isPointInPolygon)([latitude, longitude], polygon);
            // We would ideally verify the *previous* state to determine if it's an "enter" or "exit"
            // For simplicity, we just generate "enter" if inside, but better to just do this properly.
            // We will skip full state diffing here to keep it simpler, or fetch previous point.
            const lastPos = await db_1.prisma.position.findFirst({
                where: { vehicleId, id: { not: position.id } },
                orderBy: { timestamp: 'desc' }
            });
            if (lastPos) {
                const wasInside = (0, geo_1.isPointInPolygon)([lastPos.latitude, lastPos.longitude], polygon);
                if (!wasInside && isInside) {
                    await db_1.prisma.alert.create({
                        data: { vehicleId, type: 'geofence_enter', message: `Vehicle entered geofence: ${gf.name}` }
                    });
                }
                else if (wasInside && !isInside) {
                    await db_1.prisma.alert.create({
                        data: { vehicleId, type: 'geofence_exit', message: `Vehicle exited geofence: ${gf.name}` }
                    });
                }
            }
        }
        res.json(position);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/vehicles/:id/positions', auth_2.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    try {
        const where = { vehicleId: parseInt(id) };
        if (from || to) {
            where.timestamp = {};
            if (from)
                where.timestamp.gte = new Date(from);
            if (to)
                where.timestamp.lte = new Date(to);
        }
        const positions = await db_1.prisma.position.findMany({
            where,
            orderBy: { timestamp: 'asc' }
        });
        res.json(positions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/vehicles/:id/positions/export', auth_2.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    try {
        const where = { vehicleId: parseInt(id) };
        if (from || to) {
            where.timestamp = {};
            if (from)
                where.timestamp.gte = new Date(from);
            if (to)
                where.timestamp.lte = new Date(to);
        }
        const positions = await db_1.prisma.position.findMany({
            where,
            orderBy: { timestamp: 'asc' }
        });
        const fields = ['id', 'vehicleId', 'latitude', 'longitude', 'speed', 'timestamp'];
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(positions);
        res.header('Content-Type', 'text/csv');
        res.attachment(`vehicle-${id}-positions.csv`);
        res.send(csv);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get the latest position
app.get('/api/vehicles/:id/latest-position', auth_2.authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const position = await db_1.prisma.position.findFirst({
            where: { vehicleId: id },
            orderBy: { timestamp: 'desc' }
        });
        res.json(position || null);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Start the server
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
