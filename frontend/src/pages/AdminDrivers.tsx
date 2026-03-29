import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { 
  Plus, Trash2, Edit2, Car, Search, Phone, Fingerprint, 
  MapPin, Clock, FileText, CheckCircle2, Wrench, AlertTriangle, UserRound, ArrowRightLeft, ChevronDown, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
}

interface DriverLog {
  id: number;
  driverId: number;
  vehicleId: number;
  action: string;
  notes: string | null;
  timestamp: string;
  vehicle?: Vehicle;
}

interface Driver {
  id: number;
  name: string;
  licenseNumber: string;
  contact: string;
  driverLogs: DriverLog[];
}

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  // Modals state
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Forms state
  const [driverForm, setDriverForm] = useState({ id: 0, name: '', licenseNumber: '', contact: '' });
  const [logForm, setLogForm] = useState({ vehicleId: '', action: 'CHECK_OUT', notes: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, vehiclesRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/vehicles')
      ]);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
      
      // Auto-select first driver if none selected
      if (!selectedDriverId && driversRes.data.length > 0) {
        setSelectedDriverId(driversRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedDriver = useMemo(() => 
    drivers.find(d => d.id === selectedDriverId) || null
  , [drivers, selectedDriverId]);

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    const term = searchTerm.toLowerCase();
    return drivers.filter(d => 
      d.name.toLowerCase().includes(term) || 
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(term)) ||
      (d.contact && d.contact.toLowerCase().includes(term))
    );
  }, [drivers, searchTerm]);

  // Derived status
  const currentStatus = useMemo(() => {
    if (!selectedDriver || !selectedDriver.driverLogs || selectedDriver.driverLogs.length === 0) return 'OFF_DUTY';
    const lastLog = selectedDriver.driverLogs[0]; // Already ordered DESC by backend
    if (lastLog.action === 'CHECK_OUT') return 'ON_DUTY';
    return 'OFF_DUTY';
  }, [selectedDriver]);

  // Driver CRUD Handlers
  const handleOpenCreateDriver = () => {
    setDriverForm({ id: 0, name: '', licenseNumber: '', contact: '' });
    setIsDriverModalOpen(true);
  };

  const handleOpenEditDriver = (driver: Driver) => {
    setDriverForm({ id: driver.id, name: driver.name, licenseNumber: driver.licenseNumber || '', contact: driver.contact || '' });
    setIsDriverModalOpen(true);
  };

  const submitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (driverForm.id) {
        const res = await api.put(`/drivers/${driverForm.id}`, driverForm);
        setDrivers(prev => prev.map(d => d.id === res.data.id ? { ...d, ...res.data } : d));
      } else {
        const res = await api.post('/drivers', driverForm);
        setDrivers(prev => [res.data, ...prev]);
        setSelectedDriverId(res.data.id);
      }
      setIsDriverModalOpen(false);
    } catch (err) {
      console.error('Error saving driver', err);
    }
  };

  const confirmDeleteDriver = async () => {
    if (!selectedDriverId) return;
    try {
      await api.delete(`/drivers/${selectedDriverId}`);
      setDrivers(prev => prev.filter(d => d.id !== selectedDriverId));
      setSelectedDriverId(null);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting driver', err);
    }
  };

  // Log Handlers
  const handleOpenLogModal = (actionType: string) => {
    const defaultVehicleId = vehicles.length > 0 ? vehicles[0].id.toString() : '';
    setLogForm({ vehicleId: defaultVehicleId, action: actionType, notes: '' });
    setIsLogModalOpen(true);
  };

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || !logForm.vehicleId) return;
    try {
      const res = await api.post(`/drivers/${selectedDriverId}/logs`, logForm);
      setDrivers(prev => prev.map(driver => {
        if (driver.id === selectedDriverId) {
          return {
            ...driver,
            driverLogs: [res.data, ...(driver.driverLogs || [])]
          };
        }
        return driver;
      }));
      setIsLogModalOpen(false);
    } catch (err) {
      console.error('Error creating log', err);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CHECK_OUT': return <Car className="w-5 h-5 text-emerald-500" />;
      case 'CHECK_IN': return <MapPin className="w-5 h-5 text-indigo-500" />;
      case 'MAINTENANCE': return <Wrench className="w-5 h-5 text-amber-500" />;
      case 'INCIDENT': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400 dark:text-slate-400" />;
    }
  };
  
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CHECK_OUT': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'CHECK_IN': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'MAINTENANCE': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'INCIDENT': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border-gray-200 dark:border-slate-800 dark:border-slate-800 text-gray-700 dark:text-slate-300 dark:text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 dark:bg-slate-950">
      <div className="flex-none p-6 md:px-8 border-b border-gray-200 dark:border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm z-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-300 dark:text-slate-300 flex items-center gap-2">
             <UserRound className="text-indigo-600 w-6 h-6" /> Personnel & Assets
           </h1>
           <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 mt-1">Manage driver logs, assignments, and historical activity.</p>
        </div>
        <button
          onClick={handleOpenCreateDriver}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-200 font-semibold"
        >
          <Plus className="w-5 h-5" /> Add Driver
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Driver List */}
        <div className={`w-full md:w-[360px] md:max-w-[360px] flex-none bg-white dark:bg-slate-900 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 dark:border-slate-800 flex-col z-0 ${selectedDriverId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 dark:text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search personnel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {loading ? (
               <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
               </div>
            ) : filteredDrivers.length === 0 ? (
               <div className="text-center p-8">
                  <UserRound className="w-12 h-12 text-gray-300 dark:text-slate-600 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-slate-400 dark:text-slate-400 font-medium">No drivers found.</p>
               </div>
            ) : (
              filteredDrivers.map(driver => {
                const isSelected = selectedDriverId === driver.id;
                // Quick status compute for list
                const drvIsOnDuty = driver.driverLogs && driver.driverLogs.length > 0 && driver.driverLogs[0].action === 'CHECK_OUT';

                return (
                 <button
                   key={driver.id}
                   onClick={() => setSelectedDriverId(driver.id)}
                   className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${
                     isSelected 
                       ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                       : 'bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/80 dark:hover:bg-slate-800 hover:border-gray-200 dark:border-slate-800 dark:border-slate-800'
                   }`}
                 >
                   <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border relative
                      ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-600 dark:text-slate-400 dark:text-slate-400 border-gray-200 dark:border-slate-800 dark:border-slate-800'}
                   `}>
                     {driver.name.charAt(0).toUpperCase()}
                     {drvIsOnDuty && (
                       <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                     )}
                   </div>
                   <div className="flex-1 min-w-0 pr-2">
                     <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900 dark:text-slate-300 dark:text-slate-300'}`}>{driver.name}</h4>
                     <div className={`text-xs mt-0.5 truncate ${isSelected ? 'text-indigo-600' : 'text-gray-500 dark:text-slate-400 dark:text-slate-400'}`}>
                         {driver.licenseNumber || 'No License ID'}
                     </div>
                   </div>
                 </button>
               )})
            )}
          </div>
        </div>

        {/* Right Side: Driver Details & Timeline */}
        <div className={`flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar relative ${selectedDriverId ? 'flex' : 'hidden md:flex'}`}>
          {!selectedDriver ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full">
              <UserRound className="w-20 h-20 text-gray-200 dark:text-slate-700 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 dark:text-slate-200">No Driver Selected</h2>
              <p className="text-gray-500 dark:text-slate-400 dark:text-slate-400 mt-2">Select a personnel member from the list to view their activity history.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedDriver.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto w-full p-6 md:p-8 space-y-6"
              >
                
                {/* Mobile Back Button */}
                <div className="md:hidden flex">
                  <button 
                    onClick={() => setSelectedDriverId(null)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Personnel Directory
                  </button>
                </div>

                {/* Profile Header Card */}
                <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-slate-800 dark:border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
                   
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                         <span className="text-3xl font-bold text-indigo-600">{selectedDriver.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                         <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-300 dark:text-slate-300 mb-1">{selectedDriver.name}</h2>
                         <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                             <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400 dark:text-slate-400">
                                 <Fingerprint className="w-4 h-4 text-gray-400 dark:text-slate-500 dark:text-slate-500" /> 
                                 <span className="font-medium text-gray-800 dark:text-slate-200 dark:text-slate-200">{selectedDriver.licenseNumber || 'Unlicensed'}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400 dark:text-slate-400">
                                 <Phone className="w-4 h-4 text-gray-400 dark:text-slate-500 dark:text-slate-500" /> 
                                 {selectedDriver.contact || 'No Contact'}
                             </div>
                         </div>
                         <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold 
                            bg-white dark:bg-slate-900 dark:bg-slate-900 border-gray-200 dark:border-slate-800 dark:border-slate-800">
                            Status: 
                            {currentStatus === 'ON_DUTY' ? (
                               <span className="text-emerald-600 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Active / On Duty</span>
                            ) : (
                               <span className="text-gray-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div> Off Duty / Standby</span>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className="flex flex-wrap gap-2 md:justify-end">
                      <button onClick={() => handleOpenEditDriver(selectedDriver)} className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 text-gray-700 dark:text-slate-300 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 dark:hover:bg-slate-800 transition shadow-sm font-medium text-sm">
                         <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                      <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition shadow-sm font-medium text-sm">
                         <Trash2 className="w-4 h-4" /> Offboard
                      </button>
                   </div>
                </div>

                {/* Log Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   <button onClick={() => handleOpenLogModal('CHECK_OUT')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:bg-indigo-900/20 transition group">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                         <Car className="w-5 h-5"/>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 dark:text-slate-200">Assign Vehicle</span>
                   </button>
                   <button onClick={() => handleOpenLogModal('CHECK_IN')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:bg-indigo-900/20 transition group">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                         <MapPin className="w-5 h-5"/>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 dark:text-slate-200">Return Vehicle</span>
                   </button>
                   <button onClick={() => handleOpenLogModal('MAINTENANCE')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:bg-indigo-900/20 transition group">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                         <Wrench className="w-5 h-5"/>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 dark:text-slate-200">Log Maintenance</span>
                   </button>
                   <button onClick={() => handleOpenLogModal('INCIDENT')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:bg-indigo-900/20 transition group">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                         <AlertTriangle className="w-5 h-5"/>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 dark:text-slate-200">Report Incident</span>
                   </button>
                </div>

                {/* Timeline */}
                <div>
                   <h3 className="text-lg font-bold text-gray-900 dark:text-slate-300 dark:text-slate-300 mb-6 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-gray-400 dark:text-slate-500 dark:text-slate-500" /> Activity History
                   </h3>
                   
                   {!selectedDriver.driverLogs || selectedDriver.driverLogs.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 border-dashed rounded-3xl p-10 text-center">
                         <FileText className="w-10 h-10 text-gray-300 dark:text-slate-600 dark:text-slate-600 mx-auto mb-3" />
                         <p className="text-gray-500 dark:text-slate-400 dark:text-slate-400 font-medium">No activity logged yet.</p>
                      </div>
                   ) : (
                      <div className="relative pl-6 pb-12">
                         <div className="absolute left-[31px] top-6 bottom-0 w-px bg-gray-200 z-0"></div>
                         
                         <div className="space-y-6 relative z-10">
                           {selectedDriver.driverLogs.map((log, index) => (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={log.id} 
                                className="flex gap-4 group/log"
                              >
                                 <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full border-4 border-[#f8fafc] z-10 shadow-sm
                                    ${getActionColor(log.action)}`}
                                 >
                                    {getActionIcon(log.action)}
                                 </div>
                                 
                                 <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex-1 group-hover/log:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                       <div className="flex items-center gap-2">
                                          <span className="font-bold text-gray-800 dark:text-slate-200 dark:text-slate-200 text-base">
                                             {log.action.replace('_', ' ')}
                                          </span>
                                       </div>
                                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                                          {format(new Date(log.timestamp), "MMM d, yyyy • h:mm a")}
                                       </span>
                                    </div>
                                    
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 rounded-lg text-sm border border-gray-100 dark:border-slate-800 dark:border-slate-800 mb-3 text-gray-700 dark:text-slate-300 dark:text-slate-300 font-medium">
                                       <Car className="w-4 h-4 text-gray-400 dark:text-slate-500 dark:text-slate-500" />
                                       {log.vehicle ? `${log.vehicle.name} (${log.vehicle.licensePlate})` : `Asset ID: #${log.vehicleId}`}
                                    </div>

                                    {log.notes && (
                                       <p className="text-gray-600 dark:text-slate-400 dark:text-slate-400 text-sm leading-relaxed border-t border-gray-100 dark:border-slate-800 dark:border-slate-800 pt-3 mt-1">
                                          "{log.notes}"
                                       </p>
                                    )}
                                 </div>
                              </motion.div>
                           ))}
                         </div>
                      </div>
                   )}
                </div>

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Driver Edit/Create Modal */}
      <Modal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} title={driverForm.id ? "Edit Driver Profile" : "Register Personnel"}>
         <form onSubmit={submitDriver} className="flex flex-col gap-5">
           <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Full Legal Name</label>
             <input
               type="text" required placeholder="e.g. Emma Johnson"
               className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
               value={driverForm.name}
               onChange={e => setDriverForm({ ...driverForm, name: e.target.value })}
             />
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">License ID</label>
                <input
                  type="text" required placeholder="e.g. CDL-549219"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  value={driverForm.licenseNumber}
                  onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="text" required placeholder="e.g. (555) 123-4567"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  value={driverForm.contact}
                  onChange={e => setDriverForm({ ...driverForm, contact: e.target.value })}
                />
              </div>
           </div>
           <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800 dark:border-slate-800">
             <button type="button" onClick={() => setIsDriverModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700 transition">
               Cancel
             </button>
             <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5"/> {driverForm.id ? "Update Details" : "Publish Record"}
             </button>
           </div>
         </form>
      </Modal>

      {/* Action Log Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={`Log Entry: ${logForm.action.replace('_', ' ')}`}>
         <form onSubmit={submitLog} className="flex flex-col gap-5">
           
           <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
              <UserRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                 <p className="text-sm font-bold text-blue-900">{selectedDriver?.name}</p>
                 <p className="text-xs text-blue-700">You are attributing this log entry to this personnel member.</p>
              </div>
           </div>

           <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Asset / Vehicle</label>
             {vehicles.length === 0 ? (
               <div className="p-3 text-red-500 bg-red-50 border border-red-200 rounded-xl text-sm font-medium">No vehicles registered in the system.</div>
             ) : (
               <div className="relative">
                 <select
                   required
                   className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                   value={logForm.vehicleId}
                   onChange={e => setLogForm({ ...logForm, vehicleId: e.target.value })}
                 >
                   {vehicles.map(v => (
                     <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                   ))}
                 </select>
                 <Car className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 dark:text-slate-500 pointer-events-none" />
                 <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 dark:text-slate-400 pointer-events-none" />
               </div>
             )}
           </div>

           <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Action Type</label>
             <div className="relative">
               <ArrowRightLeft className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 dark:text-slate-500 pointer-events-none z-10" />
               <select
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none font-semibold text-gray-800 dark:text-slate-200 dark:text-slate-200"
                 value={logForm.action}
                 onChange={e => setLogForm({ ...logForm, action: e.target.value })}
               >
                  <option value="CHECK_OUT">Assignment (Check Out)</option>
                  <option value="CHECK_IN">Return (Check In)</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INCIDENT">Incident / Accident</option>
                  <option value="NOTE">General Note</option>
               </select>
               <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 dark:text-slate-400 pointer-events-none" />
             </div>
           </div>

           <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Operational Remarks (Optional)</label>
             <textarea
               placeholder="Describe condition of vehicle, incident details, or general notes..."
               className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none h-24"
               value={logForm.notes}
               onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
             />
           </div>

           <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800 dark:border-slate-800">
             <button type="button" onClick={() => setIsLogModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700 transition">
               Cancel
             </button>
             <button type="submit" disabled={vehicles.length===0} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-md">
               Commit Record
             </button>
           </div>
         </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Offboard Personnel">
         <div className="flex flex-col gap-4">
             <div className="bg-red-50 p-5 rounded-2xl border border-red-100 text-red-800 flex gap-4">
                <AlertTriangle className="w-8 h-8 shrink-0 text-red-600" />
                <div>
                   <h4 className="font-bold text-lg mb-1">Confirm Deletion</h4>
                   <p className="text-sm leading-relaxed">Are you absolutely sure you want to remove <b>{selectedDriver?.name}</b>? This will permanently delete their profile and sever all historical tracking logs associated with them.</p>
                </div>
             </div>
             <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700 transition">Abort</button>
                <button onClick={confirmDeleteDriver} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-md shadow-red-200 flex items-center gap-2">
                   <Trash2 className="w-4 h-4"/> Terminate Profile
                </button>
             </div>
         </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
