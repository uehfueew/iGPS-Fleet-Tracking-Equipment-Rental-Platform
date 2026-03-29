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

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGf, setEditGf] = useState<any>(null);
  const [editGfName, setEditGfName] = useState('');
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [pendingShapeUpdate, setPendingShapeUpdate] = useState<{id: number, polygon: any[]} | null>(null);
  const pendingShapeUpdateRef = useRef<{id: number, polygon: any[]} | null>(null);

  useEffect(() => {
    pendingShapeUpdateRef.current = pendingShapeUpdate;
  }, [pendingShapeUpdate]);

  useEffect(() => {
    fetchGeofences();
    
    const handleRefresh = () => fetchGeofences();
    window.addEventListener('refreshGeofences', handleRefresh);
    return () => window.removeEventListener('refreshGeofences', handleRefresh);
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
                    const poly = L.polygon(latlngs, { color: '#8b5cf6', fillColor: '#a78bfa', fillOpacity: 0.3, weight: 2 })
                    .bindPopup(`<div class="font-bold text-slate-800 text-sm p-1">${gf.name}</div>`)
                    .addTo(leafletMap.current!);
                    (poly as any).gfId = gf.id;
                }
            });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeofenceClick = (gf: any) => {
      if (!leafletMap.current || !gf.polygon || gf.polygon.length === 0) return;
      const latlngs = gf.polygon.map((p: any) => [p.lat || p[0], p.lng || p[1]]);
      const bounds = L.polygon(latlngs).getBounds();
      leafletMap.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editGf || !editGfName.trim()) return;

      try {
        await fetch(`/api/geofences/${editGf.id}`, {
            method: 'PATCH',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: editGfName })
        });
        fetchGeofences();
      } catch (e) {
          console.error(e);
      } finally {
        setShowEditModal(false);
        setEditGf(null);
      }
  };

  const handleDeleteGeofence = async (id: number) => {
      if (!confirm('Are you sure you want to delete this geofence?')) return;
      try {
          await fetch(`/api/geofences/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchGeofences();
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([40.7128, -74.0060], 11);
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
      editMode: true,
      dragMode: true,
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

    leafletMap.current.on('pm:update', async (e: any) => {
      const layer = e.layer as L.Polygon;
      const gfId = (layer as any).gfId;
      if (!gfId) return;
      
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const polygonArr = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
      setPendingShapeUpdate({ id: gfId, polygon: polygonArr });

      // Immediate save on update for reliability
      const currentToken = localStorage.getItem('token');
      try {
         await fetch(`/api/geofences/${gfId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ polygon: polygonArr })
         });
         window.dispatchEvent(new Event('refreshGeofences'));
      } catch(err) { console.error(err) }
    });

    leafletMap.current.on('pm:globaleditmodetoggled', async (e: any) => {
      setIsEditingMap(e.enabled);
      // e.enabled is true if edit mode started, false if it finished
      if (!e.enabled && pendingShapeUpdateRef.current) {
        const update = pendingShapeUpdateRef.current;
        const currentToken = localStorage.getItem('token');
        try {
           await fetch(`/api/geofences/${update.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
              },
              body: JSON.stringify({ polygon: update.polygon })
           });
           setPendingShapeUpdate(null);
           window.dispatchEvent(new Event('refreshGeofences'));
        } catch(err) { console.error(err) }
      }
    });

    leafletMap.current.on('pm:globaldrawmodetoggled', async (e: any) => {
      setIsEditingMap(e.enabled);
    });

    leafletMap.current.on('pm:globaldragmodetoggled', async (e: any) => {
      setIsEditingMap(e.enabled);
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
                   <li key={gf.id} 
                       onClick={() => handleGeofenceClick(gf)}
                       className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-700 flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer">
                     <span className="truncate pr-2">{gf.name}</span>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditGf(gf); setEditGfName(gf.name); setShowEditModal(true); }}
                            className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            Edit
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteGeofence(gf.id); }}
                            className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            Delete
                        </button>
                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm group-hover:scale-125 transition-transform flex-shrink-0"></div>
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-0 w-full h-full">
        <style>{`
          .leaflet-pm-toolbar.leaflet-bar {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .leaflet-pm-toolbar .button-container {
            border: 2px solid #8b5cf6 !important;
            border-radius: 8px !important;
            margin-bottom: 6px !important;
            overflow: hidden !important;
            background-color: white !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;
            display: flex !important;
          }
          .leaflet-pm-toolbar .button-container > .leaflet-buttons-control-button {
            border: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            /* Allow Geoman's default icons to render normally by not overriding layout */
          }
          .leaflet-pm-toolbar .leaflet-buttons-control-button:hover {
            background-color: #f3e8ff !important;
          }
          .leaflet-pm-actions-container {
            display: none !important;
          }
        `}</style>
        <div ref={mapRef} className="h-full w-full bg-slate-100" />
        
        <AnimatePresence>
          {isEditingMap && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000]"
            >
              <button
                onClick={() => {
                  leafletMap.current?.pm.disableDraw();
                  leafletMap.current?.pm.disableGlobalEditMode();
                  leafletMap.current?.pm.disableGlobalDragMode();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-bold shadow-xl border-4 border-white/20 transition-all flex items-center gap-2 hover:scale-105"
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                Save Changes / Finish
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Geofence Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
            <Fragment>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm"
                  onClick={() => setShowEditModal(false)}
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
                                <List className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Edit Geofence</h3>
                            
                            <form onSubmit={handleEditSubmit}>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-inner mb-8 mt-4"
                                    value={editGfName}
                                    onChange={(e) => setEditGfName(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                                    >
                                        Update Name
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
