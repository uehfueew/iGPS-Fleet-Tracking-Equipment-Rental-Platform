"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const rentals_1 = __importDefault(require("../src/routes/rentals"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Mock auth middleware for testing
jest.mock('../src/middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, role: 'admin' };
        next();
    },
    requireRole: () => (req, res, next) => next()
}));
// Mock Prisma
jest.mock('../src/db', () => ({
    prisma: {
        rental: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 1, equipmentId: 1, clientId: 1 })
        },
        equipment: {
            findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Excavator' })
        },
        vehicle: {
            create: jest.fn().mockResolvedValue({ id: 1, name: 'Rental: Excavator' })
        }
    }
}));
app.use('/api/rentals', rentals_1.default);
describe('Rentals API', () => {
    it('should create a rental', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/rentals')
            .send({
            equipmentId: 1,
            startDate: '2026-04-01T00:00:00.000Z',
            endDate: '2026-04-05T00:00:00.000Z',
            addTracking: true
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', 1);
    });
});
