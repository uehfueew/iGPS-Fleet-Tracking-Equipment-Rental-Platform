import React, { useEffect, useState, useContext, Fragment } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Calendar, DollarSign, Truck, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface Equipment {
 id: number;
 name: string;
 description: string;
 pricePerDay: number;
 available: boolean;
}

const EquipmentList = () => {
 const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
 const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [addTracking, setAddTracking] = useState(false);
 const [message, setMessage] = useState('');
 const [isError, setIsError] = useState(false);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);

 // Admin Add Modal State
 const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
 const [newEqName, setNewEqName] = useState('');
 const [newEqType, setNewEqType] = useState('Car');
 const [newEqPlate, setNewEqPlate] = useState('');
 const [newEqYear, setNewEqYear] = useState('');
 const [newEqOwner, setNewEqOwner] = useState('');
 const [newEqAvailableFrom, setNewEqAvailableFrom] = useState('');
 const [newEqAvailableUntil, setNewEqAvailableUntil] = useState('');
 const [newEqDesc, setNewEqDesc] = useState('');
 const [newEqCurrency, setNewEqCurrency] = useState('USD');
 const [newEqPrice, setNewEqPrice] = useState('');
 
 const authContext = useContext(AuthContext);
 const token = authContext ? authContext.token : null;
 const isAdmin = authContext?.user?.role === 'admin';

 useEffect(() => {
 fetchEquipment();
 }, [token]);

 const fetchEquipment = async () => {
 try {
 setLoading(true);
 const res = await api.get('/equipment');
 setEquipmentList(res.data);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const handleAddEquipment = async (e: React.FormEvent) => {
   e.preventDefault();
   try {
     let formattedDescription = `[${newEqType}] Plate: ${newEqPlate || 'N/A'}`;
     if (newEqYear) formattedDescription += ` | Year: ${newEqYear}`;
     if (newEqOwner) formattedDescription += ` | Owner: ${newEqOwner}`;
     if (newEqAvailableFrom && newEqAvailableUntil) formattedDescription += ` | Avail: ${newEqAvailableFrom} to ${newEqAvailableUntil}`;
     formattedDescription += ` - ${newEqDesc} (${newEqCurrency})`;
     
     await api.post('/equipment', {
       name: newEqName,
       description: formattedDescription,
       pricePerDay: Number(newEqPrice)
     });
     setMessage('Vehicle/Equipment added successfully!');
     setIsError(false);
     setNewEqName('');
     setNewEqType('Car');
     setNewEqPlate('');
     setNewEqYear('');
     setNewEqOwner('');
     setNewEqAvailableFrom('');
     setNewEqAvailableUntil('');
     setNewEqDesc('');
     setNewEqCurrency('USD');
     setNewEqPrice('');
     setIsAdminModalOpen(false);
     fetchEquipment();
   } catch (err: any) {
     setMessage(err.response?.data?.error || err.message || 'Failed to add equipment');
     setIsError(true);
     // Auto hide error after a bit if desired
   }
 };

 const handleBooking = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedEq) return;

 try {
 await api.post('/rentals', {
 equipmentId: selectedEq.id,
 startDate,
 endDate,
 addTracking
 });
 setMessage('Booking request submitted successfully! Your equipment will be ready soon.');
 setIsError(false);
 setTimeout(() => {
 setIsModalOpen(false);
 setSelectedEq(null);
 setStartDate('');
 setEndDate('');
 setAddTracking(false);
 setMessage('');
 }, 2000);
 fetchEquipment();
 } catch (err: any) {
 setMessage(err.response?.data?.error || err.message || 'Failed to book');
 setIsError(true);
 }
 };

 const calculateDays = () => {
 if (!startDate || !endDate) return 0;
 const s = new Date(startDate);
 const e = new Date(endDate);
 const diff = e.getTime() - s.getTime();
 const days = Math.ceil(diff / (1000 * 3600 * 24));
 return days > 0 ? days : 0;
 };

 const days = calculateDays();

 const handleOpenModal = (eq: Equipment) => {
 setSelectedEq(eq);
 setIsModalOpen(true);
 setMessage('');
 };

 const closeModals = () => {
 setIsModalOpen(false);
 setIsAdminModalOpen(false);
 setSelectedEq(null);
 setMessage('');
 };

 return (
 <div className="p-8 max-w-7xl mx-auto min-h-screen">
 <div className="mb-10 text-center">
 <h2 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-4">
 <div className="p-3 bg-blue-100 rounded-full">
 <Truck className="w-10 h-10 text-blue-600" />
 </div>
 Equipment Fleet Details
 </h2>
 <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">Browse our elite selection of heavy machinery and specialized equipment with transparent pricing and real-time availability tracking.</p>
 {isAdmin && (
   <div className="mt-8">
     <button
       onClick={() => setIsAdminModalOpen(true)}
       className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-colors"
     >
       + Add New Vehicle / Equipment
     </button>
   </div>
 )}
 </div>

 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {equipmentList.map(eq => (
 <motion.div
 key={eq.id}
 whileHover={{ y: -8, scale: 1.02 }}
 className={`relative overflow-hidden group bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 ${!eq.available ? 'opacity-80' : ''}`}
 >
 <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex items-center justify-center">
 <Truck className="w-24 h-24 text-blue-200 group-hover:scale-110 transition-transform duration-500" />
 </div>
 
 <div className="p-6 relative z-10 bg-white rounded-t-3xl -mt-6">
 <div className="flex justify-between items-start mb-4">
 <h3 className="text-xl font-bold text-gray-900">{eq.name}</h3>
 <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
 eq.available 
 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
 : 'bg-red-100 text-red-800 border border-red-200'
 }`}>
 {eq.available ? 'Available' : 'Rented'}
 </span>
 </div>
 
 <p className="text-gray-500 text-sm mb-6 line-clamp-2 min-h-[40px]">{eq.description}</p>
 
 <div className="flex items-center justify-between mb-6">
 <div className="flex flex-col">
 <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Daily Rate</span>
 <span className="text-2xl font-black text-gray-900 flex items-center">
 <DollarSign className="w-5 h-5 text-green-500" />
 {eq.pricePerDay}
 </span>
 </div>
 </div>

 <button
 onClick={() => handleOpenModal(eq)}
 disabled={!eq.available}
 className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 shadow-md hover:shadow-lg ${
 eq.available 
 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transform hover:-translate-y-1' 
 : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
 }`}
 >
 {eq.available ? (
 <>
 Book Now <ArrowRight className="w-5 h-5" />
 </>
 ) : 'Currently Unavailable'}
 </button>
 </div>
 </motion.div>
 ))}
 </div>
 )}

 {/* Confirmation Booking Pop-up (Modal) */}
 <AnimatePresence>
 {isModalOpen && selectedEq && (
 <Fragment>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
 onClick={closeModals}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 30 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
 >
 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden pointer-events-auto">
 <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white">
 <div>
 <h3 className="text-2xl font-bold">Book Equipment</h3>
 <p className="text-blue-100 text-sm mt-1">{selectedEq.name}</p>
 </div>
 <button onClick={closeModals} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-8">
 {message && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}
 >
 {isError ? <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" /> : <Check className="w-6 h-6 shrink-0 mt-0.5" />}
 <span className="font-medium">{message}</span>
 </motion.div>
 )}
 
 <form onSubmit={handleBooking} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700">Start Date</label>
 <div className="relative">
 <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
 <input
 type="date"
 required
 min={new Date().toISOString().split('T')[0]}
 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700">End Date</label>
 <div className="relative">
 <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
 <input
 type="date"
 required
 min={startDate || new Date().toISOString().split('T')[0]}
 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 />
 </div>
 </div>
 </div>

 <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-3">
 <label className="flex items-center gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={addTracking}
 onChange={(e) => setAddTracking(e.target.checked)}
 className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
 />
 <span className="font-semibold text-gray-800">Include GPS Tracking Module</span>
 </label>
 <p className="text-sm text-gray-500 ml-8">Enable real-time location monitoring and security alerts for this equipment during rental.</p>
 </div>

 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex justify-between items-center">
 <div>
 <span className="text-gray-500 font-semibold block mb-1">Total Estimated Cost</span>
 <span className="text-sm text-gray-400">{days} days × ${selectedEq.pricePerDay}</span>
 </div>
 <div className="text-3xl font-black text-green-600">
 ${days * selectedEq.pricePerDay}
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
 <button
 type="button"
 onClick={closeModals}
 className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 :bg-gray-700 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={days === 0}
 className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Confirm Booking
 </button>
 </div>
 </form>
 </div>
 </div>
 </motion.div>
 </Fragment>
 )}
 </AnimatePresence>

 {/* Admin Add Equipment Modal */}
 <AnimatePresence>
 {isAdminModalOpen && (
 <Fragment>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
 onClick={closeModals}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 30 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4"
 >
 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
 <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
 <div>
 <h3 className="text-2xl font-bold">Add New Rental Vehicle</h3>
 <p className="text-blue-100 text-sm mt-1">Make a new car or truck available for rent</p>    
 </div>
 <button onClick={closeModals} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-8 pb-6 overflow-y-auto overflow-x-hidden">
 {message && (
 <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${isError ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
 <span className="font-medium">{message}</span>
 </div>
 )}

 <form onSubmit={handleAddEquipment} className="space-y-5">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Vehicle Name / Model</label> 
     <input type="text" required value={newEqName} onChange={e => setNewEqName(e.target.value)} placeholder="e.g. Ford F-150 Truck" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
   
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Vehicle Type</label> 
     <select required value={newEqType} onChange={e => setNewEqType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white">
       <option value="Car">Standard Car</option>
       <option value="Truck">Moving Truck / Pickup</option>
       <option value="Van">Van</option>
       <option value="Heavy Machinery">Heavy Machinery</option>
       <option value="Other">Other</option>
     </select>
   </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">License Plate / ID</label> 
     <input type="text" value={newEqPlate} onChange={e => setNewEqPlate(e.target.value)} placeholder="e.g. ABC-1234" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
   
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Vehicle Year</label> 
     <input type="number" min="1950" max={new Date().getFullYear() + 1} value={newEqYear} onChange={e => setNewEqYear(e.target.value)} placeholder="e.g. 2022" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
 </div>

 <div className="grid grid-cols-1 gap-5">
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Owner / Lender Name</label> 
     <input type="text" value={newEqOwner} onChange={e => setNewEqOwner(e.target.value)} placeholder="e.g. John Doe Rentals" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Available From</label> 
     <input type="date" value={newEqAvailableFrom} onChange={e => setNewEqAvailableFrom(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Available Until</label> 
     <input type="date" min={newEqAvailableFrom} value={newEqAvailableUntil} onChange={e => setNewEqAvailableUntil(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
   </div>
 </div>

 <div className="grid grid-cols-1 gap-5">
   <div>
     <label className="text-sm font-semibold text-gray-700 block mb-2">Daily Rental Rate</label>
     <div className="flex gap-2">
       <select value={newEqCurrency} onChange={e => setNewEqCurrency(e.target.value)} className="w-1/3 px-3 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white">
         <option value="USD">USD ($)</option>
         <option value="EUR">EUR (€)</option>
         <option value="GBP">GBP (£)</option>
         <option value="CAD">CAD ($)</option>
       </select>
       <input type="number" required min="1" value={newEqPrice} onChange={e => setNewEqPrice(e.target.value)} placeholder="50" className="w-2/3 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
     </div>
   </div>
 </div>

 <div>
 <label className="text-sm font-semibold text-gray-700 block mb-2">Additional Description</label>
 <textarea required value={newEqDesc} onChange={e => setNewEqDesc(e.target.value)} placeholder="Mileage, conditions, capacity..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" rows={3}></textarea>       
 </div>

 <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">    
 <button type="button" onClick={closeModals} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
 <button type="submit" className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md transform hover:-translate-y-0.5 transition-transform flex items-center gap-2">
   <Check className="w-5 h-5"/> Add to Fleet
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

export default EquipmentList;