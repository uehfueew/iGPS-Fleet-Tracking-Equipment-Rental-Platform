import express from 'express';
import { prisma } from '../db';

const router = express.Router();

/**
 * Webhook endpoint for GPS data ingestion.
 * External services like Traccar or custom trackers can POST JSON data here.
 * 
 * Expected payload example:
 * {
 *   "deviceId": "123456789012345", // The IMEI or unique identifier of the tracker
 *   "latitude": 40.7128,
 *   "longitude": -74.0060,
 *   "speed": 55.2,
 *   "heading": 180,
 *   "fuelLevel": 85,
 *   "timestamp": "2026-03-28T12:00:00Z" // Optional, will use current time if omitted
 * }
 */
router.post('/gps', async (req, res) => {
  try {
    // 1. Extract data from the incoming webhook payload
    const { deviceId, latitude, longitude, speed, heading, fuelLevel, timestamp } = req.body;

    // Validate essential fields
    if (!deviceId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required payload fields: deviceId, latitude, longitude' });
    }

    // 2. Find the vehicle in our database that matches this tracker's unique deviceId
    const vehicle = await prisma.vehicle.findFirst({
      where: { deviceId: String(deviceId) }
    });

    if (!vehicle) {
      // If we don't have a vehicle with this deviceId registered, we ignore it or log it
      console.warn(`[GPS Webhook] Received data for unknown device ID: ${deviceId}`);
      return res.status(404).json({ error: 'Device not registered in platform' });
    }

    // 3. Save the new GPS position to the database
    const newPosition = await prisma.position.create({
      data: {
        vehicleId: vehicle.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
        fuelLevel: fuelLevel ? parseFloat(fuelLevel) : null,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      },
      include: {
        vehicle: true // include vehicle data so the frontend has details (name, plate, etc.)
      }
    });

    // 4. Push real-time update to the frontend map via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Broadcast the new position to all clients listening to 'new-position'
      io.emit('new-position', newPosition);
    }

    // Acknowledge receipt
    res.status(200).json({ success: true, message: 'GPS data processed' });

  } catch (error: any) {
    console.error('[GPS Webhook Error]:', error.message);
    res.status(500).json({ error: 'Internal Server Error processing GPS data' });
  }
});

export default router;