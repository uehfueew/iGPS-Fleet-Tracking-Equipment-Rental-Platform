import { useEffect, useRef, useState, useContext, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { Truck, CarFront, Navigation, Search, AlertTriangle, Info, X, ChevronRight, ChevronLeft, Zap, ChevronDown } from "lucide-react";
import cn from "classnames";

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  status?: string;
}

interface Position {
  latitude: number;
  longitude: number;
  timestamp?: string;
  fuelLevel?: number;
  heading?: number;
  speed?: number;
}

interface Alert {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  vehicleId?: number;
  vehicle?: { name: string; licensePlate: string };
  isDismissed?: boolean;
}

const customIcon = (color: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color:${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

// --- Smart Notification Toast Component ---
const SmartToast = ({ 
  alert, 
  onDismiss, 
  onHover 
}: { 
  alert: Alert; 
  onDismiss: (id: number) => void; 
  onHover: (vId?: number) => void; 
}) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  // Give speeding alerts a longer duration
  const duration = alert.type === "speed" ? 8000 : 5000;
  
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss(alert.id);
          return 0;
        }
        return prev - (100 / (duration / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isHovered, duration, onDismiss, alert.id]);

  return (
    <div 
      onMouseEnter={() => { setIsHovered(true); if(alert.vehicleId) onHover(alert.vehicleId); }}
      onMouseLeave={() => { setIsHovered(false); onHover(undefined); }}
      className="relative pointer-events-auto bg-white/95 backdrop-blur-sm pl-2 pt-1.5 pb-2 pr-1.5 rounded shadow border border-gray-100 flex items-start gap-1.5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] max-w-[210px] min-w-[180px] overflow-hidden group cursor-default"
    >
      <div className={cn("p-1 rounded shrink-0", alert.type === 'speed' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500')}>
        {alert.type === "speed" ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0 pr-2 z-10">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="text-[9px] font-extrabold text-gray-900 uppercase tracking-tight">
            {alert.type}
          </h4>
          <span className="text-[7px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            PAUSED
          </span>
        </div>
        <p className="text-[9.5px] text-gray-700 leading-tight line-clamp-2">
          <span className="font-bold text-gray-900">{alert.vehicle?.name ? `${alert.vehicle.name}: ` : ""}</span>
          {alert.message}
        </p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
        className="text-gray-300 hover:text-gray-700 shrink-0 p-0.5 -mt-0.5 z-10"
      >
        <X className="w-3 h-3" />
      </button>
      
      {/* Depleting Timer bar */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 h-[2px] transition-all duration-75 ease-linear",
          isHovered ? 'bg-blue-400' : alert.type === 'speed' ? 'bg-red-500' : 'bg-gray-400'
        )} 
        style={{ width: `${progress}%` }} 
      />
    </div>
  );
};

const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  // Tab/Filter states for easy organization
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SPEEDING' | 'MOVING' | 'IDLE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'SPEED' | 'FUEL'>('NAME');
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<number | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const authContext = useContext(AuthContext);
  const token = authContext ? authContext.token : null;

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const vehiclesRes = await api.get("/vehicles");
        const eqRes = await api.get("/equipment");
        if (!active) return;
        setVehicles(vehiclesRes.data);
        setEquipments(eqRes.data);

        const posMap: Record<number, Position> = {};
        await Promise.all(vehiclesRes.data.map(async (v: Vehicle) => {
          try {
            const posRes = await api.get(`/vehicles/${v.id}/latest-position`);
            const pos = posRes.data;
            if (pos) {
              posMap[v.id] = { 
                latitude: pos.latitude, 
                longitude: pos.longitude,
                speed: pos.speed || 0,
                heading: pos.heading || 0,
                fuelLevel: pos.fuelLevel,
                timestamp: pos.timestamp
              };
            }
          } catch (e) {
             // Silently ignore
          }
        }));
        if (!active) return;
        setPositions(posMap);

        try {
          const alertsRes = await api.get("/alerts");
          if (!active) return;
          setAlerts(alertsRes.data.map((a: Alert) => ({...a, id: a.id || Math.random()})).filter((a: Alert) => !a.isRead).slice(0, 3)); 
        } catch (e) {
          // Silently ignore
        }

      } catch (err) {
        console.error(err);
      }
    };
    if (token) {
      fetchData();
    }
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const socket = io("http://localhost:5001", {
      transports: ["websocket", "polling"]
    });

    socket.on("new-position", (newPos) => {
      setPositions((prev) => ({
        ...prev,
        [newPos.vehicleId]: { 
          latitude: newPos.latitude, 
          longitude: newPos.longitude,
          speed: newPos.speed || 0,
          heading: newPos.heading || 0,
          fuelLevel: newPos.fuelLevel || (prev[newPos.vehicleId]?.fuelLevel),
          timestamp: new Date().toISOString()
        }
      }));
    });

    socket.on("new-alert", (newAlert) => {
      const alertWithId = { ...newAlert, id: newAlert.id || Date.now() }; 
      setAlerts((prev) => [alertWithId, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false // Primary setting to remove Leaflet attributes
    }).setView([42.6629, 21.1655], 8);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '' // Force empty attribution on the tile layer
    }).addTo(leafletMap.current);

    L.control.zoom({ position: "topleft" }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const hasCentered = useRef(false);

  const getVehicleCategoryProps = (vehicle: Vehicle) => {
    const eq = equipments.find(e => 
      e.name === vehicle.name || 
      (e.description && vehicle.licensePlate && e.description.includes(vehicle.licensePlate))
    );

    if (!eq) {
      return {
        color: '#ef4444',      // Red (Company)
        bg: 'bg-red-50 text-red-600 border border-red-100',
        label: 'COMPANY CAR'
      };
    }

    const isExternal = eq.description?.includes('Owner:');

    if (isExternal) {
      return {
        color: '#10b981',      // Green (Externally Rented In)
        bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        label: 'RENTAL (IN)'
      };
    } else {
      return {
        color: '#3b82f6',      // Blue (Put For Rent)
        bg: 'bg-blue-50 text-blue-600 border border-blue-100',
        label: 'FOR RENT'
      };
    }
  };

  useEffect(() => {
    if (!leafletMap.current) return;
    const map = leafletMap.current;
    const latlngs: L.LatLngTuple[] = [];

    vehicles.forEach((vehicle) => {
      const pos = positions[vehicle.id];
      if (pos) {
        latlngs.push([pos.latitude, pos.longitude]);

        const catProps = getVehicleCategoryProps(vehicle);
        const color = catProps.color;
        const isSpeeding = (pos.speed || 0) > 90;

        if (markersRef.current[vehicle.id]) {
          markersRef.current[vehicle.id].setLatLng([pos.latitude, pos.longitude]);
          markersRef.current[vehicle.id].setIcon(customIcon(color));
        } else {
          const marker = L.marker([pos.latitude, pos.longitude], {
            icon: customIcon(color)
          }).addTo(map);
          marker.on("click", () => {
             setSelectedVehicle(vehicle.id);
             map.flyTo([pos.latitude, pos.longitude], 16);
          });
          markersRef.current[vehicle.id] = marker;
        }

        markersRef.current[vehicle.id].bindPopup(
          `<div class="p-0.5 min-w-[190px] font-sans">
            <div class="flex justify-between items-start border-b border-gray-100 pb-2 mb-2">
              <div class="flex flex-col pr-3">
                <span class="font-extrabold text-gray-900 text-sm leading-tight">${vehicle.name}</span>
                <span class="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-tight">${vehicle.licensePlate}</span>
              </div>
              <div class="px-1.5 py-0.5 mr-5 rounded-[4px] text-[9px] font-black shrink-0 ${catProps.bg}">
                ${catProps.label}
              </div>
            </div>
            <div class="flex flex-col gap-1 pb-0.5">
              <div class="flex justify-between items-center bg-gray-50/80 px-2 py-1.5 rounded-md">
                <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Speed</span>
                <span class="text-[13px] font-black ${isSpeeding ? 'text-red-600' : 'text-gray-900'} leading-none">${pos.speed ? Math.round(pos.speed) : 0} <span class="text-[9px] text-gray-400 font-bold">km/h</span></span>
              </div>
              <div class="flex justify-between items-center bg-gray-50/80 px-2 py-1.5 rounded-md">
                <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Fuel</span>
                <span class="text-[13px] font-black text-gray-900 leading-none">${pos.fuelLevel ? pos.fuelLevel.toFixed(1) + ' <span class="text-[9px] text-gray-400 font-bold">L</span>' : '<span class="text-gray-400 font-medium">N/A</span>'}</span>
              </div>
              <div class="flex justify-between items-center bg-gray-50/80 px-2 py-1.5 rounded-md">
                <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Heading</span>
                <span class="text-[13px] font-black text-gray-900 leading-none">${pos.heading ? Math.round(pos.heading) + '°' : '<span class="text-gray-400 font-medium">-</span>'}</span>
              </div>
            </div>
          </div>`,
          { className: 'custom-leaflet-popup' }
        );
      }
    });

    if (!hasCentered.current && latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [80, 80], maxZoom: 14 });
      hasCentered.current = true;
    }
  }, [vehicles, positions]);

  // Handle cross-hover highlighting
  useEffect(() => {
    if (hoveredVehicle && markersRef.current[hoveredVehicle]) {
      const el = markersRef.current[hoveredVehicle].getElement();
      if (el) {
        el.style.transform += " scale(1.6)";
        el.style.zIndex = "1000";
        el.style.transition = "transform 0.15s";
      }
    }
    return () => {
      if (hoveredVehicle && markersRef.current[hoveredVehicle]) {
        const el = markersRef.current[hoveredVehicle].getElement();
        if (el) {
          el.style.transform = el.style.transform.replace(" scale(1.6)", "");
          el.style.zIndex = "";
        }
      }
    }
  }, [hoveredVehicle]);

  const handleFocusVehicle = (vId: number) => {
    setSelectedVehicle(vId);
    const pos = positions[vId];
    if (pos && leafletMap.current) {
       leafletMap.current.flyTo([pos.latitude, pos.longitude], 16, { animate: true });
       markersRef.current[vId]?.openPopup();
    }
  };

  const handleDismissAlert = (alertId: number) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isDismissed: true } : a));
  };

  // Improved filtering
  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(q) || v.licensePlate.toLowerCase().includes(q));
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      result = result.filter(v => {
        const speed = positions[v.id]?.speed || 0;
        if (filterStatus === 'SPEEDING') return speed > 90;
        if (filterStatus === 'MOVING') return speed > 0 && speed <= 90;
        if (filterStatus === 'IDLE') return speed === 0;
        return true;
      });
    }

    // Apply sorting
    return result.sort((a, b) => {
      if (sortBy === 'SPEED') {
        const speedA = positions[a.id]?.speed || 0;
        const speedB = positions[b.id]?.speed || 0;
        return speedB - speedA;
      }
      if (sortBy === 'FUEL') {
        const fuelA = positions[a.id]?.fuelLevel || 0;
        const fuelB = positions[b.id]?.fuelLevel || 0;
        return fuelB - fuelA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [vehicles, searchQuery, filterStatus, sortBy, positions]);

  // Determine counts for the filter chips
  const counts = useMemo(() => {
    let speeding = 0, moving = 0, idle = 0;
    vehicles.forEach(v => {
      const s = positions[v.id]?.speed || 0;
      if (s > 90) speeding++;
      else if (s > 0) moving++;
      else idle++;
    });
    return { ALL: vehicles.length, SPEEDING: speeding, MOVING: moving, IDLE: idle };
  }, [vehicles, positions]);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50 relative">
      <style>{`
        /* Force remove leaflet watermarks just to be absolutely certain */
        .leaflet-control-attribution, .leaflet-control-attribution * { display: none !important; }
        .leaflet-bottom.leaflet-right { display: none !important; }
        
        /* Popup refinement */
        .custom-leaflet-popup .leaflet-popup-content { margin: 10px !important; }
        .custom-leaflet-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .custom-leaflet-popup .leaflet-popup-close-button { top: 6px !important; right: 6px !important; color: #9ca3af !important; }
        
        /* Map custom scrollbar for better UI */
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      
      {/* 100% Map Container */}
      <div className="absolute inset-0 z-0 h-full w-full" ref={mapRef}></div>

      {/* Floating Smart Notifications (Lower and more lefter, bottom-2, left-2) */}
      <div className="absolute bottom-2 left-2 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        {alerts.filter(a => !a.isDismissed).map((alert) => (
            <SmartToast 
              key={alert.id} 
              alert={alert} 
              onDismiss={handleDismissAlert} 
              onHover={(vId) => setHoveredVehicle(vId || null)} 
            />
        ))}
      </div>

      {/* Floating Right Collapsible Menu (Does not force map to stretch) */}
      <div 
        className={cn(
          "absolute top-4 bottom-4 z-[1010] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white rounded-xl shadow-2xl overflow-visible border border-gray-100",
          isSidebarOpen ? "w-[300px] right-4 translate-x-0" : "w-[300px] right-4 translate-x-[calc(100%+2rem)]"
        )}
      >
        {/* Toggle Button attached to the outside center-left edge of the panel */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -left-10 top-6 bg-white border border-gray-200 border-r-0 p-2 rounded-l-xl shadow-[-4px_4px_6px_rgba(0,0,0,0.05)] text-gray-600 hover:text-blue-600 hover:bg-gray-50 focus:outline-none transition-colors"
        >
          {isSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Panel Container */}
        <div className="flex flex-col h-full overflow-hidden w-full rounded-xl focus:outline-none">
          {/* Header & Search */}
          <div className="p-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-extrabold text-gray-900 flex items-center gap-1.5 tracking-tight">
                <Navigation className="w-4 h-4 text-blue-600 fill-blue-600" />
                Live Fleet
              </h2>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 h-9 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                <Search className="text-gray-400 w-4 h-4 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search vehicles..." 
                  className="w-full bg-transparent border-none text-[13px] text-gray-900 focus:ring-0 outline-none placeholder-gray-400 px-2 h-full"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="h-9 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 px-3 flex items-center justify-between gap-1.5 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm hover:bg-gray-100 transition-colors min-w-[90px]"
                  title="Sort vehicles by"
                >
                  {sortBy === 'NAME' ? 'A-Z' : sortBy === 'SPEED' ? 'Speed' : 'Fuel'}
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isSortOpen && "rotate-180")} />
                </button>
                
                {isSortOpen && (
                  <>
                    <div className="fixed inset-0 z-[1999]" onClick={() => setIsSortOpen(false)} />
                    <div className="absolute top-full right-0 mt-1.5 w-[140px] bg-white border border-gray-100 rounded-lg shadow-2xl z-[2000] py-1.5 flex flex-col overflow-hidden">
                      {(['NAME', 'SPEED', 'FUEL'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => { setSortBy(option); setIsSortOpen(false); }}
                          className={cn(
                            "px-3 py-2 text-left text-[11px] font-bold transition-all flex items-center justify-between relative",
                            sortBy === option ? "bg-blue-50/50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          {option === 'NAME' ? 'Alphabetical' : option === 'SPEED' ? 'Highest Speed' : 'Highest Fuel'}
                          {option === sortBy && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Chips for Better Categorization */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-gray-100 shrink-0 overflow-x-auto custom-scrollbar">
            {(['ALL', 'SPEEDING', 'MOVING', 'IDLE'] as const).map(status => (
               <button
                 key={status}
                 onClick={() => setFilterStatus(status)}
                 className={cn(
                   "px-2.5 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all shadow-sm border",
                   filterStatus === status 
                     ? status === 'SPEEDING' ? "bg-red-500 border-red-500 text-white" 
                     : status === 'MOVING' ? "bg-emerald-500 border-emerald-500 text-white"
                     : status === 'IDLE' ? "bg-gray-600 border-gray-600 text-white"
                     : "bg-blue-600 border-blue-600 text-white"
                     : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                 )}
               >
                 {status} <span className="opacity-80 ml-0.5">({counts[status]})</span>
               </button>
            ))}
          </div>

          {/* Flat Verified List - Eliminates messy accordions */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-2 space-y-1.5 custom-scrollbar">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                <div className="bg-gray-100 p-3 rounded-full mb-3">
                  <CarFront className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-800 font-bold text-sm">No vehicles found</p>
                <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredVehicles.map(vehicle => {
                const pos = positions[vehicle.id];
                const speed = pos?.speed || 0;
                const isSpeeding = speed > 90;
                const catProps = getVehicleCategoryProps(vehicle);

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => handleFocusVehicle(vehicle.id)}
                    onMouseEnter={() => setHoveredVehicle(vehicle.id)}
                    onMouseLeave={() => setHoveredVehicle(null)}
                    className={cn(
                      "group p-2.5 bg-white rounded-lg border transition-all cursor-pointer",
                      selectedVehicle === vehicle.id
                        ? "border-blue-400 ring-1 ring-blue-400 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2.5 items-center flex-1 min-w-0">
                        {/* Status Icon Indicator */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                          catProps.bg
                        )}>
                          <Truck className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-extrabold text-gray-900 text-[12px] leading-tight group-hover:text-blue-600 truncate transition-colors">
                            {vehicle.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-mono tracking-tight bg-gray-100 px-1 py-0.5 rounded leading-none">
                              {vehicle.licensePlate}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold px-1 py-0.5 rounded uppercase leading-none border",
                              catProps.bg
                            )}>
                              {catProps.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Metric Stats */}
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-[1px] justify-end">
                          <span className={cn("text-sm font-black tracking-tight", isSpeeding ? "text-red-600" : "text-gray-800")}>
                            {Math.round(speed)}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">km/h</span>
                        </div>
                        {pos?.fuelLevel ? (
                          <div className="text-[9px] font-semibold text-gray-500 flex items-center justify-end mt-[1px] gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-blue-500" />
                            {pos.fuelLevel.toFixed(0)}L
                          </div>
                        ) : <div className="text-[9px] font-semibold text-white mt-[1px] h-[10px]">_</div>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
