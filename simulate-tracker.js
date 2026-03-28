// Run this script to simulate a moving vehicle via Webhooks
const axios = require('axios');

// Target the local backend webhook endpoint
const WEBHOOK_URL = 'http://localhost:5001/api/webhooks/gps';

// A mock tracker device ID (needs to match a vehicle in your database)
// We will use 'TEST-TRACKER-001'
const DEVICE_ID = 'TEST-TRACKER-001';

// Starting coordinates (e.g., somewhere in New York City)
let currentLat = 40.7128;
let currentLng = -74.0060;

console.log(`Starting GPS Simulation for device: ${DEVICE_ID}`);
console.log(`Sending data to: ${WEBHOOK_URL}`);
console.log('Press Ctrl+C to stop.\n');

// Update position every 3 seconds
setInterval(async () => {
    // Simulate slight movement (approx 10-20 meters per interval)
    // Adding small random decimal variations to Lat/Lng
    currentLat += (Math.random() - 0.5) * 0.0005;
    currentLng += (Math.random() - 0.5) * 0.0005;

    const payload = {
        deviceId: DEVICE_ID,
        latitude: currentLat.toFixed(6),
        longitude: currentLng.toFixed(6),
        speed: (Math.random() * 20 + 30).toFixed(1), // Random speed 30-50 mph
        fuelLevel: 80,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await axios.post(WEBHOOK_URL, payload);
        console.log(`[✓] Sent Position: Lat ${payload.latitude}, Lng ${payload.longitude} - Server Responded: ${response.data.message}`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`[X] Error: Vehicle with deviceId '${DEVICE_ID}' is not registered in the database!`);
            console.error(`    Please create a vehicle with this Device ID in the admin panel to see it move.`);
        } else {
            console.error(`[X] Failed to send data: ${error.message} (Is your backend running?)`);
        }
    }
}, 3000);
