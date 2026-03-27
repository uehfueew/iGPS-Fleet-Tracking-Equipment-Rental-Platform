import { useEffect, useRef, useState, useContext } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

// Fix for default Leaflet marker icons (sometimes needed)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
}

interface Position {
  latitude: number;
  longitude: number;
}

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const { token } = useContext(AuthContext);

  // Fetch vehicles and their latest positions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const vehiclesRes = await api.get('/vehicles');
        const vehiclesData = vehiclesRes.data;
        setVehicles(vehiclesData);

        const posMap: Record<number, Position> = {};
        for (const v of vehiclesData) {
          const posRes = await api.get(`/vehicles/${v.id}/latest-position`);
          const pos = posRes.data;
          if (pos) {
            posMap[v.id] = { latitude: pos.latitude, longitude: pos.longitude };
          }
        }
        setPositions(posMap);
      } catch (err) {
        console.error(err);
      }
    };
    if (token) {
      fetchData();
    }
  }, [token]);

  // Connect to socket.io for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5001'); // Connects to the same origin (handled by Vite proxy in dev)

    socket.on('new-position', (newPos) => {
      setPositions((prev) => ({
        ...prev,
        [newPos.vehicleId]: { latitude: newPos.latitude, longitude: newPos.longitude }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Initialize map ONLY ONCE
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    
    leafletMap.current = L.map(mapRef.current).setView([42.0, 21.0], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Dynamically update markers when vehicles or positions change
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!leafletMap.current) return;
    const map = leafletMap.current;

    const latlngs: L.LatLngTuple[] = [];

    vehicles.forEach((vehicle) => {
      const pos = positions[vehicle.id];
      if (pos) {
        latlngs.push([pos.latitude, pos.longitude]);
        if (markersRef.current[vehicle.id]) {
          // Update existing marker
          markersRef.current[vehicle.id].setLatLng([pos.latitude, pos.longitude]);
        } else {
          // Create new marker
          const marker = L.marker([pos.latitude, pos.longitude]).addTo(map);
          marker.bindPopup(`<b>${vehicle.name}</b><br/>${vehicle.licensePlate}`);
          markersRef.current[vehicle.id] = marker;
        }
      }
    });

    if (!hasCentered.current && latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 14 });
      hasCentered.current = true;
    }
  }, [vehicles, positions]);

  return <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />;
};

export default Map;