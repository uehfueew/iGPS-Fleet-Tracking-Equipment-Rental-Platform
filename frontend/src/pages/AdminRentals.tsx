import { useEffect, useState, useContext, Fragment } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Check, X, Calendar, Settings, Car } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

interface Rental {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  equipmentId: number;
  equipment: { name: string; description?: string };
  client?: { username: string };
}

interface Equipment {
  id: number;
  name: string;
  description: string;
  pricePerDay: number;
  available: boolean;
}

const AdminRentals = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isMessageError, setIsMessageError] = useState(false);
  const { token, user } = useContext(AuthContext);

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

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const resRentals = await fetch('/api/rentals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataRentals = await resRentals.json();
      if (!resRentals.ok) throw new Error(dataRentals.error);
      setRentals(dataRentals);

      const resEq = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataEq = await resEq.json();
      if (!resEq.ok) throw new Error(dataEq.error || 'Failed to fetch equipment');
      setEquipmentList(dataEq);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/rentals/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchData(); // refresh list
    } catch (err: any) {
      setError(err.message);
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
      setIsMessageError(false);
      
      // Reset state
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
      fetchData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || err.message || 'Failed to add equipment');
      setIsMessageError(true);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
         <div className="text-center bg-white p-12 rounded-2xl border border-slate-200 shadow-sm max-w-md">
            <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500">You do not have the required administrator privileges to view this page.</p>
         </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
      case 'declined':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Declined</span>;
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Active</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  const getOwnershipBadge = (description?: string) => {
    if (!description) return null;
    const isExternal = description.includes('Owner: ');
    if (isExternal) {
      const match = description.match(/Owner:\s*([^\n]+)/);
      const ownerName = match ? match[1].split('|')[0].trim() : 'External';
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 ml-2" title={`Owner: ${ownerName}`}>External ({ownerName})</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 ml-2">Internal</span>;
  };

  const getEquipmentStatus = (eqId: number) => {
    const now = new Date();
    const activeRental = rentals.find(r => 
      r.equipmentId === eqId && 
      (r.status === 'approved' || r.status === 'active') && 
      isWithinInterval(now, { start: parseISO(r.startDate), end: parseISO(r.endDate) })
    );
    
    if (!activeRental) {
      const futureRental = rentals.find(r => 
        r.equipmentId === eqId &&
        (r.status === 'approved' || r.status === 'active') && 
        parseISO(r.startDate) > now
      );
      if (futureRental) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Available (Booked from {format(parseISO(futureRental.startDate), 'MMM dd')})
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Available
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        Rented until {format(parseISO(activeRental.endDate), 'MMM dd, yyyy')}
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 ${
              isMessageError 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isMessageError ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            <span className="font-medium">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-8 py-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
             <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Bookings & Fleet</h2>
            <p className="text-sm text-slate-500 font-medium">Manage client requests and track your fleet's active status.</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-colors text-sm"
        >
          + Add New Vehicle / Equipment
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          {/* Fleet Status Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Car className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800">Fleet Availability Status</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentList.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-900 font-bold">
                        {eq.name}
                        {getOwnershipBadge(eq.description)}
                      </td>
                      <td className="px-6 py-4">
                        {getEquipmentStatus(eq.id)}
                      </td>
                    </tr>
                  ))}
                  {equipmentList.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No vehicles found in fleet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rental Requests Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800">Rental Requests History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentals.map(rental => (
                    <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">#{rental.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-bold">
                        {rental.equipment?.name || 'Unknown'}
                        {rental.equipment && getOwnershipBadge(rental.equipment.description)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{rental.client?.username || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                           <Calendar className="h-4 w-4 text-slate-400" />
                           {format(new Date(rental.startDate), 'MMM dd')} - {format(new Date(rental.endDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(rental.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rental.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdateStatus(rental.id, 'approved')}
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(rental.id, 'declined')}
                              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors border border-rose-200 shadow-sm"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rentals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No rental requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      
      {/* Admin Add Equipment Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-gray-900/70 backdrop-blur-sm"
              onClick={() => setIsAdminModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 flex justify-between items-center text-white shrink-0">
                  <div>
                    <h3 className="text-2xl font-bold">Add External Vehicle</h3>
                    <p className="text-blue-100 text-sm mt-1">Register a sub-contractor or external car for rent</p>
                  </div>
                  <button onClick={() => setIsAdminModalOpen(false)} className="text-blue-100 hover:text-white bg-blue-800/50 p-2 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto">
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
                        <input type="text" value={newEqPlate} onChange={e => setNewEqPlate(e.target.value)} placeholder="ABC-1234" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Manufacturing Year</label>
                        <input type="number" min="1990" max="2027" value={newEqYear} onChange={e => setNewEqYear(e.target.value)} placeholder="2022" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Owner Full Name / Company</label>
                      <input type="text" required value={newEqOwner} onChange={e => setNewEqOwner(e.target.value)} placeholder="John Doe Logistics" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Available From</label>
                        <input type="date" required value={newEqAvailableFrom} onChange={e => setNewEqAvailableFrom(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Available Until</label>
                        <input type="date" required value={newEqAvailableUntil} onChange={e => setNewEqAvailableUntil(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Currency</label>
                        <select required value={newEqCurrency} onChange={e => setNewEqCurrency(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD (£)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Daily Rate</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                          <input type="number" required min="1" step="0.01" value={newEqPrice} onChange={e => setNewEqPrice(e.target.value)} placeholder="0.00" className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 font-bold text-lg" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Additional Specifications</label>
                      <textarea rows={3} value={newEqDesc} onChange={e => setNewEqDesc(e.target.value)} placeholder="Color, specialized tools included, damage notes..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>

                    <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                      Add to Fleet
                    </button>
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

export default AdminRentals;