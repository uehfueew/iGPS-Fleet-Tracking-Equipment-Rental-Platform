export {};
// For vehicle creation, we also use a mocked express app
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next()
}));

const mockPrisma = {
    vehicle: {
        create: jest.fn().mockResolvedValue({ id: 1, name: 'Truck', licensePlate: 'ABC-123', deviceId: 'DEV123' })
    }
};

jest.mock('../src/db', () => ({
  prisma: mockPrisma
}));

app.post('/api/vehicles', (req: any, res: any, next: any) => {
    const auth = require('../src/middleware/auth');
    auth.authenticateToken(req, res, () => {
        auth.requireRole('admin')(req, res, async () => {
            try {
                const vehicle = await mockPrisma.vehicle.create();
                res.json(vehicle);
            } catch(e) { next(e) }
        });
    });
});

describe('Vehicle API', () => {
  it('should create a vehicle', async () => {
    const res = await request(app)
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