import { useEffect, useRef, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
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
import { Calendar, Download, Search, Activity, Map as MapIcon, Car, ChevronDown } from 'lucide-react';
import cn from 'classnames';
import { Virtuoso } from 'react-virtuoso';

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
  const location = useLocation();
  const stateVehicleId = location.state?.vehicleId || '';
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | ''>(stateVehicleId);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
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
    <div className="flex h-full bg-white dark:bg-slate-900 relative overflow-hidden">
      <style>{`
        /* Better datetime input styling */
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        input[type="datetime-local"] {
          position: relative;
        }
        /* Make sure scrollbars match map style */
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      {/* Sidebar Overlay Controls */}
      <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[1000] relative">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-300 tracking-tight">Route History</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-11">Playback and extract trails</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Vehicle</label>
            <div className="relative mt-1">
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="w-full flex items-center justify-between pl-3 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm transition-all shadow-sm text-left"
              >
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span className={cn("font-medium", selectedVehicle ? "text-slate-900 dark:text-slate-300" : "text-slate-400 dark:text-slate-500")}>
                    {selectedVehicle 
                      ? vehicles.find(v => v.id === selectedVehicle)?.name || 'Unknown'
                      : 'Select a vehicle'}
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200", isSelectOpen && "rotate-180")} />
              </button>

              {isSelectOpen && (
                <>
                  <div className="fixed inset-0 z-[1999]" onClick={() => { setIsSelectOpen(false); setVehicleSearch(''); }} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 rounded-xl shadow-2xl z-[2000] max-h-[300px] flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50 dark:bg-slate-950/50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search vehicles..."
                          value={vehicleSearch}
                          onChange={e => setVehicleSearch(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 dark:text-slate-300 font-medium"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto py-1.5 custom-scrollbar flex-1" style={{ height: '200px' }}>
                      {(() => {
                        const filteredVehicles = vehicles.filter(v => 
                          v.name.toLowerCase().includes(vehicleSearch.toLowerCase()) || 
                          v.licensePlate.toLowerCase().includes(vehicleSearch.toLowerCase())
                        );

                        if (filteredVehicles.length === 0) {
                          return (
                            <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center flex flex-col items-center gap-2">
                              <Car className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                              <span>No vehicles found</span>
                            </div>
                          );
                        }

                        return (
                          <Virtuoso
                            style={{ height: '100%' }}
                            data={filteredVehicles}
                            itemContent={(_index, v) => (
                              <button
                                onClick={() => { setSelectedVehicle(v.id); setIsSelectOpen(false); setVehicleSearch(''); }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group",
                                  selectedVehicle === v.id ? "bg-blue-50/50 text-blue-700" : "hover:bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold">{v.name}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider uppercase mt-0.5">{v.licensePlate}</span>
                                </div>
                                {selectedVehicle === v.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                              </button>
                            )}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">From Range</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <input 
                  type="datetime-local" 
                  value={fromDate} 
                  onChange={e => setFromDate(e.target.value)} 
                  className={cn(
                    "block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm outline-none cursor-pointer",
                    fromDate ? "text-slate-900 dark:text-slate-300 font-medium" : "text-slate-400 dark:text-slate-500"
                  )} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Range</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <input 
                  type="datetime-local" 
                  value={toDate} 
                  onChange={e => setToDate(e.target.value)} 
                  className={cn(
                    "block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm outline-none cursor-pointer",
                    toDate ? "text-slate-900 dark:text-slate-300 font-medium" : "text-slate-400 dark:text-slate-500"
                  )} 
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
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV Format
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Query Statistics</h4>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MapIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Trajectory Points</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-300">{positions.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 w-full">
        {/* Render Map */}
        <div ref={mapRef} className="flex-1 w-full bg-slate-100 z-0 h-full min-h-[400px]" />
        
        {/* Render Chart Overlay - Modern Floating Window */}
        {positions.length > 0 && (
          <div className="absolute bottom-6 left-6 right-6 h-64 bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/60 z-[1000]">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
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