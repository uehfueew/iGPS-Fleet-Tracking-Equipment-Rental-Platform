import { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import L from 'leaflet';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { Calendar, Download, Search, Activity, Map as MapIcon, Car } from 'lucide-react';

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
}

interface Position {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
}

const VehicleHistory = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const { token } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/vehicles')
      .then(res => res.data)
      .then(data => setVehicles(data))
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: false 
    }).setView([42.0, 21.0], 7);
    
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (fromDate) query.append('from', new Date(fromDate).toISOString());
      if (toDate) query.append('to', new Date(toDate).toISOString());

      const res = await api.get(`/vehicles/${selectedVehicle}/positions?${query.toString()}`);
      const data = res.data;
      setPositions(data);

      if (leafletMap.current) {
        if (polylineRef.current) {
          leafletMap.current.removeLayer(polylineRef.current);
        }

        const latlngs = data.map((p: Position) => [p.latitude, p.longitude]);
        polylineRef.current = L.polyline(latlngs, { 
          color: '#3b82f6', 
          weight: 4,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(leafletMap.current);

        if (latlngs.length > 0) {
          leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleExportSecure = async () => {
    if (!selectedVehicle) return;
    try {
      const query = new URLSearchParams();
      if (fromDate) query.append('from', new Date(fromDate).toISOString());
      if (toDate) query.append('to', new Date(toDate).toISOString());

      const res = await api.get(`/vehicles/${selectedVehicle}/positions/export?${query.toString()}`, { responseType: 'blob' });
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle-${selectedVehicle}-positions.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full bg-white relative overflow-hidden">
      {/* Sidebar Overlay Controls */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-lg z-[1000] relative">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Route History</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium ml-11">Playback and extract trails</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Vehicle</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Car className="h-4 w-4" />
              </div>
              <select 
                value={selectedVehicle} 
                onChange={e => setSelectedVehicle(Number(e.target.value))} 
                className="block w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm appearance-none cursor-pointer text-slate-700 font-medium"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">From Range</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input 
                  type="datetime-local" 
                  value={fromDate} 
                  onChange={e => setFromDate(e.target.value)} 
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow shadow-sm font-medium text-slate-700" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">To Range</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input 
                  type="datetime-local" 
                  value={toDate} 
                  onChange={e => setToDate(e.target.value)} 
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow shadow-sm font-medium text-slate-700" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button 
              onClick={handleSearch} 
              disabled={!selectedVehicle || loading} 
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Show History'}
            </button>
            
            <button 
              onClick={handleExportSecure} 
              disabled={!selectedVehicle || positions.length === 0} 
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV Format
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Query Statistics</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <MapIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Trajectory Points</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{positions.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 w-full">
        {/* Render Map */}
        <div ref={mapRef} className="flex-1 w-full bg-slate-100 z-0 h-full min-h-[400px]" />
        
        {/* Render Chart Overlay - Modern Floating Window */}
        {positions.length > 0 && (
          <div className="absolute bottom-6 left-6 right-6 h-64 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/60 z-[1000]">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Velocity Over Time (km/h)
            </h4>
            <div className="w-full h-[calc(100%-2rem)]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={positions} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(val) => format(new Date(val), 'HH:mm')}
                    minTickGap={40}
                    axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(val) => format(new Date(val), 'MMM dd, HH:mm:ss')} 
                    formatter={(val: any) => [`${val} km/h`, 'Speed']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px' }}
                  />
                  <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleHistory;