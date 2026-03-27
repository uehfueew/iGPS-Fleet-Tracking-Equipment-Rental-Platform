"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// For vehicle creation, we also use a mocked express app
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
jest.mock('../src/middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, role: 'admin' };
        next();
    },
    requireRole: () => (req, res, next) => next()
}));
const mockPrisma = {
    vehicle: {
        create: jest.fn().mockResolvedValue({ id: 1, name: 'Truck', licensePlate: 'ABC-123', deviceId: 'DEV123' })
    }
};
jest.mock('../src/db', () => ({
    prisma: mockPrisma
}));
app.post('/api/vehicles', (req, res, next) => {
    const auth = require('../src/middleware/auth');
    auth.authenticateToken(req, res, () => {
        auth.requireRole('admin')(req, res, async () => {
            try {
                const vehicle = await mockPrisma.vehicle.create();
                res.json(vehicle);
            }
            catch (e) {
                next(e);
            }
        });
    });
});
describe('Vehicle API', () => {
    it('should create a vehicle', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/vehicles')
            .send({
            name: 'Truck',
            licensePlate: 'ABC-123',
            deviceId: 'DEV123'
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('name', 'Truck');
    });
});
