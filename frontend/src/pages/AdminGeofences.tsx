import React, { useEffect, useRef, useState, useContext, Fragment } from 'react';
import { AuthContext } from '../context/AuthContext';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { ShieldAlert, Map as MapIcon, Plus, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminGeofences = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const authContext = useContext(AuthContext);
  const token = authContext ? authContext.token : null;
  const user = authContext ? authContext.user : null;
  const [geofences, setGeofences] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [gfName, setGfName] = useState('');
  const [pendingLayer, setPendingLayer] = useState<L.Polygon | null>(null);
  const [pendingPolyArr, setPendingPolyArr] = useState<any[] | null>(null);

  useEffect(() => {
    fetchGeofences();
  }, [token]);

  const fetchGeofences = async () => {
    try {
      const res = await fetch('/api/geofences', { headers: { 'Authorization': `Bearer ${token}` }});
      const data = await res.json();
      setGeofences(data);
      
      // Draw existing geofences
      if (leafletMap.current) {
        leafletMap.current.eachLayer(layer => {
          if (layer instanceof L.Polygon && !layer.hasOwnProperty('_pmTempLayer')) {
            leafletMap.current?.removeLayer(layer);
          }
        });

        if (Array.isArray(data)) {
            data.forEach((gf: any) => {
                if (gf.polygon) {
                    const latlngs = gf.polygon.map((p: any) => [p.lat || p[0], p.lng || p[1]]);
                    L.polygon(latlngs, { color: '#8b5cf6', fillColor: '#a78bfa', fillOpacity: 0.3, weight: 2 })
                    .bindPopup(`<div class="font-bold text-slate-800 text-sm p-1">${gf.name}</div>`)
                    .addTo(leafletMap.current!);
                }
            });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([40.7128, -74.0060], 11);
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(leafletMap.current);

    leafletMap.current.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    leafletMap.current.on('pm:create', (e: any) => {
      const layer = e.layer as L.Polygon;
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const polygonArr = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
      
      setPendingLayer(layer);
      setPendingPolyArr(polygonArr);
      setGfName('');
      setShowModal(true);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const handleCreateGeofence = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!gfName.trim() || !pendingPolyArr) return;

      try {
        await fetch('/api/geofences', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: gfName, polygon: pendingPolyArr })
        });
        fetchGeofences();
      } catch (e) {
          console.error(e);
      } finally {
        setShowModal(false);
        setPendingLayer(null);
        setPendingPolyArr(null);
      }
  };

  const handleCancelGeofence = () => {
      if (pendingLayer && leafletMap.current) {
          leafletMap.current.removeLayer(pendingLayer);
      }
      setShowModal(false);
      setPendingLayer(null);
      setPendingPolyArr(null);
  };

  if (user?.role !== 'admin') {
     return (
      <div className="flex h-full items-center justify-center bg-slate-50">
         <div className="text-center bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-md">
            <ShieldAlert className="h-20 w-20 text-rose-500 mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Access Denied</h2>
            <p className="text-slate-500 text-lg">You do not have the required administrator privileges to view this page.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 relative overflow-hidden">
      <div className="w-80 sm:w-96 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-[1000] relative">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-purple-100 p-3 rounded-xl text-purple-600 shadow-inner">
              <MapIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Geofences</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-14">Draw and manage alert regions</p>
        </div>
        
        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          <div className="bg-purple-50/50 border border-purple-100 text-purple-800 rounded-2xl p-5 text-sm shadow-sm flex items-start gap-4">
             <Plus className="h-6 w-6 shrink-0 mt-0.5 text-purple-500" />
             <p className="font-semibold leading-relaxed">Use the polygon tool on the map's top-left control panel to draw new geofences.</p>
          </div>

          <div>
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                 <List className="h-4 w-4" /> Existing Areas ({geofences.length})
             </h3>
             {geofences.length === 0 ? (
               <div className="text-center py-8">
                 <p className="text-slate-400 text-sm font-medium">No geofences defined yet.</p>
               </div>
             ) : (
               <ul className="space-y-3">
                 {geofences.map(gf => (
                   <li key={gf.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-700 flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group cursor-default">
                     {gf.name}
                     <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm group-hover:scale-125 transition-transform"></div>
                   </li>
                 ))}
               </ul>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-0 w-full h-full">
        <div ref={mapRef} className="h-full w-full bg-slate-100" />
      </div>

      {/* Geofence Name Modal */}
      <AnimatePresence>
        {showModal && (
            <Fragment>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm"
                  onClick={handleCancelGeofence}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed inset-0 z-[2010] flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto border border-slate-100">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                                <MapIcon className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Save Geofence</h3>
                            <p className="text-slate-500 mb-6 font-medium">Give this geographic boundary a distinct name so you can track when vehicles enter or exit.</p>
                            
                            <form onSubmit={handleCreateGeofence}>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g., Downtown Warehouse"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-inner mb-8"
                                    value={gfName}
                                    onChange={(e) => setGfName(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCancelGeofence}
                                        className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                                    >
                                        Save Area
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </Fragment>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGeofences;
