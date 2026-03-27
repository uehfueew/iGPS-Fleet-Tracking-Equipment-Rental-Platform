import request from 'supertest';
import express from 'express';
import rentalsRouter from '../src/routes/rentals';
import equipmentRouter from '../src/routes/equipment';

const app = express();
app.use(express.json());

// Mock auth middleware for testing
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next()
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

app.use('/api/rentals', rentalsRouter);

describe('Rentals API', () => {
  it('should create a rental', async () => {
    const res = await request(app)
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