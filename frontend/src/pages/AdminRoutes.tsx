import { useState, useEffect, useRef } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { Plus, Route, Trash2, MapPin, GripVertical, Search, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Use default leaf icon from leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const createStopIcon = (index: number) => L.divIcon({
  className: 'custom-stop-marker bg-transparent border-0',
  html: `<div style="background-color: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); font-size: 14px; position: relative;">
           ${index + 1}
           <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid white;"></div>
           <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #10b981;"></div>
         </div>`,
  iconSize: [28, 34],
  iconAnchor: [14, 34],
  popupAnchor: [0, -34]
});

interface Stop {
  id?: number;
  name: string;
  location: { lat: number; lng: number };
}

interface PredefinedRoute {
  id: number;
  name: string;
  description: string;
  stops: Stop[];
}

// Separated Map Controller to prevent re-renders wiping map state
const MapController = ({ 
  currentStops, 
  mapCenter, 
  initialZoom,
  searchLocation, 
  setSearchLocation, 
  addingStopMode, 
  setAddingStopMode, 
  newStopName, 
  setNewStopName, 
  setCurrentStops,
  isViewMode,
  selectedStopLocation,
  setSelectedStopLocation,
  editingRouteId
}: any) => {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Update center when profile location is found
  useEffect(() => {
    if (currentStops.length === 0 && !searchLocation && !selectedStopLocation) {
      map.setView([mapCenter.lat, mapCenter.lng], initialZoom, { animate: false });
    }
  }, [mapCenter.lat, mapCenter.lng, initialZoom, map, currentStops.length, searchLocation, selectedStopLocation]);
  
  // Fit bounds on stops change
  useEffect(() => {
    if (currentStops.length === 0) {
      initialFitDone.current = false; // Reset when stops are cleared
      return;
    }
    
    // We only want to fit bounds if there's a real reason to
    // e.g. when first loading the route, NOT constantly.
    if (initialFitDone.current) return; // Prevent zooming out when a new stop is created or order changed

    const timer = setTimeout(() => {
      map.invalidateSize();
      // If we are actively looking at a searched location, don't jump away immediately
      if (searchLocation) return;
      if (selectedStopLocation) return; 
      
      if (currentStops.length > 0) {
        initialFitDone.current = true; // Mark as fitted so we don't zoom out again on new stops
      }

      if (currentStops.length > 1) {
        const bounds = L.latLngBounds(currentStops.map((s: any) => [s.location.lat, s.location.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (currentStops.length === 1) {
        map.setView([currentStops[0].location.lat, currentStops[0].location.lng], 14);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [currentStops, map, searchLocation, selectedStopLocation, editingRouteId]);

  // Fly to search location
  useEffect(() => {
    if (searchLocation) {
      map.flyTo([searchLocation.lat, searchLocation.lng], 16, { duration: 1.0 });
    }
  }, [searchLocation, map]);

  // Fly to selected stop location
  useEffect(() => {
    if (selectedStopLocation) {
      map.flyTo([selectedStopLocation.lat, selectedStopLocation.lng], 16, { duration: 1.0 });
      // clear after to allow subsequent clicks
      const t = setTimeout(() => setSelectedStopLocation(null), 1100);
      return () => clearTimeout(t);
    }
  }, [selectedStopLocation, map, setSelectedStopLocation]);

  // Map Click Component for adding stops
  useMapEvents({
    click(e) {
      if (!isViewMode && addingStopMode) {
        // Prevent map from flying back immediately by temporarily holding search location or just let it be
        setSearchLocation(null); 
        setCurrentStops((prev: any) => [
          ...prev,
          { name: newStopName || `Stop ${prev.length + 1}`, location: { lat: e.latlng.lat, lng: e.latlng.lng } }
        ]);
        setAddingStopMode(false);
        setNewStopName('');
      } else if (!isViewMode) {
        // Just clear search location if user clicks map to look around
        setSearchLocation(null);
      }
    },
  });

  return null;
};

export default function AdminRoutes() {
  const [routes, setRoutes] = useState<PredefinedRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [currentStops, setCurrentStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingStopMode, setAddingStopMode] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  
  // Search map states
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStopLocation, setSelectedStopLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Default US center
  const [initialZoom, setInitialZoom] = useState(4); // Default to zoomed out

  // Fetch initial location
  useEffect(() => {
    // Try to be smart and set map center to user's company location or a typical vehicle location
    const fetchDefaultLocation = async () => {
      try {
        const profileRes = await api.get('/profile').catch(() => null);
        if (profileRes?.data?.locations) {
          // It's a text string, we could geocode it but might be slow.
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profileRes.data.locations)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            setInitialZoom(12);
            return;
          }
        }
        
        // Check if we already have it cached in localStorage so we don't spam prompt
        const cachedLocation = localStorage.getItem('iGPS_defaultMapCenter');
        if (cachedLocation) {
          const parsed = JSON.parse(cachedLocation);
          setMapCenter(parsed);
          setInitialZoom(10);
          return;
        }

        // If no profile location and no cached location, gently try HTML5 geolocation as fallback
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
             const newCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
             setMapCenter(newCenter);
             setInitialZoom(10);
             localStorage.setItem('iGPS_defaultMapCenter', JSON.stringify(newCenter));
          }, () => {
             // Silently fail to defaults if denied
             // Cache the default so we don't ask again on next reload
             localStorage.setItem('iGPS_defaultMapCenter', JSON.stringify({ lat: 39.8283, lng: -98.5795 }));
          });
        }
      } catch (err) {
        // silent fail
      }
    };
    fetchDefaultLocation();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchRoutePath = async () => {
      if (currentStops.length < 2) {
        setRoutePath([]);
        return;
      }
      
      const coordinates = currentStops.map(s => `${s.location.lng},${s.location.lat}`).join(';');
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
        const data = await response.json();
        
        if (!active) return;

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          // OSRM returns GeoJSON coordinates as [longitude, latitude]
          // Leaflet Polyline expects [latitude, longitude]
          const mappedPath = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          setRoutePath(mappedPath);
        } else {
           // Fallback to straight lines
           console.warn('OSRM returned non-Ok code:', data.code);
           setRoutePath(currentStops.map(s => [s.location.lat, s.location.lng]));
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to fetch route path from OSRM', err);
        // Fallback to straight lines
        setRoutePath(currentStops.map(s => [s.location.lat, s.location.lng]));
      }
    };

    fetchRoutePath();
    return () => { active = false; };
  }, [currentStops]);


  const fetchRoutes = async () => {
    try {
      const res = await api.get('/routes_api');
      setRoutes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleViewClick = (rt: PredefinedRoute) => {
    setEditingRouteId(rt.id);
    setFormData({ name: rt.name, description: rt.description || '' });
    setCurrentStops(rt.stops || []);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleMarkerDragEnd = (index: number, e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    setCurrentStops(prev => {
      const newStops = [...prev];
      newStops[index].location = { lat: position.lat, lng: position.lng };
      return newStops;
    });
  };

  const handleDeleteRoute = async () => {
    if (!editingRouteId) return;
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        await api.delete(`/routes_api/${editingRouteId}`);
        setIsModalOpen(false);
        setEditingRouteId(null);
        fetchRoutes();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRouteId) {
        await api.put(`/routes_api/${editingRouteId}`, {
          ...formData,
          stops: currentStops,
          startLocation: currentStops.length > 0 ? currentStops[0].location : null, 
          endLocation: currentStops.length > 1 ? currentStops[currentStops.length - 1].location : null
        });
      } else {
        const res = await api.post('/routes_api', { 
          ...formData, 
          startLocation: currentStops.length > 0 ? currentStops[0].location : null, 
          endLocation: currentStops.length > 1 ? currentStops[currentStops.length - 1].location : null
        });
        const routeId = res.data.id;
        for (let i = 0; i < currentStops.length; i++) {
          const stop = currentStops[i];
          await api.post(`/routes_api/${routeId}/stops`, {
            name: stop.name,
            location: stop.location,
            sequence: i
          });
        }
      }

      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      setCurrentStops([]);
      setEditingRouteId(null);
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  // Map Auto Fit Component
  const removeStop = (index: number) => {
    setCurrentStops(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearchingMap(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setSearchResults(data);
          setIsDropdownOpen(true);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearchingMap(false);
      }
    }, 600); // 600ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [mapSearchQuery]);

  const handleMapSearch = async () => {
    // If user presses enter or clicks search button
    // Either fly to first result if dropdown exists, or fetch implicitly
    if (searchResults.length > 0) {
       const first = searchResults[0];
       setSearchLocation({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
       setMapSearchQuery(first.display_name.split(',')[0]);
       setIsDropdownOpen(false);
       setSearchResults([]); // clear results
       return;
    }

    if (!mapSearchQuery.trim()) return;
    setIsSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        // Automatically fly to first result
        const first = data[0];
        setSearchLocation({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
        setMapSearchQuery(first.display_name.split(',')[0]);
        setSearchResults([]); // clear results on enter
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const [optimizationMessage, setOptimizationMessage] = useState('');

  const optimizeRoute = async () => {
    if (currentStops.length < 3) return;
    setOptimizationMessage('Optimizing...');

    // Implement Nearest Neighbor algorithm using Haversine distance
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
      return R * c; // Distance in km
    };

    try {
      const reorderedStops = [currentStops[0]]; // Start with the first stop
      const unvisited = [...currentStops.slice(1)];

      let currentPoint = currentStops[0];

      while (unvisited.length > 0) {
        let nearestIndex = 0;
        let shortestDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
          const dist = getDistance(
            currentPoint.location.lat, currentPoint.location.lng,
            unvisited[i].location.lat, unvisited[i].location.lng
          );
          if (dist < shortestDistance) {
            shortestDistance = dist;
            nearestIndex = i;
          }
        }

        const nextPoint = unvisited.splice(nearestIndex, 1)[0];
        reorderedStops.push(nextPoint);
        currentPoint = nextPoint;
      }

      const isSame = reorderedStops.every((stop, idx) => stop === currentStops[idx]);
      if (isSame) {
        setOptimizationMessage('Order is already optimal.');
      } else {
        setCurrentStops(reorderedStops);
        setOptimizationMessage('Route optimized successfully!');
      }

      setTimeout(() => setOptimizationMessage(''), 3000);
    } catch (err) {
      console.error('Failed to optimize route', err);
      setOptimizationMessage('Error optimizing route.');
      setTimeout(() => setOptimizationMessage(''), 3000);
    }
  };


  return (
    <div className="p-8 h-full bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-emerald-500 pb-2 inline-flex items-center gap-2">
              <Route className="text-emerald-600" /> Routes & Stops
            </h1>
            <p className="text-slate-500 mt-2">Configure default paths and planned delivery stops for your fleet.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium"
          >
            <Plus className="h-5 w-5" /> New Route
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {loading ? (
               <li className="p-8 text-center text-slate-400">Loading routes...</li>
            ) : routes.length === 0 ? (
               <li className="p-8 text-center text-slate-400">No routes configured.</li>
            ) : (
              routes.map(rt => (
                <li key={rt.id} className="p-6 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer" onClick={() => handleViewClick(rt)}>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{rt.name}</h3>
                    <p className="text-slate-500 text-sm">{rt.description || 'No description'}</p>
                {rt.stops && rt.stops.length > 0 && (
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    <span>{rt.stops.map(s => s.name).join(' → ')}</span>
                  </div>
                )}
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                {rt.stops ? rt.stops.length : 0} Stops
              </span>
            </li>
              ))
            )}
          </ul>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => {
          setIsModalOpen(false);
          setCurrentStops([]);
          setEditingRouteId(null);
          setIsViewMode(false);
        }} title={isViewMode ? "Route Details" : editingRouteId ? "Edit Route" : "Define a New Route"}>
          <form onSubmit={handleSubmit} className="px-2 py-2 flex flex-col gap-6 w-[800px] max-w-[90vw]">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="flex flex-col gap-5">
                {isViewMode ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{formData.name}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{formData.description || 'No description provided.'}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Route Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Morning Logistics Route A"
                        className="block w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm outline-none text-slate-900"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                      <textarea
                        placeholder="Enter path details, checkpoints, or schedule notes..."
                        className="block w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm outline-none text-slate-900 min-h-[120px] resize-none"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </>
                )}
                
                {/* Stops List */}
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-1 w-full flex justify-between items-center">
                      <span>Stops ({currentStops.length})</span>
                      {!isViewMode && currentStops.length > 2 ? (
                        <div className="flex items-center gap-2">
                          {optimizationMessage && (
                            <span className="text-[10px] text-emerald-600 italic animate-pulse">{optimizationMessage}</span>
                          )}
                          <button 
                            type="button"
                            onClick={() => optimizeRoute()}
                            className="text-xs bg-emerald-600 text-white font-medium px-3 py-1 rounded hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1 active:scale-95"
                            title="Uses TSP to compute best route order"
                          >
                            Auto-Sort Stops
                          </button>
                        </div>
                      ) : isViewMode && currentStops.length > 2 ? (
                        <span className="text-[10px] text-slate-400 italic">Click Edit Route to Auto-Sort</span>
                      ) : null}
                    </h3>
                  </div>
                  {currentStops.length === 0 ? (
                     <p className="text-sm text-slate-500 italic">No stops added yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                       {currentStops.map((stop, idx) => (
                         <li 
                           key={idx} 
                           draggable={!isViewMode}
                           onDragStart={(e) => { e.dataTransfer.setData('sourceIndex', idx.toString()); e.dataTransfer.effectAllowed = 'move'; }}
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={(e) => {
                              e.preventDefault();
                              const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
                              if (sourceIndex === idx || isNaN(sourceIndex)) return;
                              setCurrentStops(prev => {
                                const newStops = [...prev];
                                const [removed] = newStops.splice(sourceIndex, 1);
                                newStops.splice(idx, 0, removed);
                                return newStops;
                              });
                           }}
                           className={`flex justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm group ${!isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                         >
                            <span 
                              className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer hover:text-emerald-700 w-full"
                              onClick={() => setSelectedStopLocation(stop.location)}
                              title="Click to view on map"
                            >
                               {!isViewMode && <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />}
                               <span className="flex items-center justify-center bg-emerald-100 text-emerald-700 h-5 w-5 rounded-full text-xs shrink-0">{idx + 1}</span>
                               <span className="truncate max-w-[200px]">{stop.name}</span>
                            </span>
                            {!isViewMode && (
                              <button 
                                 type="button" 
                                 onClick={() => removeStop(idx)}
                                 className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                              >
                                 <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                         </li>
                       ))}
                    </ul>
                  )}
                  
                  {!isViewMode && (
                    <div className={`mt-4 p-3 rounded-lg border flex gap-2 ${addingStopMode ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                       <input 
                         className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-500"
                         placeholder="Stop name (optional)"
                         value={newStopName}
                         onChange={(e) => setNewStopName(e.target.value)}
                         disabled={addingStopMode}
                       />
                       <button
                          type="button"
                          className={`text-sm px-3 py-1.5 rounded font-medium transition-colors ${addingStopMode ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          onClick={() => setAddingStopMode(!addingStopMode)}
                       >
                          {addingStopMode ? 'Click Map to Place...' : 'Add'}
                       </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Map Preview */}
              <div className="rounded-xl border border-slate-200 overflow-hidden relative min-h-[400px]">
                 
                 {/* Map Search Bar */}
                 <div className="absolute top-4 right-4 z-[1000] w-64 flex flex-col gap-1">
                    <div className="flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                       <input 
                         type="text"
                         placeholder="Find location to pin..."
                         className="flex-1 px-3 py-2 text-sm outline-none text-slate-700"
                         value={mapSearchQuery}
                         onChange={(e) => setMapSearchQuery(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             handleMapSearch();
                           }
                         }}
                       />
                       <button 
                         type="button" 
                         onClick={(e) => { e.preventDefault(); handleMapSearch(); }}
                         className="px-3 text-slate-500 hover:text-emerald-600 bg-slate-50 border-l border-slate-200 transition-colors flex items-center justify-center" 
                         disabled={isSearchingMap}
                       >
                         {isSearchingMap ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <Search className="h-4 w-4" />}
                       </button>
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {isDropdownOpen && searchResults.length > 0 && (
                      <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                        {searchResults.map((result, i) => (
                           <button
                             key={i}
                             type="button"
                             className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0 hover:text-emerald-700 transition-colors"
                             title={result.display_name}
                             onClick={(e) => {
                               e.preventDefault();
                               setSearchLocation({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
                               setMapSearchQuery(result.display_name.split(',')[0]);
                               setIsDropdownOpen(false);
                               setSearchResults([]);
                             }}
                           >
                             <div className="font-semibold truncate">{result.display_name.split(',')[0]}</div>
                             <div className="truncate text-[10px] text-slate-500">{result.display_name.substring(result.display_name.indexOf(',') + 1).trim()}</div>
                           </button>
                        ))}
                      </div>
                    )}
                 </div>

                 <MapContainer 
                    center={[mapCenter.lat, mapCenter.lng]} 
                    zoom={initialZoom} 
                    style={{ height: '100%', width: '100%' }}
                    attributionControl={false}
                 >
                    <MapController
                      currentStops={currentStops}
                      mapCenter={mapCenter}
                      initialZoom={initialZoom}
                      searchLocation={searchLocation}
                      setSearchLocation={setSearchLocation}
                      addingStopMode={addingStopMode}
                      setAddingStopMode={setAddingStopMode}
                      newStopName={newStopName}
                      setNewStopName={setNewStopName}
                      setCurrentStops={setCurrentStops}
                      isViewMode={isViewMode}
                      selectedStopLocation={selectedStopLocation}
                      setSelectedStopLocation={setSelectedStopLocation}
                      editingRouteId={editingRouteId}
                    />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {currentStops.map((stop, idx) => (
                       <Marker 
                          key={idx} 
                          position={[stop.location.lat, stop.location.lng]}
                          draggable={!isViewMode}
                          icon={createStopIcon(idx)}
                          eventHandlers={{
                            dragend: (e) => { if (!isViewMode) handleMarkerDragEnd(idx, e) }
                          }}
                       >
                          <Popup>
                             <div className="font-bold">{stop.name}</div>
                             <div className="text-xs text-slate-500">Stop #{idx + 1}</div>
                             {!isViewMode && <div className="text-[10px] text-emerald-600 mt-1 italic">Drag to adjust</div>}
                          </Popup>
                       </Marker>
                    ))}
                    {routePath.length > 0 && (
                      <>
                        <Polyline 
                           positions={routePath}
                           color="#047857"
                           weight={7}
                           opacity={0.3}
                        />
                        <Polyline 
                           positions={routePath}
                           color="#10b981"
                           weight={4}
                           opacity={0.9}
                           dashArray="12, 8"
                        />
                      </>
                    )}
                 </MapContainer>
                 {addingStopMode && (
                   <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow border border-emerald-200 z-[1000] flex items-center gap-2">
                     <MapPin className="h-4 w-4 text-emerald-500" />
                     <span className="text-sm font-medium text-slate-700">Click anywhere on the map</span>
                   </div>
                 )}
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center gap-3 mt-4 border-t border-slate-100 pt-4">
              <div>
                {!isViewMode && editingRouteId && (
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors shadow-sm"
                    onClick={handleDeleteRoute}
                  >
                    Delete Route
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {isViewMode ? (
                  <>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setIsModalOpen(false);
                        setCurrentStops([]);
                        setIsViewMode(false);
                        setEditingRouteId(null);
                      }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md active:scale-95 flex items-center gap-2"
                      onClick={(e) => { e.preventDefault(); setIsViewMode(false); }}
                    >
                      Edit Route
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setIsModalOpen(false);
                        setCurrentStops([]);
                        setAddingStopMode(false);
                        setEditingRouteId(null);
                        setIsViewMode(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md active:scale-95"
                    >
                      {editingRouteId ? 'Save Changes' : 'Save Route'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
